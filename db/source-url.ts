import type { SQLWrapper } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const sourceUrlKey = (url: SQLWrapper | string) =>
  sql`regexp_replace(
    regexp_replace(${url}, '^https?://(www[.])?', '', 'i'),
    '^([^?]*?)/+([?].*)?$', '\\1\\2'
  )`;
