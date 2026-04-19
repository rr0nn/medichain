/**
 * @fileoverview Formats differential-diagnosis names for display.
 */

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function formatDdxName(value: string) {
  const cleaned = value
    .replace(/\s*\((?:fig(?:ure)?|figs?)\.?\s*[\w.-]+\)\s*$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return cleaned;
  }

  // Convert fully upper-case canonical labels like "INFECTIOUS" into display text.
  if (cleaned === cleaned.toUpperCase()) {
    return toTitleCase(cleaned.toLowerCase());
  }

  // Promote fully lower-case canonical labels like "infectious" into display text.
  if (cleaned === cleaned.toLowerCase()) {
    return toTitleCase(cleaned);
  }

  // Preserve mixed-case labels that already look intentional.
  return cleaned;
}
