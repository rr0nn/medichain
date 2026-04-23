/**
 * @fileoverview Formats knowledge-graph source metadata for compact UI display.
 * @contributors Johnson Zhang
 */

type SourceLabelInput = {
  sourceTitle: string;
  edition?: string;
  pageStart?: number;
  pageEnd?: number;
};

function formatEditionLabel(edition: string) {
  const trimmedEdition = edition.trim();

  if (!/^\d+$/.test(trimmedEdition)) {
    return trimmedEdition;
  }

  const numericEdition = Number(trimmedEdition);
  const lastTwoDigits = numericEdition % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${numericEdition}th edition`;
  }

  switch (numericEdition % 10) {
    case 1:
      return `${numericEdition}st edition`;
    case 2:
      return `${numericEdition}nd edition`;
    case 3:
      return `${numericEdition}rd edition`;
    default:
      return `${numericEdition}th edition`;
  }
}

export function formatSourceLabel(input: SourceLabelInput) {
  const titleWithEdition = input.edition
    ? `${input.sourceTitle}, ${formatEditionLabel(input.edition)}`
    : input.sourceTitle;

  if (
    input.pageStart !== undefined &&
    input.pageEnd !== undefined &&
    input.pageStart !== input.pageEnd
  ) {
    return `${titleWithEdition} (pp. ${input.pageStart}-${input.pageEnd})`;
  }

  if (input.pageStart !== undefined) {
    return `${titleWithEdition} (p. ${input.pageStart})`;
  }

  return titleWithEdition;
}
