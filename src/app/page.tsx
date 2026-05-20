import HouseholdHub, { type Tab } from "./household-hub";

const tabs = new Set<Tab>(["calendar", "shopping", "settings"]);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab;
  const initialTab = tab && tabs.has(tab as Tab) ? (tab as Tab) : "calendar";
  const initialDate = new Date().toISOString().slice(0, 10);

  return <HouseholdHub initialDate={initialDate} initialTab={initialTab} />;
}
