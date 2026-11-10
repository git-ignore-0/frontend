import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

// Preserve the six pre-existing hook errors while blocking new errors in CI.
// npm run lint continues to report all errors, including this baseline.
export const baseline = new Map([
  ["src/components/overlays/useOverlayDialog.ts:react-hooks/refs", 1],
  ["src/screens/csa/useCsaPackages.ts:react-hooks/set-state-in-effect", 1],
  ["src/screens/tracker/TrackerDialogs.tsx:react-hooks/set-state-in-effect", 1],
  ["src/screens/tracker/TrackerPage.tsx:react-hooks/set-state-in-effect", 1],
  ["src/screens/tracker/TrackerParts.tsx:react-hooks/set-state-in-effect", 1],
  ["src/screens/tracker/useTrackerFarms.ts:react-hooks/set-state-in-effect", 1],
]);

export function unexpectedErrors(results, root) {
  const remaining = new Map(baseline);
  const unexpected = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (message.severity !== 2) continue;
      const file = path.relative(root, result.filePath).split(path.sep).join("/");
      const key = `${file}:${message.ruleId}`;
      if (!message.fatal && (remaining.get(key) ?? 0) > 0) {
        remaining.set(key, remaining.get(key) - 1);
      } else {
        unexpected.push(`${file}:${message.line ?? 0} ${message.ruleId ?? "parse"} ${message.message}`);
      }
    }
  }
  return unexpected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(["."]);
  const formatter = await eslint.loadFormatter("stylish");
  process.stdout.write(formatter.format(results));
  const errors = unexpectedErrors(results, root);
  if (errors.length) {
    console.error(`CI rejected ${errors.length} new lint error(s).`);
    process.exitCode = 1;
  } else {
    console.log("No new lint errors. The six pre-existing hook errors remain tracked in scripts/lint-ci.mjs.");
  }
}
