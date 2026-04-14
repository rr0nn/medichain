/**
 * @fileoverview Houses small shared frontend helpers, including class name merging.
 * @contributors Johnson Zhang
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
