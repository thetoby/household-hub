import postgres from "postgres";
import {
  DEFAULT_HOUSEHOLD_ID,
  DEFAULT_HOUSEHOLD_NAME,
  POSTGRES_URL,
} from "@/lib/env";
import type { CalendarEventRow, ShoppingItemRow } from "@/lib/db";
import type {
  CalendarEventInput,
  CalendarEventPatch,
  ShoppingItemInput,
  ShoppingItemPatch,
} from "@/lib/household-store";

const globalForPostgres = globalThis as unknown as {
  householdSql?: postgres.Sql;
  householdSchemaReady?: Promise<void>;
};

function getSql() {
  if (!POSTGRES_URL) {
    throw new Error("POSTGRES_URL is required when DATABASE_PROVIDER=postgres");
  }

  globalForPostgres.householdSql ??= postgres(POSTGRES_URL, {
    max: 3,
    prepare: false,
    ssl: "require",
  });

  return globalForPostgres.householdSql;
}

async function ensureSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      "end" TEXT,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      quantity TEXT NOT NULL DEFAULT '1',
      category TEXT NOT NULL DEFAULT 'Food',
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS calendar_events_household_start_idx
    ON calendar_events (household_id, start)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS shopping_items_household_done_idx
    ON shopping_items (household_id, done, created_at)
  `;

  await sql`
    INSERT INTO households (id, name)
    VALUES (${DEFAULT_HOUSEHOLD_ID}, ${DEFAULT_HOUSEHOLD_NAME})
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = NOW()
  `;
}

async function ready() {
  globalForPostgres.householdSchemaReady ??= ensureSchema();
  await globalForPostgres.householdSchemaReady;
}

export async function listPostgresCalendarEvents() {
  await ready();
  const sql = getSql();

  return (await sql`
    SELECT household_id, id, title, start, "end", type
    FROM calendar_events
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
    ORDER BY start ASC, created_at ASC
  `) as CalendarEventRow[];
}

export async function createPostgresCalendarEvent(input: CalendarEventInput) {
  await ready();
  const sql = getSql();

  const id = crypto.randomUUID();

  await sql`
    INSERT INTO calendar_events (id, household_id, title, start, "end", type)
    VALUES (
      ${id},
      ${DEFAULT_HOUSEHOLD_ID},
      ${input.title},
      ${input.start},
      ${input.end || null},
      ${input.type}
    )
  `;

  return getPostgresCalendarEvent(id);
}

export async function getPostgresCalendarEvent(id: string) {
  await ready();
  const sql = getSql();

  const rows = (await sql`
    SELECT household_id, id, title, start, "end", type
    FROM calendar_events
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `) as CalendarEventRow[];

  return rows[0];
}

export async function updatePostgresCalendarEvent(
  id: string,
  patch: CalendarEventPatch,
) {
  const sql = getSql();
  const current = await getPostgresCalendarEvent(id);

  if (!current) {
    return undefined;
  }

  await sql`
    UPDATE calendar_events
    SET title = ${patch.title ?? current.title},
        start = ${patch.start ?? current.start},
        "end" = ${patch.end !== undefined ? patch.end || null : current.end},
        type = ${patch.type ?? current.type},
        updated_at = NOW()
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `;

  return getPostgresCalendarEvent(id);
}

export async function deletePostgresCalendarEvent(id: string) {
  await ready();
  const sql = getSql();

  await sql`
    DELETE FROM calendar_events
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `;
}

export async function listPostgresShoppingItems() {
  await ready();
  const sql = getSql();

  const rows = (await sql`
    SELECT household_id, id, label, quantity, category, done
    FROM shopping_items
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
    ORDER BY done ASC, created_at DESC
  `) as ShoppingItemRow[];

  return rows.map(shoppingRowToDto);
}

export async function createPostgresShoppingItem(input: ShoppingItemInput) {
  await ready();
  const sql = getSql();

  const id = crypto.randomUUID();

  await sql`
    INSERT INTO shopping_items (id, household_id, label, quantity, category)
    VALUES (
      ${id},
      ${DEFAULT_HOUSEHOLD_ID},
      ${input.label},
      ${input.quantity || "1"},
      ${input.category || "Food"}
    )
  `;

  return getPostgresShoppingItem(id);
}

export async function getPostgresShoppingItem(id: string) {
  await ready();
  const sql = getSql();

  const rows = (await sql`
    SELECT household_id, id, label, quantity, category, done
    FROM shopping_items
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `) as ShoppingItemRow[];

  return rows[0] ? shoppingRowToDto(rows[0]) : undefined;
}

export async function updatePostgresShoppingItem(
  id: string,
  patch: ShoppingItemPatch,
) {
  const sql = getSql();
  const current = await getPostgresShoppingItem(id);

  if (!current) {
    return undefined;
  }

  await sql`
    UPDATE shopping_items
    SET label = ${patch.label ?? current.label},
        quantity = ${patch.quantity ?? current.quantity},
        category = ${patch.category ?? current.category},
        done = ${patch.done ?? current.done},
        updated_at = NOW()
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `;

  return getPostgresShoppingItem(id);
}

export async function deletePostgresShoppingItem(id: string) {
  await ready();
  const sql = getSql();

  await sql`
    DELETE FROM shopping_items
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND id = ${id}
  `;
}

export async function clearCheckedPostgresShoppingItems() {
  await ready();
  const sql = getSql();

  await sql`
    DELETE FROM shopping_items
    WHERE household_id = ${DEFAULT_HOUSEHOLD_ID}
      AND done = TRUE
  `;
}

function shoppingRowToDto(row: ShoppingItemRow) {
  return {
    ...row,
    done: Boolean(row.done),
  };
}
