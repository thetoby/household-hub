import { db, type CalendarEventRow, type ShoppingItemRow } from "@/lib/db";
import { DEFAULT_HOUSEHOLD_ID, DATABASE_PROVIDER } from "@/lib/env";
import {
  clearCheckedPostgresShoppingItems,
  createPostgresCalendarEvent,
  createPostgresShoppingItem,
  deletePostgresCalendarEvent,
  deletePostgresShoppingItem,
  getPostgresCalendarEvent,
  getPostgresShoppingItem,
  listPostgresCalendarEvents,
  listPostgresShoppingItems,
  updatePostgresCalendarEvent,
  updatePostgresShoppingItem,
} from "@/lib/postgres-db";

export type CalendarEventInput = {
  end?: string | null;
  start: string;
  title: string;
  type: string;
};

export type CalendarEventPatch = Partial<CalendarEventInput>;

export type ShoppingItemInput = {
  category?: string;
  label: string;
  quantity?: string;
};

export type ShoppingItemPatch = Partial<ShoppingItemInput> & {
  done?: boolean;
};

const usePostgres = DATABASE_PROVIDER === "postgres";

export async function listCalendarEvents() {
  if (usePostgres) {
    return listPostgresCalendarEvents();
  }

  return db
    .prepare(
      `SELECT household_id, id, title, start, end, type
       FROM calendar_events
       WHERE household_id = ?
       ORDER BY start ASC, created_at ASC`,
    )
    .all(DEFAULT_HOUSEHOLD_ID) as CalendarEventRow[];
}

export async function createCalendarEvent(input: CalendarEventInput) {
  if (usePostgres) {
    return createPostgresCalendarEvent(input);
  }

  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO calendar_events (id, household_id, title, start, end, type)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    DEFAULT_HOUSEHOLD_ID,
    input.title,
    input.start,
    input.end || null,
    input.type,
  );

  return getCalendarEvent(id);
}

export async function getCalendarEvent(id: string) {
  if (usePostgres) {
    return getPostgresCalendarEvent(id);
  }

  return db
    .prepare(
      `SELECT household_id, id, title, start, end, type
       FROM calendar_events
       WHERE household_id = ? AND id = ?`,
    )
    .get(DEFAULT_HOUSEHOLD_ID, id) as CalendarEventRow | undefined;
}

export async function updateCalendarEvent(id: string, patch: CalendarEventPatch) {
  if (usePostgres) {
    return updatePostgresCalendarEvent(id, patch);
  }

  const current = await getCalendarEvent(id);

  if (!current) {
    return undefined;
  }

  db.prepare(
    `UPDATE calendar_events
     SET title = ?, start = ?, end = ?, type = ?, updated_at = CURRENT_TIMESTAMP
     WHERE household_id = ? AND id = ?`,
  ).run(
    patch.title ?? current.title,
    patch.start ?? current.start,
    patch.end !== undefined ? patch.end || null : current.end,
    patch.type ?? current.type,
    DEFAULT_HOUSEHOLD_ID,
    id,
  );

  return getCalendarEvent(id);
}

export async function deleteCalendarEvent(id: string) {
  if (usePostgres) {
    return deletePostgresCalendarEvent(id);
  }

  db.prepare("DELETE FROM calendar_events WHERE household_id = ? AND id = ?").run(
    DEFAULT_HOUSEHOLD_ID,
    id,
  );
}

export async function listShoppingItems() {
  if (usePostgres) {
    return listPostgresShoppingItems();
  }

  const rows = db
    .prepare(
      `SELECT household_id, id, label, quantity, category, done
       FROM shopping_items
       WHERE household_id = ?
       ORDER BY done ASC, created_at DESC`,
    )
    .all(DEFAULT_HOUSEHOLD_ID) as ShoppingItemRow[];

  return rows.map(shoppingRowToDto);
}

export async function createShoppingItem(input: ShoppingItemInput) {
  if (usePostgres) {
    return createPostgresShoppingItem(input);
  }

  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO shopping_items (id, household_id, label, quantity, category)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    DEFAULT_HOUSEHOLD_ID,
    input.label,
    input.quantity || "1",
    input.category || "Food",
  );

  return getShoppingItem(id);
}

export async function getShoppingItem(id: string) {
  if (usePostgres) {
    return getPostgresShoppingItem(id);
  }

  const row = db
    .prepare(
      `SELECT household_id, id, label, quantity, category, done
       FROM shopping_items
       WHERE household_id = ? AND id = ?`,
    )
    .get(DEFAULT_HOUSEHOLD_ID, id) as ShoppingItemRow | undefined;

  return row ? shoppingRowToDto(row) : undefined;
}

export async function updateShoppingItem(id: string, patch: ShoppingItemPatch) {
  if (usePostgres) {
    return updatePostgresShoppingItem(id, patch);
  }

  const current = await getShoppingItem(id);

  if (!current) {
    return undefined;
  }

  db.prepare(
    `UPDATE shopping_items
     SET label = ?, quantity = ?, category = ?, done = ?, updated_at = CURRENT_TIMESTAMP
     WHERE household_id = ? AND id = ?`,
  ).run(
    patch.label ?? current.label,
    patch.quantity ?? current.quantity,
    patch.category ?? current.category,
    patch.done !== undefined ? Number(patch.done) : Number(current.done),
    DEFAULT_HOUSEHOLD_ID,
    id,
  );

  return getShoppingItem(id);
}

export async function deleteShoppingItem(id: string) {
  if (usePostgres) {
    return deletePostgresShoppingItem(id);
  }

  db.prepare("DELETE FROM shopping_items WHERE household_id = ? AND id = ?").run(
    DEFAULT_HOUSEHOLD_ID,
    id,
  );
}

export async function clearCheckedShoppingItems() {
  if (usePostgres) {
    return clearCheckedPostgresShoppingItems();
  }

  db.prepare("DELETE FROM shopping_items WHERE household_id = ? AND done = 1").run(
    DEFAULT_HOUSEHOLD_ID,
  );
}

function shoppingRowToDto(row: ShoppingItemRow) {
  return {
    ...row,
    done: Boolean(row.done),
  };
}
