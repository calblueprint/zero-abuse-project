import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  CredentialCipher,
  CredentialDecryptionError,
  ProviderConnectionNotFoundError,
  ProviderConnectionService,
} from "../lib/llm/provider-connections-core.ts";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

class MemoryProviderConnectionStore {
  rows = new Map();

  async listForUser(userId) {
    return [...this.rows.values()].filter(row => row.userId === userId);
  }

  async findForUser(userId, connectionId) {
    const row = this.rows.get(connectionId);
    return row?.userId === userId ? { ...row } : null;
  }

  async createForUser(userId, values) {
    if (values.isDefault) this.clearDefault(userId);
    const now = new Date().toISOString();
    const row = {
      connectionId: randomUUID(),
      userId,
      ...values,
      lastTestStatus: "untested",
      lastTestedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.connectionId, row);
    return { ...row };
  }

  async updateForUser(userId, connectionId, values) {
    const row = this.rows.get(connectionId);
    if (!row || row.userId !== userId) return null;
    if (values.isDefault) this.clearDefault(userId);
    const updated = {
      ...row,
      ...values,
      ...(values.isEnabled === false && { isDefault: false }),
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(connectionId, updated);
    return { ...updated };
  }

  async deleteForUser(userId, connectionId) {
    const row = this.rows.get(connectionId);
    return row?.userId === userId && this.rows.delete(connectionId);
  }

  async setDefaultForUser(userId, connectionId) {
    const row = this.rows.get(connectionId);
    if (!row || row.userId !== userId || !row.isEnabled) return null;
    this.clearDefault(userId);
    row.isDefault = true;
    row.updatedAt = new Date().toISOString();
    return { ...row };
  }

  clearDefault(userId) {
    for (const row of this.rows.values()) {
      if (row.userId === userId) row.isDefault = false;
    }
  }
}

function cipher(activeKeyId = "current", extraKeys = {}) {
  return new CredentialCipher(activeKeyId, {
    [activeKeyId]: Buffer.alloc(32, 7),
    ...extraKeys,
  });
}

function input(overrides = {}) {
  return {
    providerType: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1/",
    modelId: "openrouter/free",
    ...overrides,
  };
}

test("credentials round-trip without exposing plaintext and reject tampering", () => {
  const credentialCipher = cipher();
  const envelope = credentialCipher.encrypt("sk-secret-value");

  assert.equal(envelope.includes("sk-secret-value"), false);
  assert.equal(credentialCipher.decrypt(envelope), "sk-secret-value");
  assert.throws(
    () => credentialCipher.decrypt(`${envelope.slice(0, -1)}x`),
    CredentialDecryptionError,
  );
});

test("connection metadata is owner-scoped and never returns ciphertext", async () => {
  const store = new MemoryProviderConnectionStore();
  const service = new ProviderConnectionService(store, cipher());
  const created = await service.createForUser(
    USER_A,
    input({ apiKey: "sk-very-secret-value", isDefault: true }),
  );

  assert.equal(created.hasApiKey, true);
  assert.equal(created.apiKeyHint, "••••alue");
  assert.equal("encryptedApiKey" in created, false);
  assert.equal((await service.listForUser(USER_B)).length, 0);
  await assert.rejects(
    service.getForUser(USER_B, created.connectionId),
    ProviderConnectionNotFoundError,
  );
  await assert.rejects(
    service.getCredentialForUser(USER_B, created.connectionId),
    ProviderConnectionNotFoundError,
  );
});

test("credential replacement, clearing, and connection deletion are supported", async () => {
  const store = new MemoryProviderConnectionStore();
  const service = new ProviderConnectionService(store, cipher());
  const created = await service.createForUser(
    USER_A,
    input({ apiKey: "sk-original-value" }),
  );

  await service.updateForUser(USER_A, created.connectionId, {
    modelId: "updated-model",
    apiKey: undefined,
  });
  assert.equal(
    await service.getCredentialForUser(USER_A, created.connectionId),
    "sk-original-value",
  );

  await service.updateForUser(USER_A, created.connectionId, {
    apiKey: "sk-replacement-value",
  });
  assert.equal(
    await service.getCredentialForUser(USER_A, created.connectionId),
    "sk-replacement-value",
  );

  const cleared = await service.updateForUser(USER_A, created.connectionId, {
    apiKey: null,
  });
  assert.equal(cleared.hasApiKey, false);
  assert.equal(
    await service.getCredentialForUser(USER_A, created.connectionId),
    null,
  );

  await service.deleteForUser(USER_A, created.connectionId);
  await assert.rejects(
    service.getForUser(USER_A, created.connectionId),
    ProviderConnectionNotFoundError,
  );
});

test("only one provider connection can be selected as a user's default", async () => {
  const store = new MemoryProviderConnectionStore();
  const service = new ProviderConnectionService(store, cipher());
  const first = await service.createForUser(
    USER_A,
    input({ modelId: "first", isDefault: true }),
  );
  const second = await service.createForUser(
    USER_A,
    input({ modelId: "second" }),
  );

  await service.setDefaultForUser(USER_A, second.connectionId);
  const connections = await service.listForUser(USER_A);

  assert.deepEqual(
    connections
      .filter(connection => connection.isDefault)
      .map(connection => connection.connectionId),
    [second.connectionId],
  );
  assert.equal(
    connections.find(
      connection => connection.connectionId === first.connectionId,
    ).isDefault,
    false,
  );
});

test("credentials are lazily re-encrypted after an encryption-key rotation", async () => {
  const store = new MemoryProviderConnectionStore();
  const oldKey = Buffer.alloc(32, 3);
  const oldService = new ProviderConnectionService(
    store,
    new CredentialCipher("old", { old: oldKey }),
  );
  const created = await oldService.createForUser(
    USER_A,
    input({ apiKey: "sk-rotate-me" }),
  );

  const newService = new ProviderConnectionService(
    store,
    new CredentialCipher("new", {
      new: Buffer.alloc(32, 9),
      old: oldKey,
    }),
  );
  assert.equal(
    await newService.getCredentialForUser(USER_A, created.connectionId),
    "sk-rotate-me",
  );

  const rotated = await store.findForUser(USER_A, created.connectionId);
  assert.match(rotated.encryptedApiKey, /^v1\.new\./);
});
