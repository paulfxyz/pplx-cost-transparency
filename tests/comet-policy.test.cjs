const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../comet/policy.js"), "utf8"), context);
const plan = (request) => JSON.parse(JSON.stringify(context.buildPolicyPlan(request)));
const A = "a".repeat(32);
const B = "b".repeat(32);
const C = "c".repeat(32);
const rule = {
  runtime_allowed_hosts: ["https://perplexity.ai", "https://www.perplexity.ai"],
  runtime_blocked_hosts: [],
};

test("Comet apply creates only one extension exception for the two approved HTTPS hosts", () => {
  const result = plan({ action: "apply", id: A, policy: null });
  assert.deepEqual(result.policy, { ExtensionSettings: { [A]: rule } });
  assert.equal(result.record.createdPolicy, true);
  assert.equal(result.record.createdExtensionSettings, true);
});

test("Comet preview preserves unrelated policies and wildcard restrictions", () => {
  const input = { ExtensionSettings: { "*": { installation_mode: "blocked" }, [C]: { update_url: "https://example.test" } }, HomepageLocation: "https://example.test" };
  const before = JSON.stringify(input);
  const result = plan({ action: "apply", id: A, policy: input });
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(result.policy.ExtensionSettings["*"], input.ExtensionSettings["*"]);
  assert.deepEqual(result.policy.ExtensionSettings[C], input.ExtensionSettings[C]);
  assert.equal(result.policy.HomepageLocation, input.HomepageLocation);
});

test("Comet status does not generate a write plan", () => {
  const result = plan({ action: "status", id: A, policy: { ExtensionSettings: { [A]: rule } } });
  assert.equal(result.configured, true);
  assert.equal(result.changed, false);
  assert.equal(result.policy, undefined);
});

test("Comet apply is a no-op for an already matching policy and does not adopt it", () => {
  const result = plan({ action: "apply", id: A, policy: { ExtensionSettings: { [A]: rule } } });
  assert.equal(result.changed, false);
  assert.equal(result.record, undefined);
});

for (const id of ["*", "", "abc", "q".repeat(32), A + "; echo unsafe", null]) {
  test(`Comet rejects invalid or wildcard ID ${JSON.stringify(id)}`, () => {
    assert.throws(() => plan({ action: "apply", id, policy: null }), /32-letter/);
  });
}

test("Comet refuses to overwrite an existing extension-specific rule", () => {
  assert.throws(() => plan({ action: "apply", id: A, policy: { ExtensionSettings: { [A]: { installation_mode: "blocked" } } } }), /not be overwritten/);
});

test("Comet rejects malformed policy dictionaries", () => {
  assert.throws(() => plan({ action: "apply", id: A, policy: [] }), /dictionary/);
  assert.throws(() => plan({ action: "apply", id: A, policy: { ExtensionSettings: [] } }), /dictionary/);
});

test("Comet undo removes a helper-created otherwise-empty policy file", () => {
  const applied = plan({ action: "apply", id: A, policy: null });
  const undone = plan({ action: "undo", id: A, policy: applied.policy, record: applied.record });
  assert.equal(undone.removePolicy, true);
  assert.deepEqual(undone.policy, {});
});

test("Comet undo preserves a pre-existing empty policy and settings dictionary", () => {
  const applied = plan({ action: "apply", id: A, policy: { ExtensionSettings: {} } });
  const undone = plan({ action: "undo", id: A, policy: applied.policy, record: applied.record });
  assert.equal(undone.removePolicy, false);
  assert.deepEqual(undone.policy, { ExtensionSettings: {} });
});

test("Comet undo preserves unrelated changes added after setup", () => {
  const applied = plan({ action: "apply", id: A, policy: null });
  applied.policy.ExtensionSettings[C] = { installation_mode: "blocked" };
  applied.policy.OtherSetting = true;
  const undone = plan({ action: "undo", id: A, policy: applied.policy, record: applied.record });
  assert.deepEqual(undone.policy, { ExtensionSettings: { [C]: { installation_mode: "blocked" } }, OtherSetting: true });
  assert.equal(undone.removePolicy, false);
});

test("Comet undo refuses to overwrite later changes to its own entry", () => {
  const applied = plan({ action: "apply", id: A, policy: null });
  applied.policy.ExtensionSettings[A].installation_mode = "blocked";
  assert.throws(() => plan({ action: "undo", id: A, policy: applied.policy, record: applied.record }), /has changed/);
});

test("Comet undo requires its own matching recovery record", () => {
  assert.throws(() => plan({ action: "undo", id: A, policy: { ExtensionSettings: { [A]: rule } } }), /Recovery record/);
  const applied = plan({ action: "apply", id: A, policy: null });
  applied.record.extensionId = B;
  assert.throws(() => plan({ action: "undo", id: A, policy: applied.policy, record: applied.record }), /another setup/);
});

test("Comet migration replaces only the old scoped ID and can be undone", () => {
  const input = { ExtensionSettings: { [A]: rule, [C]: { installation_mode: "blocked" } } };
  const migrated = plan({ action: "migrate", from: A, id: B, policy: input });
  assert.equal(migrated.policy.ExtensionSettings[A], undefined);
  assert.deepEqual(migrated.policy.ExtensionSettings[B], rule);
  assert.deepEqual(migrated.policy.ExtensionSettings[C], input.ExtensionSettings[C]);
  const undone = plan({ action: "undo", id: B, policy: migrated.policy, record: migrated.record });
  assert.deepEqual(undone.policy, input);
});

test("Comet migration refuses unexpected old rules or an occupied target ID", () => {
  assert.throws(() => plan({ action: "migrate", from: A, id: B, policy: { ExtensionSettings: { [A]: { runtime_allowed_hosts: ["https://example.test"] } } } }), /old ID/);
  assert.throws(() => plan({ action: "migrate", from: A, id: B, policy: { ExtensionSettings: { [A]: rule, [B]: rule } } }), /target ID/);
  assert.throws(() => plan({ action: "migrate", from: A, id: A, policy: { ExtensionSettings: { [A]: rule } } }), /must differ/);
});

test("Comet migration undo preserves unrelated newer rules and refuses conflicting old IDs", () => {
  const migrated = plan({ action: "migrate", from: A, id: B, policy: { ExtensionSettings: { [A]: rule } } });
  migrated.policy.ExtensionSettings[C] = { installation_mode: "blocked" };
  assert.deepEqual(plan({ action: "undo", id: B, policy: migrated.policy, record: migrated.record }).policy.ExtensionSettings[C], { installation_mode: "blocked" });
  migrated.policy.ExtensionSettings[A] = { installation_mode: "blocked" };
  assert.throws(() => plan({ action: "undo", id: B, policy: migrated.policy, record: migrated.record }), /old ID now has a different policy/);
});

test("Comet helper never supports a global-unblock operation", () => {
  assert.throws(() => plan({ action: "enable-all", id: A, policy: null }), /Unknown action/);
});
