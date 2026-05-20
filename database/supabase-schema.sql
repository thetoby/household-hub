create table if not exists households (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references households(id) on delete cascade,
  title text not null,
  start text not null,
  "end" text,
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_household_start_idx
  on calendar_events (household_id, start);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references households(id) on delete cascade,
  label text not null,
  quantity text not null default '1',
  category text not null default 'Food',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_items_household_done_created_idx
  on shopping_items (household_id, done, created_at desc);

insert into households (id, name)
values ('home', 'Home')
on conflict (id) do nothing;

insert into calendar_events (household_id, title, start, type)
values
  ('home', 'Lisa working', '2026-05-21', 'work'),
  ('home', 'Boiler check', '2026-05-23', 'house')
on conflict do nothing;

insert into shopping_items (household_id, label, quantity, category)
values
  ('home', 'Milk', '2', 'Food'),
  ('home', 'Washing tablets', '1', 'House')
on conflict do nothing;
