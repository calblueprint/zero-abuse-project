export type SearchParams = {
  [key: string]: string | string[] | undefined;
};

// Trimmed, non-empty, de-duplicated values for a repeatable query param.
export const getValues = (params: SearchParams, key: string) => {
  const value = params[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return [...new Set(values.map(item => item.trim()).filter(Boolean))];
};

export const getAllowedValues = <T extends string>(
  params: SearchParams,
  key: string,
  allowedValues: readonly T[],
): T[] => {
  const allowed = new Set<string>(allowedValues);
  return getValues(params, key).filter((value): value is T =>
    allowed.has(value),
  );
};

// The same shape as a page's searchParams prop, from useSearchParams().
export const toSearchParams = (params: URLSearchParams): SearchParams =>
  Object.fromEntries(
    [...new Set(params.keys())].map(key => [key, params.getAll(key)]),
  );
