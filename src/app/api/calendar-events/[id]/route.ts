import { NextResponse } from "next/server";
import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/household-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    end?: string | null;
    start?: string;
    title?: string;
    type?: string;
  };

  const event = await updateCalendarEvent(id, body);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await deleteCalendarEvent(id);

  return new NextResponse(null, { status: 204 });
}
