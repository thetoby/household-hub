export const DEFAULT_HOUSEHOLD_ID =
  process.env.HOUSEHOLD_ID?.trim() || "home";

export const DEFAULT_HOUSEHOLD_NAME =
  process.env.HOUSEHOLD_NAME?.trim() || "Home";

export const DATABASE_PROVIDER =
  process.env.DATABASE_PROVIDER?.trim().toLowerCase() || "sqlite";

export const POSTGRES_URL = process.env.POSTGRES_URL?.trim();

