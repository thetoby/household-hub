import { NextResponse } from "next/server";
import { clearCheckedShoppingItems } from "@/lib/household-store";

export async function POST() {
  await clearCheckedShoppingItems();

  return new NextResponse(null, { status: 204 });
}
