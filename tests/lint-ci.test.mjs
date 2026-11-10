import assert from "node:assert/strict";
import path from "node:path";
import { unexpectedErrors } from "../scripts/lint-ci.mjs";

const root = "/repo";
const known = "src/screens/tracker/useTrackerFarms.ts";
const error = { severity: 2, ruleId: "react-hooks/set-state-in-effect", message: "existing error", line: 21 };
const result = (file, messages) => ({ filePath: path.join(root, file), messages });
assert.equal(unexpectedErrors([result(known, [error])], root).length, 0);
assert.equal(unexpectedErrors([result(known, [error, error])], root).length, 1);
assert.equal(unexpectedErrors([result("src/new.ts", [error])], root).length, 1);
assert.equal(unexpectedErrors([result(known, [{ ...error, ruleId: "new-rule" }])], root).length, 1);
assert.equal(unexpectedErrors([result(known, [{ ...error, fatal: true }])], root).length, 1);
assert.equal(unexpectedErrors([], root).length, 0);
