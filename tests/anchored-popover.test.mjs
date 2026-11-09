import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(
    new URL("../lib/hooks/useAnchoredPopover.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

for (const [align, left, right, width, expected] of [
  ["start", 280, 360, 380, "10px"],
  ["end", 10, 90, 200, "0px"],
  ["start", 40, 120, 200, "40px"],
  ["end", 100, 300, 200, "100px"],
]) {
  test(`${align} popover at ${left} stays within the viewport`, () => {
    const exports = {};
    runInNewContext(code, {
      exports,
      require: () => ({
        useCallback: callback => callback,
        useEffect: () => {},
        useId: () => "popover",
        useRef: () => ({ current: null }),
        useState: () => [false, () => {}],
      }),
      document: { documentElement: { clientWidth: 390 } },
      window: { innerHeight: 800 },
    });
    const hook = exports.default({ align });
    hook.anchorRef.current = {
      getBoundingClientRect: () => ({ left, right, top: 100, bottom: 140 }),
    };
    hook.popoverRef.current = {
      style: {},
      offsetWidth: width,
      offsetHeight: 200,
    };
    hook.popoverProps.onBeforeToggle({ newState: "open" });
    hook.popoverProps.onToggle({ newState: "open" });
    assert.equal(hook.popoverRef.current.style.left, expected);
    assert.equal(hook.popoverRef.current.style.right, "auto");
  });
}
