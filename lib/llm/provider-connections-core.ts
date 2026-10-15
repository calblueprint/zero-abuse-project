import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const CREDENTIAL_FORMAT_VERSION = "v1";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const MAX_API_KEY_LENGTH = 16_384;
const MAX_BASE_URL_LENGTH = 2_048;
const MAX_MODEL_ID_LENGTH = 255;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const providerTypes = [
  "openai",
  "openrouter",
  "ollama",
  "lm_studio",
  "openai_compatible",
] as const;

export const providerTestStatuses = ["untested", "success", "failed"] as const;

export type ProviderType = (typeof providerTypes)[number];
export type ProviderTestStatus = (typeof providerTestStatuses)[number];
export type ProviderCapabilities = Record<
  string,
  boolean | string | number | null
>;

export interface ProviderConnectionRecord {
  connectionId: string;
  userId: string;
  providerType: ProviderType;
  baseUrl: string;
  modelId: string;
  encryptedApiKey: string | null;
  apiKeyHint: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  capabilities: ProviderCapabilities;
  lastTestStatus: ProviderTestStatus;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProviderConnectionMetadata = Omit<
  ProviderConnectionRecord,
  "encryptedApiKey"
> & {
  hasApiKey: boolean;
};

export interface CreateProviderConnectionInput {
  providerType: ProviderType;
  baseUrl: string;
  modelId: string;
  apiKey?: string | null;
  isDefault?: boolean;
  isEnabled?: boolean;
  capabilities?: ProviderCapabilities;
}

export interface UpdateProviderConnectionInput {
  providerType?: ProviderType;
  baseUrl?: string;
  modelId?: string;
  apiKey?: string | null;
  isDefault?: boolean;
  isEnabled?: boolean;
  capabilities?: ProviderCapabilities;
}

export type CreateProviderConnectionValues = Omit<
  CreateProviderConnectionInput,
  "apiKey" | "isDefault" | "isEnabled" | "capabilities"
> & {
  encryptedApiKey: string | null;
  apiKeyHint: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  capabilities: ProviderCapabilities;
};

export type UpdateProviderConnectionValues = Partial<
  Omit<CreateProviderConnectionValues, "encryptedApiKey" | "apiKeyHint">
> & {
  encryptedApiKey?: string | null;
  apiKeyHint?: string | null;
  lastTestStatus?: ProviderTestStatus;
  lastTestedAt?: string | null;
};

export interface ProviderConnectionStore {
  listForUser(userId: string): Promise<ProviderConnectionRecord[]>;
  findForUser(
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnectionRecord | null>;
  createForUser(
    userId: string,
    values: CreateProviderConnectionValues,
  ): Promise<ProviderConnectionRecord>;
  updateForUser(
    userId: string,
    connectionId: string,
    values: UpdateProviderConnectionValues,
  ): Promise<ProviderConnectionRecord | null>;
  deleteForUser(userId: string, connectionId: string): Promise<boolean>;
  setDefaultForUser(
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnectionRecord | null>;
}

export class ProviderConnectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConnectionValidationError";
  }
}

export class ProviderConnectionNotFoundError extends Error {
  constructor() {
    super("Provider connection was not found.");
    this.name = "ProviderConnectionNotFoundError";
  }
}

export class CredentialConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialConfigurationError";
  }
}

export class CredentialDecryptionError extends Error {
  constructor() {
    super("The saved provider credential could not be decrypted.");
    this.name = "CredentialDecryptionError";
  }
}

type KeyValue = Buffer | Uint8Array;

export class CredentialCipher {
  private readonly activeKeyId: string;
  private readonly keys: ReadonlyMap<string, Buffer>;

