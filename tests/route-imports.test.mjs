import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const routesRoot = join(root, "app");

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(tsx?|jsx?|mjs)$/.test(entry.name) ? [path] : [];
  });
}

function existsAsModule(path) {
  return [path, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"].map(suffix => path + suffix),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map(entry => join(path, entry))]
    .some(candidate => existsSync(candidate));
}

test("all relative and @/ imports point to real local files", () => {
  const missing = [];
  for (const file of [...sourceFiles(join(root, "app")), ...sourceFiles(join(root, "src"))]) {
    const content = readFileSync(file, "utf8");
    // Match both ordinary and type-only imports/exports, including multiline import statements.
    const imports = [...content.matchAll(/\b(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)].map(match => match[1]);
    for (const specifier of imports) {
      if (!specifier.startsWith("@/") && !specifier.startsWith(".")) continue;
      const target = specifier.startsWith("@/")
        ? resolve(root, "src", specifier.slice(2))
        : resolve(dirname(file), specifier);
      if (!existsAsModule(target)) missing.push(`${file.slice(root.length)}: ${specifier}`);
    }
  }
  assert.deepEqual(missing, [], `Unresolved local imports:\n${missing.join("\n")}`);
});

test("Tracker uses the same shared app entry as all other Next.js routes", () => {
  const tracker = readFileSync(join(routesRoot, "tracker/[locale]/page.tsx"), "utf8");
  assert.match(tracker, /import\s*\{\s*NFVApp\s*\}\s*from\s*["']\.\.\/\.\.\/NFVApp["']/);
  assert.doesNotMatch(tracker, /@\/app\//);
});
