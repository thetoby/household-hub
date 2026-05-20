import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_HOUSEHOLD_ID, DEFAULT_HOUSEHOLD_NAME } from "@/lib/env";

export type CalendarEventRow = {
  household_id: string;
  id: string;
  title: string;
  start: string;
  end: string | null;
  type: string;
};

export type ShoppingItemRow = {
  household_id: string;
  id: string;
  label: string;
  quantity: string;
  category: string;
  done: number;
};

const dataDir = path.join(process.cwd(), "data");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, "household.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL DEFAULT 'home',
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL DEFAULT 'home',
    label TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '1',
    category TEXT NOT NULL DEFAULT 'Food',
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function tableHasColumn(table: string, column: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;

  return columns.some((candidate) => candidate.name === column);
}

if (!tableHasColumn("calendar_events", "household_id")) {
  db.prepare(
    "ALTER TABLE calendar_events ADD COLUMN household_id TEXT NOT NULL DEFAULT 'home'",
  ).run();
}

if (!tableHasColumn("shopping_items", "household_id")) {
  db.prepare(
    "ALTER TABLE shopping_items ADD COLUMN household_id TEXT NOT NULL DEFAULT 'home'",
  ).run();
}

db.prepare(
  `INSERT OR IGNORE INTO households (id, name) VALUES (?, ?)`,
).run(DEFAULT_HOUSEHOLD_ID, DEFAULT_HOUSEHOLD_NAME);

const eventCount = db
  .prepare("SELECT COUNT(*) as count FROM calendar_events")
  .get() as { count: number };

if (eventCount.count === 0) {
  db.prepare(
    "INSERT INTO calendar_events (id, household_id, title, start, type) VALUES (?, ?, ?, ?, ?)",
  ).run("work-1", DEFAULT_HOUSEHOLD_ID, "Lisa working", "2026-05-21", "work");
  db.prepare(
    "INSERT INTO calendar_events (id, household_id, title, start, type) VALUES (?, ?, ?, ?, ?)",
  ).run("event-1", DEFAULT_HOUSEHOLD_ID, "Boiler check", "2026-05-23", "house");
}

const shoppingCount = db
  .prepare("SELECT COUNT(*) as count FROM shopping_items")
  .get() as { count: number };

if (shoppingCount.count === 0) {
  db.prepare(
    "INSERT INTO shopping_items (id, household_id, label, quantity, category) VALUES (?, ?, ?, ?, ?)",
  ).run("shop-1", DEFAULT_HOUSEHOLD_ID, "Milk", "2", "Food");
  db.prepare(
    "INSERT INTO shopping_items (id, household_id, label, quantity, category) VALUES (?, ?, ?, ?, ?)",
  ).run("shop-2", DEFAULT_HOUSEHOLD_ID, "Washing tablets", "1", "House");
}

export { db };
