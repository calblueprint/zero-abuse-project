import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const hostname = new URL(databaseUrl).hostname;
const isLocalDatabase =
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

if (!isLocalDatabase && process.env.ALLOW_REMOTE_SEED !== "true") {
  throw new Error(
    "Refusing to seed a remote database. Set ALLOW_REMOTE_SEED=true to explicitly allow a remote development/test seed.",
  );
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: isLocalDatabase ? false : "require",
});

const testSources = [
  {
    sourceId: "7a000000-0000-4000-8000-000000000001",
    name: "TEST SOURCE: Alpha News",
    tier: "test-tier-1",
    type: "test-news",
    baseUrl: "https://alpha.test.invalid",
  },
  {
    sourceId: "7a000000-0000-4000-8000-000000000002",
    name: "TEST SOURCE: Beta Research",
    tier: "test-tier-2",
    type: "test-research",
    baseUrl: "https://beta.test.invalid",
  },
  {
    sourceId: "7a000000-0000-4000-8000-000000000003",
    name: "TEST SOURCE: Gamma Alerts",
    tier: "test-tier-3",
    type: "test-alerts",
    baseUrl: "https://gamma.test.invalid",
  },
];

const testItems = [
  {
    itemId: "7a000000-0000-4000-8000-000000000101",
    sourceId: testSources[0].sourceId,
    sourceUrl: "https://alpha.test.invalid/items/101",
    publishedAt: "2026-01-10T10:00:00.000Z",
    title: "TEST INTEL 101: AI grooming on social media",
    tldr: "Deterministic development record 101.",
    exploitationType: "Online Grooming",
    platform: "Social Media",
    technology: "Generative AI",
    affectedPopulation: "Children",
    offenderTactic: "Impersonation",
    geography: "North America",
    intelType: "News Report",
    zapRelevance: "High",
  },
  {
    itemId: "7a000000-0000-4000-8000-000000000102",
    sourceId: testSources[0].sourceId,
    sourceUrl: "https://alpha.test.invalid/items/102",
    publishedAt: "2026-01-20T15:30:00.000Z",
    title: "TEST INTEL 102: Sextortion through messaging apps",
    tldr: "Deterministic development record 102.",
    exploitationType: "Financial Sextortion",
    platform: "Messaging",
    technology: "Mobile Apps",
    affectedPopulation: "Teens",
    offenderTactic: "Coercion",
    geography: "Europe",
    intelType: "Research",
    zapRelevance: "Medium",
  },
  {
    itemId: "7a000000-0000-4000-8000-000000000103",
    sourceId: testSources[1].sourceId,
    sourceUrl: "https://beta.test.invalid/items/103",
    publishedAt: "2026-02-05T08:15:00.000Z",
    title: "TEST INTEL 103: AI impersonation in messaging",
    tldr: "Deterministic development record 103.",
    exploitationType: "Online Grooming",
    platform: "Messaging",
    technology: "Generative AI",
    affectedPopulation: "Children",
    offenderTactic: "Impersonation",
    geography: "Europe",
    intelType: "News Report",
    zapRelevance: "High",
  },
  {
    itemId: "7a000000-0000-4000-8000-000000000104",
    sourceId: testSources[1].sourceId,
    sourceUrl: "https://beta.test.invalid/items/104",
    publishedAt: "2026-02-20T18:45:00.000Z",
    title: "TEST INTEL 104: CSAM distribution through cloud storage",
    tldr: "Deterministic development record 104.",
    exploitationType: "CSAM Distribution",
    platform: "File Sharing",
    technology: "Cloud Storage",
    affectedPopulation: "Young Adults",
    offenderTactic: "Distribution",
    geography: "Asia",
    intelType: "Law Enforcement Alert",
    zapRelevance: "High",
  },
  {
    itemId: "7a000000-0000-4000-8000-000000000105",
    sourceId: testSources[2].sourceId,
    sourceUrl: "https://gamma.test.invalid/items/105",
    publishedAt: "2026-03-10T12:00:00.000Z",
    title: "TEST INTEL 105: Crypto sextortion on social media",
    tldr: "Deterministic development record 105.",
    exploitationType: "Financial Sextortion",
    platform: "Social Media",
    technology: "Cryptocurrency",
    affectedPopulation: "Teens",
    offenderTactic: "Coercion",
    geography: "North America",
    intelType: "News Report",
    zapRelevance: "Medium",
  },
  {
    itemId: "7a000000-0000-4000-8000-000000000106",
    sourceId: testSources[2].sourceId,
    sourceUrl: "https://gamma.test.invalid/items/106",
    publishedAt: "2026-03-20T21:10:00.000Z",
    title: "TEST INTEL 106: Grooming risks in virtual reality games",
    tldr: "Deterministic development record 106.",
    exploitationType: "Online Grooming",
    platform: "Gaming",
    technology: "Virtual Reality",
    affectedPopulation: "Children",
    offenderTactic: "Trust Building",
    geography: "Oceania",
    intelType: "Research",
    zapRelevance: "Low",
  },
];

try {
  await sql.begin(async transaction => {
    for (const source of testSources) {
      await transaction`
        INSERT INTO sources (
          source_id, name, tier, type, base_url, is_active, added_at
        ) VALUES (
          ${source.sourceId}, ${source.name}, ${source.tier}, ${source.type},
          ${source.baseUrl}, true, '2026-01-01T00:00:00.000Z'
        )
        ON CONFLICT (source_id) DO UPDATE SET
          name = EXCLUDED.name,
          tier = EXCLUDED.tier,
          type = EXCLUDED.type,
          base_url = EXCLUDED.base_url,
          is_active = EXCLUDED.is_active
      `;
    }

    for (const item of testItems) {
      await transaction`
        INSERT INTO itel_items (
          item_id, source_id, source_url, published_at, added_at, title, tldr,
          exploitation_type, platform, technology, affected_population,
          offender_tactic, geography, intel_type, zap_relevance
        ) VALUES (
          ${item.itemId}, ${item.sourceId}, ${item.sourceUrl},
          ${item.publishedAt}, '2026-01-01T00:00:00.000Z', ${item.title},
          ${item.tldr}, ${item.exploitationType}, ${item.platform},
          ${item.technology}, ${item.affectedPopulation},
          ${item.offenderTactic}, ${item.geography}, ${item.intelType},
          ${item.zapRelevance}
        )
        ON CONFLICT (item_id) DO UPDATE SET
          source_id = EXCLUDED.source_id,
          source_url = EXCLUDED.source_url,
          published_at = EXCLUDED.published_at,
          title = EXCLUDED.title,
          tldr = EXCLUDED.tldr,
          exploitation_type = EXCLUDED.exploitation_type,
          platform = EXCLUDED.platform,
          technology = EXCLUDED.technology,
          affected_population = EXCLUDED.affected_population,
          offender_tactic = EXCLUDED.offender_tactic,
          geography = EXCLUDED.geography,
          intel_type = EXCLUDED.intel_type,
          zap_relevance = EXCLUDED.zap_relevance
      `;
    }
  });

  console.log(
    `Seeded ${testSources.length} test sources and ${testItems.length} test intelligence items.`,
  );
} finally {
  await sql.end();
}
