import "server-only";
import type {
  CreateProviderConnectionInput,
  ProviderConnectionMetadata,
  ProviderTestStatus,
  UpdateProviderConnectionInput,
} from "@/lib/llm/provider-connections-core";
import { drizzleProviderConnectionStore } from "@/db/queries/llm-provider-connections";
import { requireApprovedUser } from "@/lib/auth/access";
import {
  CredentialCipher,
  CredentialConfigurationError,
  decodeBase64EncryptionKey,
  ProviderConnectionService,
} from "@/lib/llm/provider-connections-core";

const service = new ProviderConnectionService(
  drizzleProviderConnectionStore,
  createCredentialCipherFromEnvironment,
);

export async function listMyProviderConnections(): Promise<
  ProviderConnectionMetadata[]
> {
  const user = await requireApprovedUser();
  return service.listForUser(user.userId);
}

export async function getMyProviderConnection(
  connectionId: string,
): Promise<ProviderConnectionMetadata> {
  const user = await requireApprovedUser();
  return service.getForUser(user.userId, connectionId);
}

export async function createMyProviderConnection(
  input: CreateProviderConnectionInput,
): Promise<ProviderConnectionMetadata> {
  const user = await requireApprovedUser();
  return service.createForUser(user.userId, input);
}

export async function updateMyProviderConnection(
  connectionId: string,
  input: UpdateProviderConnectionInput,
): Promise<ProviderConnectionMetadata> {
  const user = await requireApprovedUser();
  return service.updateForUser(user.userId, connectionId, input);
}

export async function deleteMyProviderConnection(
  connectionId: string,
): Promise<void> {
  const user = await requireApprovedUser();
  await service.deleteForUser(user.userId, connectionId);
}

export async function setMyDefaultProviderConnection(
  connectionId: string,
): Promise<ProviderConnectionMetadata> {
  const user = await requireApprovedUser();
  return service.setDefaultForUser(user.userId, connectionId);
}

export async function recordMyProviderConnectionTest(
  connectionId: string,
  status: Exclude<ProviderTestStatus, "untested">,
): Promise<ProviderConnectionMetadata> {
  const user = await requireApprovedUser();
  return service.recordTestResultForUser(user.userId, connectionId, status);
}

/**
 * Returns a credential only for the signed-in owner. Keep this function inside
 * server-only inference code; never return its result from a Server Action or
 * Route Handler.
 */
export async function getMyProviderCredential(
  connectionId: string,
): Promise<string | null> {
  const user = await requireApprovedUser();
  return service.getCredentialForUser(user.userId, connectionId);
}

function createCredentialCipherFromEnvironment(): CredentialCipher {
  const activeKeyId = process.env.LLM_CREDENTIAL_ENCRYPTION_KEY_ID?.trim();
  const activeEncodedKey = process.env.LLM_CREDENTIAL_ENCRYPTION_KEY?.trim();

  if (!activeKeyId || !activeEncodedKey) {
    throw new CredentialConfigurationError(
      "LLM credential encryption is not configured.",
    );
  }

  const keys: Record<string, Buffer> = Object.create(null) as Record<
    string,
    Buffer
  >;
  const encodedPreviousKeys =
    process.env.LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS?.trim();

  if (encodedPreviousKeys) {
    let previousKeys: unknown;
    try {
      previousKeys = JSON.parse(encodedPreviousKeys);
    } catch {
      throw new CredentialConfigurationError(
        "LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS must be a JSON object.",
      );
    }

    if (
      !previousKeys ||
      typeof previousKeys !== "object" ||
      Array.isArray(previousKeys)
    ) {
      throw new CredentialConfigurationError(
        "LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS must be a JSON object.",
      );
    }

    for (const [keyId, encodedKey] of Object.entries(previousKeys)) {
      if (typeof encodedKey !== "string") {
        throw new CredentialConfigurationError(
          "Previous credential encryption keys must be base64 strings.",
        );
      }
      keys[keyId] = decodeBase64EncryptionKey(encodedKey);
    }
  }

  keys[activeKeyId] = decodeBase64EncryptionKey(activeEncodedKey);
  return new CredentialCipher(activeKeyId, keys);
}
