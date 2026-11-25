// No '@/' imports here: unit-tested with node --test (bomView.test.ts).

/** Above this many lines the BOM opens with every cost group collapsed. */
export const COLLAPSE_ABOVE = 15;

/** Long quotations open collapsed (group header, total and line count only); short ones open in full. */
export const defaultCollapsed = (lineCount: number) => lineCount > COLLAPSE_ABOVE;

/** sessionStorage key of the collapsed groups of one quotation. */
export const collapseKey = (quotationId: string) => `quotation-collapsed:${quotationId}`;
