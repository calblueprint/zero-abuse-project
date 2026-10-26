# Geographic reference data

`uscities.csv` matches the [SimpleMaps US Cities Basic database](https://simplemaps.com/data/us-cities).

The loader requires `city`, `city_ascii`, `state_id`, `county_name`, and `county_fips`.

- **License:** The Basic dataset uses CC BY 4.0. Follow the source's attribution requirements when using it in the product.
- **Coverage:** Cities map to their primary county only; this CSV is not a complete county catalog.
- **Aliases:** `geo_reference.py` supplements names using [Census county codes](https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt), plus New York City/NYC aliases.
