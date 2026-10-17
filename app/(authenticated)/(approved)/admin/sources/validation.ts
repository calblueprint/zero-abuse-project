export const SOURCE_TIERS = ["1", "2", "3"] as const;

export const SOURCE_TYPES = [
  "News",
  "Government",
  "Law enforcement",
  "Research/academic",
  "NGO/nonprofit",
  "Platform/industry",
  "Legal/court",
  "Other",
] as const;

export type SourceFields = {
  name: string;
  tier: string;
  type: string;
  url: string;
};

export type SourceFormState = {
  fields?: SourceFields;
  errors?: Partial<Record<keyof SourceFields, string>>;
  message?: string;
  inactiveMatch?: { sourceId: string; name: string };
};

type SourceParseResult =
  | { success: true; data: SourceFields; fields: SourceFields }
  | {
      success: false;
      fields: SourceFields;
      errors: NonNullable<SourceFormState["errors"]>;
    };

function normalizeUrl(input: string): string | undefined {
  const value = input.trim();

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );

    if (
      !/^([a-z\d-]+\.)+[a-z][a-z\d-]*$/.test(url.hostname) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }

    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return undefined;
  }
}

export function parseSourceFormData(formData: FormData): SourceParseResult {
  const fields: SourceFields = {
    name: String(formData.get("name") ?? ""),
    tier: String(formData.get("tier") ?? ""),
    type: String(formData.get("type") ?? ""),
    url: String(formData.get("url") ?? ""),
  };
  const name = fields.name.trim();
  const url = normalizeUrl(fields.url);
  const errors: NonNullable<SourceFormState["errors"]> = {};

  if (!name) {
    errors.name = "Enter a name.";
  } else if (name.length > 255) {
    errors.name = "Name must be 255 characters or fewer.";
  }

  if (!(SOURCE_TIERS as readonly string[]).includes(fields.tier)) {
    errors.tier = "Choose a tier.";
  }

  if (!(SOURCE_TYPES as readonly string[]).includes(fields.type)) {
    errors.type = "Choose a type.";
  }

  if (!url) {
    errors.url = "Enter a valid URL, like example.com.";
  }

  if (!url || Object.keys(errors).length > 0) {
    return { success: false, fields, errors };
  }

  return { success: true, data: { ...fields, name, url }, fields };
}
