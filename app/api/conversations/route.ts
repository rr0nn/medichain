import { NextResponse } from "next/server";
import {
  listConversations,
  createConversation,
} from "@/server/db/conversations";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { title?: string };
  const conversation = await createConversation(body.title);
  return NextResponse.json(conversation, { status: 201 });
}