  constructor(activeKeyId: string, keys: Readonly<Record<string, KeyValue>>) {
    assertKeyId(activeKeyId);

    const normalizedKeys = new Map<string, Buffer>();
    for (const [keyId, value] of Object.entries(keys)) {
      assertKeyId(keyId);
      const key = Buffer.from(value);
      if (key.byteLength !== 32) {
        throw new CredentialConfigurationError(
          `Credential encryption key ${keyId} must decode to exactly 32 bytes.`,
        );
      }
      normalizedKeys.set(keyId, key);
    }

    if (!normalizedKeys.has(activeKeyId)) {
      throw new CredentialConfigurationError(
        "The active credential encryption key is not present in the keyring.",
      );
    }

    this.activeKeyId = activeKeyId;
    this.keys = normalizedKeys;
  }

  encrypt(plaintext: string): string {
    if (!plaintext || plaintext.length > MAX_API_KEY_LENGTH) {
      throw new ProviderConnectionValidationError(
        `API keys must be between 1 and ${MAX_API_KEY_LENGTH} characters.`,
      );
    }

    const key = this.keys.get(this.activeKeyId);
    if (!key) {
      throw new CredentialConfigurationError(
        "The active credential encryption key is unavailable.",
      );
    }

    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(aadFor(this.activeKeyId), "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authenticationTag = cipher.getAuthTag();

    return [
      CREDENTIAL_FORMAT_VERSION,
      this.activeKeyId,
      iv.toString("base64url"),
      authenticationTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(envelope: string): string {
    try {
      const [version, keyId, encodedIv, encodedTag, encodedCiphertext, extra] =
        envelope.split(".");

      if (
        extra !== undefined ||
        version !== CREDENTIAL_FORMAT_VERSION ||
        !keyId ||
        !encodedIv ||
        !encodedTag ||
        !encodedCiphertext
      ) {
        throw new Error("Malformed credential envelope");
      }

      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error("Credential key is unavailable");
      }

      const iv = Buffer.from(encodedIv, "base64url");
      const authenticationTag = Buffer.from(encodedTag, "base64url");
      const ciphertext = Buffer.from(encodedCiphertext, "base64url");

      if (
        iv.byteLength !== IV_LENGTH_BYTES ||
        authenticationTag.byteLength !== 16
      ) {
        throw new Error("Malformed credential envelope");
      }

      const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from(aadFor(keyId), "utf8"));
      decipher.setAuthTag(authenticationTag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch (error) {
      if (error instanceof CredentialDecryptionError) {
        throw error;
      }
      throw new CredentialDecryptionError();
    }
  }

  needsRotation(envelope: string): boolean {
    const [version, keyId] = envelope.split(".");
    return version !== CREDENTIAL_FORMAT_VERSION || keyId !== this.activeKeyId;
  }
}

type CipherFactory = CredentialCipher | (() => CredentialCipher);

export class ProviderConnectionService {
  private readonly store: ProviderConnectionStore;
  private readonly cipherFactory: CipherFactory;

  constructor(store: ProviderConnectionStore, cipherFactory: CipherFactory) {
    this.store = store;
    this.cipherFactory = cipherFactory;
  }

  async listForUser(userId: string): Promise<ProviderConnectionMetadata[]> {
    return (await this.store.listForUser(userId)).map(toMetadata);
  }

  async getForUser(
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnectionMetadata> {
    assertConnectionId(connectionId);
    const connection = await this.store.findForUser(userId, connectionId);
    if (!connection) {
      throw new ProviderConnectionNotFoundError();
    }
    return toMetadata(connection);
  }

  async createForUser(
    userId: string,
    input: CreateProviderConnectionInput,
  ): Promise<ProviderConnectionMetadata> {
    const apiKey = normalizeApiKey(input.apiKey);
    const values: CreateProviderConnectionValues = {
      providerType: normalizeProviderType(input.providerType),
      baseUrl: normalizeBaseUrl(input.baseUrl),
      modelId: normalizeModelId(input.modelId),
      encryptedApiKey: apiKey ? this.cipher().encrypt(apiKey) : null,
      apiKeyHint: apiKey ? apiKeyHint(apiKey) : null,
      isDefault: input.isDefault ?? false,
      isEnabled: input.isEnabled ?? true,
      capabilities: normalizeCapabilities(input.capabilities),
    };

    if (values.isDefault && !values.isEnabled) {
      throw new ProviderConnectionValidationError(
        "A disabled provider connection cannot be the default.",
      );
    }

    return toMetadata(await this.store.createForUser(userId, values));
  }

  async updateForUser(
    userId: string,
    connectionId: string,
    input: UpdateProviderConnectionInput,
  ): Promise<ProviderConnectionMetadata> {
    assertConnectionId(connectionId);
    if (input.isDefault === true && input.isEnabled === false) {
      throw new ProviderConnectionValidationError(
        "A disabled provider connection cannot be the default.",
      );
    }

    const values: UpdateProviderConnectionValues = {};
    if (input.providerType !== undefined) {
      values.providerType = normalizeProviderType(input.providerType);
    }
    if (input.baseUrl !== undefined) {
      values.baseUrl = normalizeBaseUrl(input.baseUrl);
    }
    if (input.modelId !== undefined) {
      values.modelId = normalizeModelId(input.modelId);
    }
    if (input.isDefault !== undefined) {
      values.isDefault = input.isDefault;
    }
    if (input.isEnabled !== undefined) {
      values.isEnabled = input.isEnabled;
      if (!input.isEnabled) {
        values.isDefault = false;
      }
    }
    if (input.capabilities !== undefined) {
      values.capabilities = normalizeCapabilities(input.capabilities);
    }
    if (input.apiKey !== undefined) {
      const apiKey = normalizeApiKey(input.apiKey);
      values.encryptedApiKey = apiKey ? this.cipher().encrypt(apiKey) : null;
      values.apiKeyHint = apiKey ? apiKeyHint(apiKey) : null;
    }

    const updated = await this.store.updateForUser(
      userId,
      connectionId,
      values,
    );
    if (!updated) {
      throw new ProviderConnectionNotFoundError();
    }
    return toMetadata(updated);
  }

  async deleteForUser(userId: string, connectionId: string): Promise<void> {
    assertConnectionId(connectionId);
    if (!(await this.store.deleteForUser(userId, connectionId))) {
      throw new ProviderConnectionNotFoundError();
    }
  }

  async setDefaultForUser(
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnectionMetadata> {
    assertConnectionId(connectionId);
    const updated = await this.store.setDefaultForUser(userId, connectionId);
    if (!updated) {
      throw new ProviderConnectionNotFoundError();
    }
    return toMetadata(updated);
  }

  async recordTestResultForUser(
    userId: string,
    connectionId: string,
    status: Exclude<ProviderTestStatus, "untested">,
    testedAt = new Date().toISOString(),
  ): Promise<ProviderConnectionMetadata> {
    assertConnectionId(connectionId);
    if (status !== "success" && status !== "failed") {
      throw new ProviderConnectionValidationError(
        "Connection test status must be success or failed.",
      );
    }

    const updated = await this.store.updateForUser(userId, connectionId, {
      lastTestStatus: status,
      lastTestedAt: testedAt,
    });
    if (!updated) {
      throw new ProviderConnectionNotFoundError();
    }
    return toMetadata(updated);
  }

  async getCredentialForUser(
    userId: string,
    connectionId: string,
  ): Promise<string | null> {
    assertConnectionId(connectionId);
    const connection = await this.store.findForUser(userId, connectionId);
    if (!connection) {
      throw new ProviderConnectionNotFoundError();
    }
    if (!connection.encryptedApiKey) {
      return null;
    }

    const cipher = this.cipher();
    const apiKey = cipher.decrypt(connection.encryptedApiKey);
    if (cipher.needsRotation(connection.encryptedApiKey)) {
      await this.store.updateForUser(userId, connectionId, {
        encryptedApiKey: cipher.encrypt(apiKey),
      });
    }
    return apiKey;
  }

  private cipher(): CredentialCipher {
    return typeof this.cipherFactory === "function"
      ? this.cipherFactory()
      : this.cipherFactory;
  }
}

export function decodeBase64EncryptionKey(encodedKey: string): Buffer {
  const normalized = encodedKey.trim();
  const key = Buffer.from(normalized, "base64");
  const canonicalInput = normalized.replace(/=+$/, "");
  const canonicalDecoded = key.toString("base64").replace(/=+$/, "");

  if (key.byteLength !== 32 || canonicalInput !== canonicalDecoded) {
    throw new CredentialConfigurationError(
      "Credential encryption keys must be valid base64 encoding exactly 32 bytes.",
    );
  }
  return key;
}

function aadFor(keyId: string): string {
  return `llm-provider-credential.${CREDENTIAL_FORMAT_VERSION}.${keyId}`;
}

function assertKeyId(keyId: string): void {
  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(keyId) ||
    ["__proto__", "constructor", "prototype"].includes(keyId)
  ) {
    throw new CredentialConfigurationError(
      "Credential encryption key IDs must contain only letters, numbers, underscores, and hyphens.",
    );
  }
}

function assertConnectionId(connectionId: string): void {
  if (!UUID_PATTERN.test(connectionId)) {
    throw new ProviderConnectionValidationError(
      "Provider connection ID is invalid.",
    );
  }
}

function normalizeProviderType(providerType: string): ProviderType {
  if (!providerTypes.includes(providerType as ProviderType)) {
    throw new ProviderConnectionValidationError("Provider type is invalid.");
  }
  return providerType as ProviderType;
}

function normalizeBaseUrl(value: string): string {
  const baseUrl = value.trim().replace(/\/$/, "");
  if (!baseUrl || baseUrl.length > MAX_BASE_URL_LENGTH) {
    throw new ProviderConnectionValidationError(
      "Provider base URL is invalid.",
    );
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new ProviderConnectionValidationError(
      "Provider base URL is invalid.",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProviderConnectionValidationError(
      "Provider base URL must use HTTP or HTTPS.",
    );
  }
  if (url.username || url.password) {
    throw new ProviderConnectionValidationError(
      "Provider base URL must not contain credentials.",
    );
  }
  return url.toString().replace(/\/$/, "");
}

function normalizeModelId(value: string): string {
  const modelId = value.trim();
  if (!modelId || modelId.length > MAX_MODEL_ID_LENGTH) {
    throw new ProviderConnectionValidationError("Model ID is invalid.");
  }
  return modelId;
}

function normalizeApiKey(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const apiKey = value.trim();
  if (!apiKey || apiKey.length > MAX_API_KEY_LENGTH) {
    throw new ProviderConnectionValidationError(
      `API keys must be between 1 and ${MAX_API_KEY_LENGTH} characters.`,
    );
  }
  return apiKey;
}

function normalizeCapabilities(
  capabilities: ProviderCapabilities | undefined,
): ProviderCapabilities {
  if (!capabilities) {
    return {};
  }

  const normalized: ProviderCapabilities = {};
  for (const [name, value] of Object.entries(capabilities)) {
    if (
      !name ||
      name === "__proto__" ||
      name === "constructor" ||
      name === "prototype" ||
      (!["boolean", "string", "number"].includes(typeof value) &&
        value !== null) ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      throw new ProviderConnectionValidationError(
        "Provider capabilities contain an invalid value.",
      );
    }
    normalized[name] = value;
  }
  return normalized;
}

function apiKeyHint(apiKey: string): string {
  return apiKey.length > 8 ? `••••${apiKey.slice(-4)}` : "••••";
}

function toMetadata(
  connection: ProviderConnectionRecord,
): ProviderConnectionMetadata {
  const { encryptedApiKey, ...metadata } = connection;
  return {
    ...metadata,
    hasApiKey: encryptedApiKey !== null,
  };
}
