import LocalDate from "@/components/LocalDate";
import { deactivateSource, reactivateSource } from "./actions";

type SourceProps = {
  source: {
    sourceId: string;
    name: string;
    tier: string | null;
    type: string | null;
    baseUrl: string | null;
    isActive: boolean;
    addedAt: string | null;
    addedBy: string | null;
  };
};

export default function Source({ source }: SourceProps) {
  const toggleActive = source.isActive ? deactivateSource : reactivateSource;

  return (
    <li>
      <p>
        <strong>{source.name}</strong> (
        {source.isActive ? "Active" : "Inactive"})
      </p>
      <p>
        Tier {source.tier ?? "—"} · {source.type ?? "No type"}
      </p>
      {source.baseUrl && (
        <a href={source.baseUrl} target="_blank" rel="noreferrer">
          {source.baseUrl}
        </a>
      )}
      <p>
        Added{" "}
        {source.addedAt ? (
          <LocalDate value={new Date(source.addedAt).toISOString()} />
        ) : (
          "on an unknown date"
        )}{" "}
        by {source.addedBy ?? "unknown"}
      </p>
      <form action={toggleActive.bind(null, source.sourceId)}>
        <button type="submit">
          {source.isActive ? "Inactivate" : "Reactivate"}
        </button>
      </form>
    </li>
  );
}
