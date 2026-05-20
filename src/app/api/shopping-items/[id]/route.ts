import { NextResponse } from "next/server";
import {
  deleteShoppingItem,
  updateShoppingItem,
} from "@/lib/household-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    category?: string;
    done?: boolean;
    label?: string;
    quantity?: string;
  };

  const item = await updateShoppingItem(id, body);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await deleteShoppingItem(id);

  return new NextResponse(null, { status: 204 });
}
