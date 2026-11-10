import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function load(relativePath, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ESNext,
      },
    },
  ).outputText;
  runInNewContext(code, {
    exports,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
    console,
    process,
  });
  return exports;
}

const searchParams = load("../lib/validation/search-params.ts");
const { parseProfileTab } = load(
  "../app/(authenticated)/(approved)/profile/tabs.ts",
  { "@/lib/validation/search-params": searchParams },
);

test("profile tab comes from ?tab= and falls back to details", () => {
  assert.equal(parseProfileTab({}), "details");
  assert.equal(parseProfileTab({ tab: "access" }), "access");
  assert.equal(parseProfileTab({ tab: " ai-processing " }), "ai-processing");
  assert.equal(parseProfileTab({ tab: "bogus" }), "details");
  assert.equal(parseProfileTab({ tab: ["bogus", "access"] }), "access");
  assert.equal(
    parseProfileTab(
      searchParams.toSearchParams(new URLSearchParams("tab=access")),
    ),
    "access",
  );
});

test("admins and members see different capabilities", () => {
  const { getCapabilities } = load("../lib/auth/capabilities.ts");
  const admin = getCapabilities(true);
  const member = getCapabilities(false);

  assert.ok(admin.includes("Approve and reject access requests"));
  assert.ok(admin.includes("Manage people and access"));
  assert.ok(
    !member.some(capability => /access requests|people/.test(capability)),
  );
  assert.ok(member.length > 0);
});

test("initials trim spaces and keep characters outside the BMP whole", () => {
  const { getInitials } = load("../lib/utils.ts");

  assert.equal(getInitials("jiwoo", "park"), "JP");
  assert.equal(getInitials("  Jiwoo ", " Park  "), "JP");
  assert.equal(getInitials("Jiwoo", ""), "J");
  assert.equal(getInitials("😀Alex", "Ng"), "😀N");
});

function loadProfileActions({
  currentEmail = "jiwoo@example.org",
  pendingEmail = null,
  updateUserError = null,
  resendError = null,
  emailStateError = null,
} = {}) {
  const calls = { updateUser: [], resend: [], cookies: [], profile: [] };
  const supabase = {
    auth: {
      updateUser: async (...args) => {
        calls.updateUser.push(args);
        return { error: updateUserError };
      },
      resend: async params => {
        calls.resend.push(params);
        return { error: resendError };
      },
    },
  };
  const actions = load("../actions/profile/actions.ts", {
    "@/actions/onboarding/validation": load(
      "../actions/onboarding/validation.ts",
    ),
    "@/actions/supabase/profile": {
      updateUserProfile: async (...args) => calls.profile.push(args),
    },
    "@/actions/supabase/server": {
      createSupabaseServerClient: async () => supabase,
    },
    "@/lib/auth/access": {
      requireApprovedUser: async () => ({ userId: "user-1" }),
    },
    "@/lib/auth/user": {
      getAuthEmailState: async () => {
        if (emailStateError) throw emailStateError;
        return { email: currentEmail, pendingEmail };
      },
    },
    "@/lib/validation/email": load("../lib/validation/email.ts"),
    "next/cache": { revalidatePath: () => {} },
    "next/headers": {
      cookies: async () => ({
        set: (name, value) => calls.cookies.push([name, value]),
      }),
      headers: async () => new Map([["origin", "http://localhost:3000"]]),
    },
  });
  return { actions, calls };
}

function profileForm(email) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    firstName: "Jiwoo",
    lastName: "Park",
    phone: "5105550187",
    organization: "Zero Abuse Project",
    role: "Platform lead",
    email,
  }))
    form.set(key, value);
  return form;
}

test("saving without an email change reports saved and sends no email", async () => {
  const { actions, calls } = loadProfileActions();
  const result = await actions.submitProfileUpdate(
    {},
    profileForm(" Jiwoo@Example.org "),
  );

  assert.equal(result.status, "saved");
  assert.equal(calls.profile.length, 1);
  assert.equal(calls.updateUser.length, 0);
  assert.equal(calls.cookies.length, 0);
});

test("a new email starts the change and reports where the link went", async () => {
  const { actions, calls } = loadProfileActions();
  const result = await actions.submitProfileUpdate(
    {},
    profileForm("new@example.org"),
  );

  assert.equal(result.status, "email-change-sent");
  assert.equal(result.pendingEmail, "new@example.org");
  assert.equal(result.fields.email, "jiwoo@example.org");
  assert.deepEqual(calls.cookies, [
    ["email-change-requested", "new@example.org"],
  ]);
});

test("a failed email change keeps the other edits and has no status", async () => {
  const { actions } = loadProfileActions({
    updateUserError: { message: "boom" },
  });
  const result = await actions.submitProfileUpdate(
    {},
    profileForm("new@example.org"),
  );

  assert.equal(result.status, undefined);
  assert.ok(result.errors.email);
  assert.equal(result.message, "Your other changes were saved.");
});

test("a failed auth lookup stops the save before anything is written", async () => {
  const { actions, calls } = loadProfileActions({
    emailStateError: new Error("network"),
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await actions.submitProfileUpdate(
      {},
      profileForm("jiwoo@example.org"),
    );
    assert.equal(result.status, undefined);
    assert.ok(result.errors.form);
  } finally {
    console.error = originalError;
  }
  assert.equal(calls.profile.length, 0);
});

test("an invalid form is not saved", async () => {
  const { actions, calls } = loadProfileActions();
  const form = profileForm("not-an-email");
  form.set("firstName", " ");
  const result = await actions.submitProfileUpdate({}, form);

  assert.equal(result.status, undefined);
  assert.ok(result.errors.firstName);
  assert.ok(result.errors.email);
  assert.equal(calls.profile.length, 0);
});

test("resend looks the user up by current email and refreshes the cookie", async () => {
  const { actions, calls } = loadProfileActions({
    pendingEmail: "new@example.org",
  });
  const result = await actions.resendEmailChange();

  assert.equal(result.error, undefined);
  assert.equal(calls.resend.length, 1);
  assert.equal(calls.resend[0].type, "email_change");
  assert.equal(calls.resend[0].email, "jiwoo@example.org");
  assert.deepEqual(calls.cookies, [
    ["email-change-requested", "new@example.org"],
  ]);
});

test("resend without a pending change or when rate limited explains why", async () => {
  const none = loadProfileActions();
  assert.match((await none.actions.resendEmailChange()).error, /no email/);
  assert.equal(none.calls.resend.length, 0);

  const limited = loadProfileActions({
    pendingEmail: "new@example.org",
    resendError: { status: 429, message: "rate limited" },
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.match(
      (await limited.actions.resendEmailChange()).error,
      /wait a minute/,
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(limited.calls.cookies.length, 0);
});
