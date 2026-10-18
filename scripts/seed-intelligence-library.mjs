import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import postgres from "postgres";

const source = {
  sourceId: "b7c14c5d-4c6e-4ad0-8fe8-2b30b0bfb461",
  name: "[TEST] Issue #46 Recently Accessed",
  baseUrl: "https://example.com/",
};

const items = Array.from({ length: 6 }, (_, index) => ({
  itemId: `aa000046-2001-4000-8000-${String(index + 1).padStart(12, "0")}`,
  title: `[TEST] Issue #46 item ${index + 1}`,
  sourceUrl: `https://example.com/?zap-issue-46-test=${index + 1}`,
  publishedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
}));

const envPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.env.local",
);
const databaseUrl = parse(readFileSync(envPath)).DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing from .env.local");

const database = new URL(databaseUrl);
const projectRef = /^postgres\.([a-z0-9]+)$/i.exec(
  decodeURIComponent(database.username),
)?.[1];
if (!projectRef) {
  throw new Error("Cannot identify a Supabase project from DATABASE_URL");
}

console.log(`Target Supabase project: ${projectRef}`);
console.log(`Source: ${source.sourceId} | ${source.name} | ${source.baseUrl}`);
for (const item of items) {
  console.log(
    `Item: ${item.itemId} | ${item.title} | ${item.sourceUrl} | ${item.publishedAt}`,
  );
}

const expectedArguments = ["--apply", `--project=${projectRef}`];
if (
  process.argv.length !== 4 ||
  !expectedArguments.every(argument => process.argv.includes(argument))
) {
  console.log(
    `Preview only. To insert missing test rows, rerun with ${expectedArguments.join(" ")}`,
  );
  process.exit(0);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: ["localhost", "127.0.0.1"].includes(database.hostname)
    ? false
    : "require",
});

try {
  const inserted = await sql.begin(async transaction => {
    await transaction`
      insert into sources (source_id, name, base_url)
      values (${source.sourceId}::uuid, ${source.name}, ${source.baseUrl})
      on conflict (source_id) do nothing
    `;

    const [storedSource] = await transaction`
      select name, base_url from sources where source_id = ${source.sourceId}::uuid
    `;
    if (
      storedSource?.name !== source.name ||
      storedSource.base_url !== source.baseUrl
    ) {
      throw new Error(
        "Test source ID belongs to different data; no rows committed",
      );
    }

    let count = 0;
    for (const item of items) {
      const result = await transaction`
        insert into itel_items
          (item_id, source_id, source_url, title, published_at)
        values
          (${item.itemId}::uuid, ${source.sourceId}::uuid,
           ${item.sourceUrl}, ${item.title}, ${item.publishedAt}::timestamptz)
        on conflict (item_id) do nothing
        returning item_id
      `;
      count += result.length;

      const [storedItem] = await transaction`
        select source_id, source_url, title, published_at
        from itel_items where item_id = ${item.itemId}::uuid
      `;
      if (
        storedItem?.source_id !== source.sourceId ||
        storedItem.source_url !== item.sourceUrl ||
        storedItem.title !== item.title ||
        new Date(storedItem.published_at).toISOString() !==
          new Date(item.publishedAt).toISOString()
      ) {
        throw new Error(
          `Test item ID ${item.itemId} belongs to different data; no rows committed`,
        );
      }
    }

    return count;
  });

  console.log(
    `Inserted ${inserted} item(s); ${items.length - inserted} already existed.`,
  );
} finally {
  await sql.end();
}
