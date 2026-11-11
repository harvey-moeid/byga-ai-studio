export type Bindings = {
  /** Single-operator access token (server-side secret, min. 32 chars). */
  STUDIO_ACCESS_TOKEN?: string;
  /** Cloudflare D1 database. When absent the API falls back to volatile in-memory storage. */
  DB?: D1Database;
  /** Explicit opt-in; Suara model use is restricted to personal non-commercial use. */
  SUARA_ENABLED?: string;
  SUARA_BASE_URL?: string;
  SUARA_APP_PASSCODE?: string;
};
