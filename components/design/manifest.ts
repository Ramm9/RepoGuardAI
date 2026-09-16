/**
 * The design sheet's table of contents.
 *
 * Section identity lives here rather than inside each section component, so the
 * navigation rail and the rendered headings can never drift apart. Order is
 * owned by this array; each section module looks itself up by id.
 */
export interface DesignSectionMeta {
  id: string;
  /** Two-digit index, rendered in monospace beside the heading. */
  index: string;
  title: string;
  description: string;
}

export const DESIGN_SECTIONS: DesignSectionMeta[] = [
  {
    id: "colour",
    index: "01",
    title: "Colour",
    description:
      "Every surface, border, and text tier is a token. Components consume tokens; no component declares a raw hex value.",
  },
  {
    id: "typography",
    index: "02",
    title: "Typography",
    description:
      "Geist for interface text. JetBrains Mono for anything read as code or compared as a value — SHAs, paths, branches, scores.",
  },
  {
    id: "layout",
    index: "03",
    title: "Spacing, radius, elevation",
    description:
      "An 8px base with a fixed step set. Radii stay small and elevation is expressed by surface value, not by shadow.",
  },
  {
    id: "risk",
    index: "04",
    title: "Risk language",
    description:
      "The four-level scale, its numeric thresholds, and the rule that governs every risk surface in the product: icon plus text plus colour, never colour alone.",
  },
  {
    id: "scores",
    index: "05",
    title: "Scores and gauges",
    description:
      "The repository health ring and the commit risk breakdown — the two figures the product is judged on.",
  },
  {
    id: "buttons",
    index: "06",
    title: "Buttons",
    description:
      "Six variants across six sizes. Heights step 28 / 32 / 36 / 40px so controls align on the same baseline grid as text.",
  },
  {
    id: "badges",
    index: "07",
    title: "Badges, status, identity",
    description:
      "Metadata chips, live status dots, and the deterministic avatar monogram used when a GitHub image is missing.",
  },
  {
    id: "forms",
    index: "08",
    title: "Form controls",
    description:
      "Inputs, selects, toggles, and the field scaffold that keeps label, control, hint, and error consistently spaced.",
  },
  {
    id: "data",
    index: "09",
    title: "Data display",
    description:
      "Metric tiles, score bars, stat rows, dense tables, and the two navigation controls — view tabs and value pickers.",
  },
  {
    id: "overlays",
    index: "10",
    title: "Overlays",
    description:
      "Dialog, dropdown, popover, and tooltip. Tooltips carry real information here, so they are set for reading rather than for a single cramped line.",
  },
  {
    id: "states",
    index: "11",
    title: "Loading, empty, error",
    description:
      "No bare spinners and no raw API errors. Every absence and every failure has designed copy and a recovery path.",
  },
  {
    id: "utilities",
    index: "12",
    title: "Formatters",
    description:
      "The shared value formatters. Time-dependent output is computed after mount so server and client markup always agree.",
  },
];

/** Look up a section's metadata, failing loudly on a typo. */
export function designSection(id: string): DesignSectionMeta {
  const found = DESIGN_SECTIONS.find((section) => section.id === id);
  if (!found) {
    throw new Error(
      `Unknown design section "${id}". Add it to DESIGN_SECTIONS in components/design/manifest.ts.`,
    );
  }
  return found;
}
