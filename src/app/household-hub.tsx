"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  ListPlus,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";

export type Tab = "calendar" | "shopping" | "settings";

type HouseholdEvent = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  type: "work" | "harlyn" | "house" | "appointment";
};

type ShoppingItem = {
  id: string;
  label: string;
  quantity: string;
  category: "Food" | "House" | "Other";
  done: boolean;
};

const initialEvents: HouseholdEvent[] = [
  {
    id: "work-1",
    title: "Lisa working",
    start: "2026-05-21",
    type: "work",
  },
  {
    id: "event-1",
    title: "Boiler check",
    start: "2026-05-23",
    type: "house",
  },
];

const initialShopping: ShoppingItem[] = [
  {
    id: "shop-1",
    label: "Milk",
    quantity: "2",
    category: "Food",
    done: false,
  },
  {
    id: "shop-2",
    label: "Washing tablets",
    quantity: "1",
    category: "House",
    done: false,
  },
];

const eventColors = {
  work: "#2563eb",
  harlyn: "#0f766e",
  house: "#0f766e",
  appointment: "#b45309",
};

export default function HouseholdHub({
  initialDate,
  initialTab,
}: {
  initialDate: string;
  initialTab: Tab;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [events, setEvents] = useState<HouseholdEvent[]>(initialEvents);
  const [shopping, setShopping] = useState<ShoppingItem[]>(initialShopping);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<HouseholdEvent["type"]>("house");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(
    startOfMonth(fromDateInputValue(initialDate)),
  );
  const [itemLabel, setItemLabel] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    async function loadData() {
      const [eventResponse, shoppingResponse] = await Promise.all([
        fetch("/api/calendar-events"),
        fetch("/api/shopping-items"),
      ]);

      if (eventResponse.ok) {
        setEvents((await eventResponse.json()) as HouseholdEvent[]);
      }

      if (shoppingResponse.ok) {
        setShopping((await shoppingResponse.json()) as ShoppingItem[]);
      }

      setHasLoadedData(true);
    }

    void loadData();
  }, [isMounted]);

  const pendingCount = shopping.filter((item) => !item.done).length;
  const workDays = events.filter((event) => event.type === "work").length;
  const selectedDateIsWorkDay = events.some(
    (event) => event.type === "work" && event.start === selectedDate,
  );
  const selectedDateHasHarlynStay = events.some(
    (event) => event.type === "harlyn" && eventSpansDate(event, selectedDate),
  );

  async function addEvent() {
    const trimmedTitle = eventTitle.trim();

    if (!trimmedTitle || eventType === "work" || eventType === "harlyn") {
      return;
    }

    const response = await fetch("/api/calendar-events", {
      body: JSON.stringify({
        start: selectedDate,
        title: trimmedTitle,
        type: eventType,
      }),
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const event = (await response.json()) as HouseholdEvent;

    setEvents((current) => [...current, event]);
    setEventTitle("");
  }

  function handleDateClick(date: string) {
    setSelectedDate(date);
  }

  async function toggleWorkDay() {
    const existingEvents = events.filter(
      (event) => event.type === "work" && event.start === selectedDate,
    );

    if (existingEvents.length > 0) {
      await Promise.all(
        existingEvents.map((event) =>
          fetch(`/api/calendar-events/${event.id}`, { method: "DELETE" }),
        ),
      );
      setEvents((current) =>
        current.filter(
          (event) => event.type !== "work" || event.start !== selectedDate,
        ),
      );
      return;
    }

    const response = await fetch("/api/calendar-events", {
      body: JSON.stringify({
        start: selectedDate,
        title: "Lisa working",
        type: "work",
      }),
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const event = (await response.json()) as HouseholdEvent;

    setEvents((current) => [...current, event]);
  }

  async function toggleHarlynStay() {
    const existingStay = events.find(
      (event) => event.type === "harlyn" && eventSpansDate(event, selectedDate),
    );

    if (existingStay) {
      await fetch(`/api/calendar-events/${existingStay.id}`, {
        method: "DELETE",
      });
      setEvents((current) =>
        current.filter((event) => event.id !== existingStay.id),
      );
      return;
    }

    const response = await fetch("/api/calendar-events", {
      body: JSON.stringify({
        end: addDays(selectedDate, 1),
        start: selectedDate,
        title: "Harlyn",
        type: "harlyn",
      }),
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const event = (await response.json()) as HouseholdEvent;

    setEvents((current) => [...current, event]);
  }

  async function moveEvent(eventId: string, date: string) {
    const event = events.find((candidate) => candidate.id === eventId);

    if (!event) {
      return;
    }

    const duration = eventDurationDays(event);
    const patch = {
      end: duration > 1 ? addDays(date, duration - 1) : null,
      start: date,
    };

    const response = await fetch(`/api/calendar-events/${eventId}`, {
      body: JSON.stringify(patch),
      method: "PATCH",
    });

    if (!response.ok) {
      return;
    }

    const updatedEvent = (await response.json()) as HouseholdEvent;

    setEvents((current) =>
      current.map((candidate) => {
        return candidate.id === eventId ? updatedEvent : candidate;
      }),
    );
  }

  async function removeEvent(eventId: string) {
    await fetch(`/api/calendar-events/${eventId}`, { method: "DELETE" });
    setEvents((current) => current.filter((event) => event.id !== eventId));
  }

  async function resizeEvent(eventId: string, delta: number) {
    const event = events.find((candidate) => candidate.id === eventId);

    if (!event) {
      return;
    }

    const nextDuration = Math.max(1, eventDurationDays(event) + delta);
    const response = await fetch(`/api/calendar-events/${eventId}`, {
      body: JSON.stringify({
        end: nextDuration > 1 ? addDays(event.start, nextDuration - 1) : null,
      }),
      method: "PATCH",
    });

    if (!response.ok) {
      return;
    }

    const updatedEvent = (await response.json()) as HouseholdEvent;

    setEvents((current) =>
      current.map((candidate) => {
        return candidate.id === eventId ? updatedEvent : candidate;
      }),
    );
  }

  async function addShoppingItem() {
    const trimmedLabel = itemLabel.trim();

    if (!trimmedLabel) {
      return;
    }

    const response = await fetch("/api/shopping-items", {
      body: JSON.stringify({
        label: trimmedLabel,
        quantity: itemQuantity.trim() || "1",
        category: "Food",
      }),
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const item = (await response.json()) as ShoppingItem;

    setShopping((current) => [item, ...current]);
    setItemLabel("");
    setItemQuantity("1");
  }

  async function toggleShoppingItem(item: ShoppingItem) {
    const response = await fetch(`/api/shopping-items/${item.id}`, {
      body: JSON.stringify({ done: !item.done }),
      method: "PATCH",
    });

    if (!response.ok) {
      return;
    }

    const updatedItem = (await response.json()) as ShoppingItem;

    setShopping((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? updatedItem : candidate,
      ),
    );
  }

  async function removeShoppingItem(itemId: string) {
    await fetch(`/api/shopping-items/${itemId}`, { method: "DELETE" });
    setShopping((current) =>
      current.filter((candidate) => candidate.id !== itemId),
    );
  }

  async function clearCheckedShoppingItems() {
    await fetch("/api/shopping-items/clear-checked", { method: "POST" });
    setShopping((current) => current.filter((item) => !item.done));
  }

  if (!isMounted || !hasLoadedData) {
    return (
      <main className="min-h-screen bg-[#f6f3ee] text-stone-950">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300/80 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-stone-950 text-white shadow-sm">
              <Home size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Household Hub
              </h1>
              <p className="text-sm text-stone-600">
                Shared calendar and shopping control panel
              </p>
            </div>
          </div>

          <nav className="grid grid-cols-3 gap-2 rounded-lg border border-stone-300 bg-white/70 p-1 shadow-sm backdrop-blur">
            <TabButton
              active={activeTab === "calendar"}
              href="/?tab=calendar"
              icon={<CalendarDays size={18} />}
              label="Calendar"
              onClick={() => setActiveTab("calendar")}
            />
            <TabButton
              active={activeTab === "shopping"}
              href="/?tab=shopping"
              icon={<ShoppingCart size={18} />}
              label="Shopping"
              onClick={() => setActiveTab("shopping")}
            />
            <TabButton
              active={activeTab === "settings"}
              href="/?tab=settings"
              icon={<Settings size={18} />}
              label="Settings"
              onClick={() => setActiveTab("settings")}
            />
          </nav>
        </header>

        <section className="grid gap-3 py-4 sm:grid-cols-3">
          <Stat label="Working days" value={workDays} />
          <Stat label="Shopping items" value={pendingCount} />
          <Stat label="Next step" value="Database" />
        </section>

        <>
          {activeTab === "calendar" && (
            <section
              key="calendar"
              className="grid flex-1 gap-4 lg:grid-cols-[1fr_340px]"
            >
              <HouseholdCalendar
                events={events}
                month={calendarMonth}
                onDateClick={handleDateClick}
                onMonthChange={setCalendarMonth}
                onMoveEvent={moveEvent}
                onRemoveEvent={removeEvent}
                onResizeEvent={resizeEvent}
                selectedDate={selectedDate}
              />

              <ControlPanel
                eventTitle={eventTitle}
                eventType={eventType}
                hasHarlynStay={selectedDateHasHarlynStay}
                isWorkDay={selectedDateIsWorkDay}
                onAddEvent={addEvent}
                onEventTitle={setEventTitle}
                onEventType={setEventType}
                onSelectedDate={setSelectedDate}
                onToggleHarlynStay={toggleHarlynStay}
                onToggleWorkDay={toggleWorkDay}
                selectedDate={selectedDate}
              />
            </section>
          )}

          {activeTab === "shopping" && (
            <section
              key="shopping"
              className="grid flex-1 gap-4 lg:grid-cols-[360px_1fr]"
            >
              <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Add item</h2>
                <div className="mt-4 grid gap-3">
                  <input
                    className="input"
                    onChange={(event) => setItemLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addShoppingItem();
                    }}
                    placeholder="What do we need?"
                    value={itemLabel}
                  />
                  <input
                    className="input"
                    onChange={(event) => setItemQuantity(event.target.value)}
                    placeholder="Quantity"
                    value={itemQuantity}
                  />
                  <MotionButton onClick={addShoppingItem}>
                    <ListPlus size={18} />
                    Add to list
                  </MotionButton>
                </div>
              </div>

              <div className="rounded-lg border border-stone-300 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                  <h2 className="text-lg font-semibold">Shopping list</h2>
                  <button
                    className="icon-button"
                    onClick={clearCheckedShoppingItems}
                    title="Clear checked items"
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <ul className="divide-y divide-stone-200">
                  {shopping.map((item) => (
                    <li
                      className="flex items-center gap-3 px-4 py-3"
                      key={item.id}
                    >
                      <button
                        className={clsx(
                          "grid size-9 shrink-0 place-items-center rounded-lg border transition",
                          item.done
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-stone-300 bg-white hover:border-stone-500",
                        )}
                        onClick={() => void toggleShoppingItem(item)}
                        title={item.done ? "Mark as needed" : "Mark bought"}
                        type="button"
                      >
                        {item.done && <Check size={18} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={clsx(
                            "truncate font-medium",
                            item.done && "text-stone-400 line-through",
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="text-sm text-stone-500">
                          {item.quantity} - {item.category}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => void removeShoppingItem(item.id)}
                        title="Delete item"
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {activeTab === "settings" && (
            <section
              key="settings"
              className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">Project checkpoints</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {["Local UI", "Database", "Auth", "Deploy"].map(
                  (checkpoint, index) => (
                    <div
                      className="rounded-lg border border-stone-200 bg-stone-50 p-4"
                      key={checkpoint}
                    >
                      <p className="text-sm font-medium text-stone-500">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 font-semibold">{checkpoint}</p>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </>
      </div>
    </main>
  );
}

function ControlPanel({
  eventTitle,
  eventType,
  hasHarlynStay,
  isWorkDay,
  onAddEvent,
  onEventTitle,
  onEventType,
  onSelectedDate,
  onToggleHarlynStay,
  onToggleWorkDay,
  selectedDate,
}: {
  eventTitle: string;
  eventType: HouseholdEvent["type"];
  hasHarlynStay: boolean;
  isWorkDay: boolean;
  onAddEvent: () => void;
  onEventTitle: (value: string) => void;
  onEventType: (value: HouseholdEvent["type"]) => void;
  onSelectedDate: (value: string) => void;
  onToggleHarlynStay: () => void;
  onToggleWorkDay: () => void;
  selectedDate: string;
}) {
  return (
    <aside className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Calendar controls</h2>
      <div className="mt-4 grid gap-3">
        <label className="field-label" htmlFor="event-date">
          Date
        </label>
        <input
          className="input"
          id="event-date"
          onChange={(event) => onSelectedDate(event.target.value)}
          type="date"
          value={selectedDate}
        />

        <label className="field-label" htmlFor="event-title">
          Event
        </label>
        <input
          className="input"
          id="event-title"
          onChange={(event) => onEventTitle(event.target.value)}
          placeholder="Boiler check"
          value={eventTitle}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            className={clsx(
              "rounded-lg border px-3 py-2 text-sm font-medium transition",
              isWorkDay
                ? "border-sky-700 bg-sky-100 text-sky-950"
                : "border-stone-300 bg-white hover:border-stone-500",
            )}
            onClick={onToggleWorkDay}
            type="button"
          >
            Work
          </button>
          <button
            className={clsx(
              "rounded-lg border px-3 py-2 text-sm font-medium transition",
              hasHarlynStay
                ? "border-teal-700 bg-teal-100 text-teal-950"
                : "border-teal-300 bg-teal-50 text-teal-950 hover:border-teal-500",
            )}
            onClick={onToggleHarlynStay}
            type="button"
          >
            Harlyn
          </button>
          {(["house", "appointment"] as const).map((type) => (
            <button
              className={clsx(
                "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition",
                eventType === type
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-300 bg-white hover:border-stone-500",
              )}
              key={type}
              onClick={() => onEventType(type)}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>

        <MotionButton onClick={onAddEvent}>
          <Plus size={18} />
          Add event
        </MotionButton>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-600">
        Click a date, then use Work to toggle Lisa&apos;s shift. Add events for
        everything else.
      </p>
    </aside>
  );
}

function HouseholdCalendar({
  events,
  month,
  onDateClick,
  onMonthChange,
  onMoveEvent,
  onRemoveEvent,
  onResizeEvent,
  selectedDate,
}: {
  events: HouseholdEvent[];
  month: Date;
  onDateClick: (date: string) => void;
  onMonthChange: (month: Date) => void;
  onMoveEvent: (eventId: string, date: string) => void;
  onRemoveEvent: (eventId: string) => void;
  onResizeEvent: (eventId: string, delta: number) => void;
  selectedDate: string;
}) {
  const days = calendarDays(month);
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <p className="text-sm text-stone-500">Click a day, then add or drag.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="icon-button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            title="Previous month"
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold transition hover:border-stone-500"
            onClick={() => onMonthChange(startOfMonth(fromDateInputValue(today())))}
            type="button"
          >
            Today
          </button>
          <button
            className="icon-button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            title="Next month"
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-semibold uppercase text-stone-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div className="px-2 py-3" key={day}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-[560px] grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            eventSpansDate(event, day.iso),
          );
          const hasWorkEvent = dayEvents.some((event) => event.type === "work");
          const visibleEvents = dayEvents.filter(
            (event) => event.type !== "work",
          );

          return (
            <div
              className={clsx(
                "min-h-28 border-b border-r border-stone-200 p-2 text-left align-top transition",
                hasWorkEvent ? "bg-sky-100 hover:bg-sky-200/70" : "bg-white hover:bg-stone-50",
                !day.currentMonth && "bg-stone-50/70 text-stone-400",
                hasWorkEvent && !day.currentMonth && "bg-sky-50 text-stone-500",
                selectedDate === day.iso &&
                  (hasWorkEvent
                    ? "ring-2 ring-inset ring-sky-700"
                    : "ring-2 ring-inset ring-stone-950"),
              )}
              key={day.iso}
              onClick={() => onDateClick(day.iso)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const eventId = event.dataTransfer.getData("text/plain");
                if (eventId) onMoveEvent(eventId, day.iso);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDateClick(day.iso);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="text-sm font-semibold">{day.label}</span>
              <span className="mt-2 grid gap-1">
                {visibleEvents.map((event) => (
                  <span
                    className={clsx(
                      "group flex cursor-grab items-center justify-between gap-2 rounded-md px-2 py-1 text-xs font-semibold shadow-sm",
                      event.type === "harlyn"
                        ? "border border-teal-700 bg-teal-700 text-white"
                        : "text-white",
                    )}
                    draggable
                    key={event.id}
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                    onDragStart={(dragEvent) => {
                      dragEvent.dataTransfer.setData("text/plain", event.id);
                    }}
                    style={
                      event.type === "harlyn"
                        ? undefined
                        : { backgroundColor: eventColors[event.type] }
                    }
                  >
                    <span className="truncate">{event.title}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {event.type === "harlyn" && event.start === day.iso && (
                        <>
                          <button
                            aria-label="Shorten stay"
                            className="grid size-5 place-items-center rounded bg-white/20 text-white"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              onResizeEvent(event.id, -1);
                            }}
                            type="button"
                          >
                            -
                          </button>
                          <button
                            aria-label="Extend stay"
                            className="grid size-5 place-items-center rounded bg-white/20 text-white"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              onResizeEvent(event.id, 1);
                            }}
                            type="button"
                          >
                            +
                          </button>
                        </>
                      )}
                      <button
                        className={clsx(
                          "grid size-5 place-items-center rounded opacity-0 transition group-hover:opacity-100",
                          event.type === "harlyn"
                            ? "bg-white/20 text-white"
                            : "bg-black/15",
                        )}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onRemoveEvent(event.id);
                        }}
                        title="Remove event"
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({
  active,
  href,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      className={clsx(
        "flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition",
        active
          ? "bg-stone-950 text-white"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
      )}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        window.history.pushState(null, "", href);
        onClick();
      }}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-stone-300 bg-white/80 px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MotionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(dateValue: string, amount: number) {
  const date = fromDateInputValue(dateValue);
  date.setDate(date.getDate() + amount);

  return toDateInputValue(date);
}

function eventDurationDays(event: HouseholdEvent) {
  if (!event.end) {
    return 1;
  }

  const start = fromDateInputValue(event.start);
  const end = fromDateInputValue(event.end);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1);
}

function eventSpansDate(event: HouseholdEvent, dateValue: string) {
  if (!event.end) {
    return event.start === dateValue;
  }

  return event.start <= dateValue && dateValue <= event.end;
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const firstDayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstDayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      currentMonth: date.getMonth() === month.getMonth(),
      iso: toDateInputValue(date),
      label: date.getDate(),
    };
  });
}

function fromDateInputValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
