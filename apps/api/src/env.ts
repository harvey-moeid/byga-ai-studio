export type Bindings = {
  /** Single-operator access token (server-side secret, min. 32 chars). */
  STUDIO_ACCESS_TOKEN?: string;
  /** Cloudflare D1 database. When absent the API falls back to volatile in-memory storage. */
  DB?: D1Database;
};
