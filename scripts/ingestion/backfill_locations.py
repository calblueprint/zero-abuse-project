"""Backfill structured geography without changing the original geography column.

Run after the Drizzle migration: python -m scripts.ingestion.backfill_locations
Legacy text and malformed JSON remain available through the existing filter.
"""

import json

from dotenv import load_dotenv

from scripts.intelligence.location_resolver import get_default_resolver
from scripts.intelligence.models import ExtractedLocation
from scripts.ingestion.repository import PostgresRepository


def convert_locations(value: str) -> list[dict]:
    try:
        entries = json.loads(value)
    except (TypeError, ValueError):
        return []
    if not isinstance(entries, list) or not entries:
        return []
    # Leave unsupported legacy records untouched rather than partially migrating them.
    if any(not isinstance(entry, dict) for entry in entries):
        return []
    resolver = get_default_resolver()
    converted = []
    for entry in entries:
        if "raw_extracted" in entry:
            raw = entry["raw_extracted"]
            location = ExtractedLocation.model_validate(raw)
        elif "country" in entry:
            raw = entry
            country = entry["country"]
            country = country.strip().upper() if isinstance(country, str) else ""
            if country in {"UNITED STATES", "UNITED STATES OF AMERICA", "USA", "U.S.", "U.S.A."}:
                country = "US"
            if country != "US":
                converted.append({"raw_extracted": raw, "standardized": {"status": "unmatched"}})
                continue
            location = ExtractedLocation(
                country_code="US", state=entry.get("state_or_jurisdiction"),
                city=None, county=None, region=None,
            )
        else:
            return []
        converted.append({
            "raw_extracted": raw,
            "standardized": resolver.standardize(location).model_dump(mode="json"),
        })
    return converted


def main() -> None:
    load_dotenv(".env.local")
    load_dotenv()
    repository = PostgresRepository.from_environment()
    migrated = 0
    skipped = 0
    try:
        # Keyset batches bound memory and let an interrupted run resume safely.
        last_id = "00000000-0000-0000-0000-000000000000"
        while True:
            rows = repository.connection.execute(
                """SELECT item_id, geography FROM itel_items i
                WHERE item_id > %s AND geography IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM item_locations l WHERE l.item_id = i.item_id)
                ORDER BY item_id LIMIT 100""", (last_id,),
            ).fetchall()
            if not rows:
                break
            for item_id, geography in rows:
                last_id = str(item_id)
                try:
                    locations = convert_locations(geography)
                except ValueError:
                    skipped += 1
                    continue
                if not locations:
                    skipped += 1
                    continue
                with repository.connection.transaction():
                    repository.connection.execute(
                        "SELECT item_id FROM itel_items WHERE item_id = %s FOR UPDATE", (item_id,),
                    )
                    if repository.connection.execute(
                        "SELECT 1 FROM item_locations WHERE item_id = %s LIMIT 1", (item_id,),
                    ).fetchone():
                        continue
                    repository.save_locations(str(item_id), locations)
                    migrated += 1
        print(f"Migrated {migrated} items; left {skipped} unsupported or empty records unchanged.")
    finally:
        repository.close()


if __name__ == "__main__":
    main()
