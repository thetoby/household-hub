import { NextResponse } from "next/server";
import { createCalendarEvent, listCalendarEvents } from "@/lib/household-store";

export async function GET() {
  return NextResponse.json(await listCalendarEvents());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    end?: string;
    start?: string;
    title?: string;
    type?: string;
  };

  if (!body.start || !body.title || !body.type) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  const event = await createCalendarEvent({
    end: body.end || null,
    start: body.start,
    title: body.title,
    type: body.type,
  });

  return NextResponse.json(event, { status: 201 });
}
