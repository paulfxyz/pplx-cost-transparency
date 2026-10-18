const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const { version } = require("../manifest.json");
const name = `pplx-cost-transparency-${version}`;
const dist = path.join(root, "dist");
const folder = path.join(dist, name);
fs.rmSync(folder, { recursive: true, force: true });
fs.mkdirSync(folder, { recursive: true });

// Explicit allowlist: never ship test fixtures, node_modules, account data or .git.
for (const file of ["manifest.json", "README.md", "LICENSE", "PRIVACY.md", "CHANGELOG.md"]) {
  fs.copyFileSync(path.join(root, file), path.join(folder, file));
}
for (const directory of ["src", "docs"]) {
  fs.cpSync(path.join(root, directory), path.join(folder, directory), { recursive: true });
}
const archive = path.join(dist, `${name}.zip`);
fs.rmSync(archive, { force: true });
execFileSync("zip", ["-qr", archive, name], { cwd: dist });
const sha = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
fs.writeFileSync(path.join(dist, "SHA256SUMS.txt"), `${sha}  ${name}.zip\n`);
console.log(`${archive}\nSHA-256: ${sha}`);
