import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, modules) {
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ESNext,
      },
    },
  );
  runInNewContext(outputText, {
    exports,
    URL,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
  });
  return exports;
}

test("sign-up renders on the server without browser storage", () => {
  const wrapper = ({ children }) => children;
  const { SignUpForm } = load("../app/(auth)/sign-up/sign-up-form.tsx", {
    "@/actions/auth/actions": { signUp: async () => {} },
    "@/components/auth/ui": {
      Heading: "h1",
      Eyebrow: "p",
      Field: wrapper,
      Fields: wrapper,
      Label: "label",
      Input: "input",
      PasswordInput: "input",
      PasswordRules: () => null,
      SubmitButton: wrapper,
      CenterLink: "a",
    },
    "@/lib/validation/email": {},
    "@/lib/validation/password": {},
    "../session-value": { useSessionValue: () => "" },
  });
  assert.match(
    renderToStaticMarkup(createElement(SignUpForm)),
    /Create account/,
  );
});

test("an expired recovery link takes precedence over a pending email change", async () => {
  const { GET } = load("../app/(auth)/auth/callback/route.ts", {
    "@/actions/supabase/server": {
      createSupabaseServerClient: () => assert.fail("Unexpected Auth request"),
    },
  });
  const response = await GET({
    url: "https://app.example.com/auth/callback?flow=recovery",
    cookies: { get: () => ({ value: "pending@example.org" }) },
  });
  assert.equal(
    response.headers.get("location"),
    "https://app.example.com/login?error=invalid-reset-link",
  );
});
