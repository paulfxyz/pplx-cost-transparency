// Exercise the real macOS tools against private temporary fixtures only.
// The copied helper has its two protected paths redirected and sudo/chown
// disabled. The production helper has no such override flags or environment API.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");

if (process.platform !== "darwin") {
  console.log("SKIP macOS helper integration: run on macOS or the macos-helper CI job.");
  process.exit(0);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pct-comet-integration-"));
const toolDir = path.join(root, "comet");
const policyDir = path.join(root, "managed");
const stateDir = path.join(root, "recovery");
const policy = path.join(policyDir, "ai.perplexity.comet.plist");
const helper = path.join(toolDir, "setup.sh");
const A = "a".repeat(32);
const B = "b".repeat(32);
const C = "c".repeat(32);
const rule = {
  runtime_allowed_hosts: ["https://perplexity.ai", "https://www.perplexity.ai"],
  runtime_blocked_hosts: [],
};
const quote = (text) => "'" + text.replace(/'/g, "'\\''") + "'";
fs.mkdirSync(toolDir);
fs.mkdirSync(policyDir);

function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, `Expected one test redirection: ${before}`);
  return text.replace(before, after);
}

let script = fs.readFileSync(path.join(__dirname, "../comet/setup.sh"), "utf8");
script = replaceOnce(script, "POLICY_DIR='/Library/Managed Preferences'", `POLICY_DIR=${quote(policyDir)}`);
script = replaceOnce(script, "STATE_BASE='/Library/Application Support/Perplexity Cost Transparency/Comet helper'", `STATE_BASE=${quote(stateDir)}`);
script = replaceOnce(script, '&& [ "$EUID" -ne 0 ]; then', "&& false; then");
script = replaceOnce(script, 'exec /usr/bin/sudo /usr/bin/env "PCT_NODE_BINARY=$NODE_BIN" /bin/bash "$SCRIPT" "$@"', "fail 'Tests must never request administrator access.'");
script = script.replaceAll("/usr/bin/install -d -o root -g wheel", "/usr/bin/install -d");
script = script.replaceAll("/usr/sbin/chown ", ": ");
assert.ok(!script.includes("/Library/Managed Preferences"));
assert.ok(!script.includes("/Library/Application Support"));
assert.ok(!script.includes("/usr/bin/sudo "));
fs.writeFileSync(helper, script);
fs.copyFileSync(path.join(__dirname, "../comet/policy.js"), path.join(toolDir, "policy.js"));

function cli(args, input = "", expectedStatus = 0) {
  const result = spawnSync("/bin/bash", [helper, ...args], { input, encoding: "utf8" });
  assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
  return result.stdout + result.stderr;
}

function readPolicy() {
  const result = spawnSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", policy], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function writePolicy(value) {
  fs.writeFileSync(policy, JSON.stringify(value));
  const result = spawnSync("/usr/bin/plutil", ["-convert", "xml1", policy], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

async function concurrentChange() {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/bash", [helper, "apply", A], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let changed = false;
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (!changed && output.includes("Type APPLY to proceed")) {
        changed = true;
        writePolicy({ AdministratorChange: "must survive" });
        child.stdin.end("APPLY\n");
      }
    });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => {
      try {
        assert.equal(changed, true);
        assert.equal(code, 1, output);
        assert.match(output, /policy changed during review/);
        assert.deepEqual(readPolicy(), { AdministratorChange: "must survive" });
        resolve();
      } catch (error) { reject(error); }
    });
  });
}

async function main() {
  try {
    cli(["status", A]);
    cli(["preview", A]);
    assert.equal(fs.existsSync(policy), false);
    assert.equal(fs.existsSync(stateDir), false);
    assert.match(cli(["apply", A], "NO\n", 1), /Cancelled/);
    assert.equal(fs.existsSync(policy), false);
    cli(["apply", "*"], "", 1);
    console.log("PASS read-only preview, cancellation and invalid-ID guards");

    const original = { HomepageLocation: "https://example.test", ExtensionSettings: { "*": { installation_mode: "blocked" }, [C]: { installation_mode: "blocked" } } };
    writePolicy(original);
    cli(["apply", A], "APPLY\n");
    assert.deepEqual(readPolicy(), { ...original, ExtensionSettings: { ...original.ExtensionSettings, [A]: rule } });
    const after = fs.readFileSync(policy);
    assert.match(cli(["apply", A]), /Already configured/);
    assert.deepEqual(fs.readFileSync(policy), after);
    assert.match(cli(["status", A]), /exact two-host/);
    const newer = readPolicy();
    newer.NewAdminSetting = true;
    writePolicy(newer);
    cli(["undo", A], "UNDO\n");
    assert.deepEqual(readPolicy(), { ...original, NewAdminSetting: true });
    console.log("PASS scoped apply, idempotency, backup and undo preserving later unrelated changes");

    cli(["apply", A], "APPLY\n");
    const clean = readPolicy();
    const conflicting = structuredClone(clean);
    conflicting.ExtensionSettings[A].installation_mode = "blocked";
    writePolicy(conflicting);
    assert.match(cli(["undo", A], "UNDO\n", 1), /has changed/);
    assert.deepEqual(readPolicy(), conflicting);
    writePolicy(clean);
    fs.chmodSync(policy, 0o600);
    cli(["undo", A], "UNDO\n");
    assert.equal(fs.statSync(policy).mode & 0o777, 0o600);
    console.log("PASS refusal to overwrite changed extension-specific policy");
    console.log("PASS current file permissions preserved during undo");

    writePolicy({ ExtensionSettings: { [A]: rule, [C]: { installation_mode: "blocked" } } });
    const beforeMigration = fs.readFileSync(policy);
    cli(["migrate", A, B], "MIGRATE\n");
    assert.deepEqual(readPolicy(), { ExtensionSettings: { [B]: rule, [C]: { installation_mode: "blocked" } } });
    cli(["undo", B], "UNDO\n");
    assert.deepEqual(fs.readFileSync(policy), beforeMigration);
    console.log("PASS ID migration and byte-for-byte restoration when no intervening edits occurred");

    writePolicy({});
    await concurrentChange();
    console.log("PASS concurrent-edit guard");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
