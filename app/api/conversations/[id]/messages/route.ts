/**
 * @fileoverview Returns the saved message history for a single conversation.
 * @contributors Aryan Wadhawan
 */

import { NextResponse } from "next/server";
import { getMessages } from "@/server/db/conversations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await getMessages(id);
  return NextResponse.json(messages);
}
