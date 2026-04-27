/**
 * @fileoverview Returns the backend-driven model catalog used by the model selectors.
 * @contributors Johnson Zhang
 */

import { NextResponse } from "next/server";

import { getModelCatalog } from "@/server/ai/core/models";

export async function GET() {
  return NextResponse.json(getModelCatalog());
}
