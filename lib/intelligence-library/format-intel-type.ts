export function parseClassificationLabels(
  value: string | null | undefined,
): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        );
      }
    } catch {
      // Preserve an older plain-text value if it is not valid JSON.
    }
  }
  return [trimmed];
}

export function formatIntelType(
  value: string | null | undefined,
): string | null {
  return parseClassificationLabels(value).join(", ") || null;
}
