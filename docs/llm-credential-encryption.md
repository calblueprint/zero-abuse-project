# LLM credential encryption

User-supplied LLM API keys are encrypted before they are written to
`llm_provider_connections`. The application uses AES-256-GCM with a fresh
96-bit nonce for each write. The stored envelope includes only its format
version, key ID, nonce, authentication tag, and ciphertext.

The API key is write-only from the user's perspective. List and read operations
return `hasApiKey` and a masked hint, never the encrypted value or plaintext.
Application logs and error messages must follow the same rule.

## Initial configuration

Generate a 32-byte key and store it in the deployment's secret manager:

```shell
openssl rand -base64 32
```

Configure the server-only environment variables:

```dotenv
LLM_CREDENTIAL_ENCRYPTION_KEY_ID=2026-01
LLM_CREDENTIAL_ENCRYPTION_KEY=<base64 key from the secret manager>
LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS={}
```

Never use a `NEXT_PUBLIC_` prefix for these variables. Use distinct keys in
development, staging, and production. Losing every key in the keyring makes the
saved provider credentials unrecoverable.

## Rotation

The encryption envelope records the key ID. This permits a new active key to be
deployed while an old key remains available only for decryption.

1. Generate a new 32-byte key and choose a new key ID.
2. Move the old ID and key into
   `LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS`, a JSON object of key IDs to base64
   keys.
3. Set the new ID and key as `LLM_CREDENTIAL_ENCRYPTION_KEY_ID` and
   `LLM_CREDENTIAL_ENCRYPTION_KEY` in one deployment.
4. Credentials are re-encrypted with the active key the next time server-side
   inference reads them. Replacing a user's API key also writes with the active
   key.
5. Before removing an old key, confirm that no rows still name it:

   ```sql
   SELECT count(*)
   FROM llm_provider_connections
   WHERE encrypted_api_key IS NOT NULL
     AND split_part(encrypted_api_key, '.', 2) = 'OLD_KEY_ID';
   ```

6. Remove the old entry only after the count is zero. Users whose credentials
   were never exercised during the rotation window can instead replace their
   API key to re-encrypt it.

Example during rotation:

```dotenv
LLM_CREDENTIAL_ENCRYPTION_KEY_ID=2026-06
LLM_CREDENTIAL_ENCRYPTION_KEY=<new base64 key>
LLM_CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS={"2026-01":"<old base64 key>"}
```

## Authorization boundary

The database table has Row Level Security enabled with no browser-facing policy,
so authenticated Supabase Data API clients cannot read the encrypted column or
write around server-side encryption. Trusted server code uses the direct
Drizzle connection, which can bypass RLS, so every query also includes the
authenticated user's ID. The public service functions call
`requireApprovedUser()` before accessing the store. There is no administrator
operation that returns another user's plaintext credential.
