import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel: string) =>
  JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith(".ts")) out.push(full);
    }
  };
  walk(path.join(root, "src"));
  return out;
}

describe("project structure", () => {
  it("has a valid package.json", () => {
    const pkg = readJson("package.json");
    assert.ok(pkg.name);
    assert.ok(pkg.version);
  });

  it("ships the locale files the server loads at runtime", () => {
    const pkg = readJson("package.json");
    assert.ok(pkg.files.includes("source/locales/"));
    for (const locale of ["en", "es", "fr"]) {
      const data = readJson(`source/locales/${locale}.json`);
      assert.equal(typeof data, "object");
    }
  });

  it("has SECURITY.md and LICENSE", () => {
    assert.ok(fs.existsSync(path.join(root, "SECURITY.md")));
    assert.ok(fs.existsSync(path.join(root, "LICENSE")));
  });
});

describe("manifest", () => {
  it("lists the ten tools", () => {
    const manifest = readJson("manifest.json");
    assert.ok(Array.isArray(manifest.tools));
    assert.equal(manifest.tools.length, 10);
    for (const tool of manifest.tools) {
      assert.equal(typeof tool.name, "string");
      assert.ok(tool.name.length > 0);
    }
  });

  it("keeps every version string in step with package.json", async () => {
    const { SERVER_VERSION } = await import("../src/constants.ts");
    const version = readJson("package.json").version;
    const server = readJson("server.json");
    assert.equal(SERVER_VERSION, version);
    assert.equal(readJson("manifest.json").version, version);
    assert.equal(server.version, version);
    assert.equal(server.packages[0].version, version);
  });
});

describe("source hygiene", () => {
  it("contains no hardcoded secrets", () => {
    const patterns = [/sk-[a-zA-Z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /ghp_[a-zA-Z0-9]{36}/];
    for (const file of sourceFiles()) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of patterns) assert.doesNotMatch(content, pattern, file);
    }
  });

  it("never starts a process through a shell", () => {
    // Regression guard for GHSA-2q55-r7q3-v3g3: exec/execSync build a shell
    // command line, and shell:true does the same for spawn.
    for (const file of sourceFiles()) {
      const content = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(content, /shell:\s*true/, file);
      const imports = content.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*"(?:node:)?child_process"/g
      );
      for (const match of imports) {
        const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
        assert.deepEqual(names, ["spawn"], file);
      }
    }
  });
});
