export function formatIntelType(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const labels = parsed.filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        );
        return labels.length ? labels.join(", ") : null;
      }
    } catch {
      // Preserve an older plain-text value if it is not valid JSON.
    }
  }
  return trimmed;
}
