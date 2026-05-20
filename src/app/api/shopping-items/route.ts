import { NextResponse } from "next/server";
import { createShoppingItem, listShoppingItems } from "@/lib/household-store";

export async function GET() {
  return NextResponse.json(await listShoppingItems());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    category?: string;
    label?: string;
    quantity?: string;
  };

  if (!body.label) {
    return NextResponse.json({ error: "Missing item label" }, { status: 400 });
  }

  const item = await createShoppingItem({
    category: body.category || "Food",
    label: body.label,
    quantity: body.quantity || "1",
  });

  return NextResponse.json(item, { status: 201 });
}
