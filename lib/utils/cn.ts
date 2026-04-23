/**
 * @fileoverview Houses the shared class name merging helper used across the frontend.
 * @contributors Johnson Zhang
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
