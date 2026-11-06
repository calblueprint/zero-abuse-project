CREATE UNIQUE INDEX "sources_url_key_unique" ON "sources" USING btree (regexp_replace(
    regexp_replace("base_url", '^https?://(www[.])?', '', 'i'),
    '^([^?]*?)/+([?].*)?$', '\1\2'
  ));