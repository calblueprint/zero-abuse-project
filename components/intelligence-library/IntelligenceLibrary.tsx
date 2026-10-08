import type {
  IntelligenceLibraryFilterOptions,
  IntelligenceLibraryItem,
} from "@/db/queries/intelligence-library";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import ResetFiltersButton from "@/components/intelligence-library/ResetFiltersButton";

type FilterDefinition = {
  label: string;
  name: string;
  selected: string[];
  options: string[];
};

type IntelligenceLibraryProps = {
  filters: IntelligenceFilters;
  items: IntelligenceLibraryItem[];
  options: IntelligenceLibraryFilterOptions;
};

const formatDateInput = (date: Date | undefined) =>
  date ? date.toISOString().slice(0, 10) : "";

const formatPublishedAt = (publishedAt: string | null) =>
  publishedAt ? new Date(publishedAt).toLocaleString() : "Unknown date";

export default function IntelligenceLibrary({
  filters,
  items,
  options,
}: IntelligenceLibraryProps) {
  const taxonomyFilters: FilterDefinition[] = [
    {
      label: "Exploitation type",
      name: "exploitationType",
      selected: filters.exploitationTypes,
      options: options.exploitationTypes,
    },
    {
      label: "Platform",
      name: "platform",
      selected: filters.platforms,
      options: options.platforms,
    },
    {
      label: "Technology",
      name: "technology",
      selected: filters.technologies,
      options: options.technologies,
    },
    {
      label: "Affected population",
      name: "affectedPopulation",
      selected: filters.affectedPopulations,
      options: options.affectedPopulations,
    },
    {
      label: "Offender tactic",
      name: "offenderTactic",
      selected: filters.offenderTactics,
      options: options.offenderTactics,
    },
    {
      label: "Geography",
      name: "geography",
      selected: filters.geographies,
      options: options.geographies,
    },
    {
      label: "Intelligence type",
      name: "intelType",
      selected: filters.intelTypes,
      options: options.intelTypes,
    },
  ];

  return (
    <main style={{ margin: "0 auto", maxWidth: "1200px", padding: "2rem" }}>
      <h1>Intelligence Library</h1>

      <form action="/" method="get" style={{ margin: "1.5rem 0" }}>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          {taxonomyFilters.map(filter => (
            <label
              key={filter.name}
              style={{ display: "grid", gap: "0.25rem" }}
            >
              {filter.label}
              <select
                defaultValue={filter.selected}
                multiple
                name={filter.name}
                size={Math.min(Math.max(filter.options.length, 2), 5)}
              >
                {filter.options.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label style={{ display: "grid", gap: "0.25rem" }}>
            Source
            <select
              defaultValue={filters.sourceIds}
              multiple
              name="sourceId"
              size={Math.min(Math.max(options.sources.length, 2), 5)}
            >
              {options.sources.map(source => (
                <option key={source.sourceId} value={source.sourceId}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            Published from (UTC)
            <input
              defaultValue={formatDateInput(filters.publishedFrom)}
              name="publishedFrom"
              type="date"
            />
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            Published to (UTC, inclusive)
            <input
              defaultValue={formatDateInput(filters.publishedTo)}
              name="publishedTo"
              type="date"
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button type="submit">Apply filters</button>
          <ResetFiltersButton />
        </div>
      </form>

      <p>{items.length} item(s) found</p>

      <section style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
        {items.map(item => (
          <article
            key={item.itemId}
            style={{ border: "1px solid #ccc", padding: "1rem" }}
          >
            <h2>{item.title ?? "Untitled intelligence item"}</h2>
            <p>
              {item.sourceName} · {formatPublishedAt(item.publishedAt)}
            </p>
            {item.tldr && <p style={{ marginTop: "0.5rem" }}>{item.tldr}</p>}
            <a href={item.sourceUrl} rel="noreferrer" target="_blank">
              View source
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
