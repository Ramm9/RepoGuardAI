
import { cn } from "@/lib/utils";
import { designSection } from "@/components/design/manifest";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Colour tokens.
 *
 * Values are duplicated here as display strings rather than read from the
 * stylesheet: this sheet's job is to state what the token is *meant* to be, so
 * a mismatch between this label and the rendered swatch is a real finding
 * rather than a tautology. The swatch itself is painted from the live token.
 */
interface Swatch {
  token: string;
  hex: string;
  usage: string;
}

const SURFACES: Swatch[] = [
  { token: "canvas", hex: "#070A0F", usage: "Page background" },
  { token: "surface", hex: "#0C1118", usage: "Sidebar, inputs, recessed areas" },
  { token: "card", hex: "#0F151E", usage: "Panels and cards" },
  { token: "elevated", hex: "#121A24", usage: "Hover, active nav, tracks" },
  { token: "overlay", hex: "#161F2B", usage: "Menus, tooltips, popovers" },
];

const LINES: Swatch[] = [
  { token: "border", hex: "#1B2530", usage: "Default hairline" },
  { token: "border-strong", hex: "#26323F", usage: "Hover, overlay edges" },
];

const TEXT: Swatch[] = [
  { token: "foreground", hex: "#F5F7FA", usage: "Primary text, headings" },
  { token: "muted-foreground", hex: "#9AA6B2", usage: "Body copy, labels" },
  { token: "faint", hex: "#66717D", usage: "Metadata, captions, hints" },
];

const ACCENT: Swatch[] = [
  { token: "accent", hex: "#22D3EE", usage: "Primary action, active state" },
  { token: "accent-strong", hex: "#06B6D4", usage: "Pressed, chart series" },
  { token: "accent-deep", hex: "#0E7490", usage: "Fills behind accent text" },
  { token: "accent-ink", hex: "#04161C", usage: "Text on accent fill" },
];

const RISK: Swatch[] = [
  { token: "risk-low", hex: "#34D399", usage: "LOW · score below 40" },
  { token: "risk-medium", hex: "#FBBF24", usage: "MEDIUM · 40 to 59" },
  { token: "risk-high", hex: "#FB923C", usage: "HIGH · 60 to 79" },
  { token: "risk-critical", hex: "#F85149", usage: "CRITICAL · 80 and above" },
];

const STATUS: Swatch[] = [
  { token: "success", hex: "#34D399", usage: "Healthy, connected, passing" },
  { token: "warning", hex: "#FBBF24", usage: "Degraded, needs attention" },
  { token: "danger", hex: "#F85149", usage: "Failed, destructive action" },
  { token: "info", hex: "#38BDF8", usage: "Neutral informational notice" },
];

function SwatchRow({ swatches }: { swatches: Swatch[] }) {
  return (
    <ul className="flex flex-col">
      {swatches.map((swatch) => (
        <li
          key={swatch.token}
          className="flex items-center gap-4 border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0"
        >
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-md border border-border-strong"
            style={{ backgroundColor: `var(--color-${swatch.token})` }}
          />
          <span className="w-40 shrink-0 font-mono text-xs text-foreground">
            {swatch.token}
          </span>
          <span className="w-20 shrink-0 font-mono text-xs uppercase text-faint">
            {swatch.hex}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {swatch.usage}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ColourSection() {
  return (
    <SpecSection meta={designSection("colour")}>
      <SpecRow
        label="Surfaces"
        hint="Five ascending steps. Elevation is a change of surface value, not a shadow."
      >
        <SwatchRow swatches={SURFACES} />
      </SpecRow>

      <SpecRow label="Borders" hint="Hairlines carry the structure of this product.">
        <SwatchRow swatches={LINES} />
      </SpecRow>

      <SpecRow
        label="Text"
        hint="Three tiers only. A fourth tier would blur the hierarchy rather than extend it."
      >
        <SwatchRow swatches={TEXT} />
      </SpecRow>

      <SpecRow
        label="Accent"
        hint="Used sparingly: the primary action, the active state, and the health ring."
      >
        <SwatchRow swatches={ACCENT} />
      </SpecRow>

      <SpecRow
        label="Risk scale"
        hint="Fixed mapping. These four colours mean the same thing on every screen."
      >
        <SwatchRow swatches={RISK} />
      </SpecRow>

      <SpecRow label="Status" hint="Operational state, distinct from predicted risk.">
        <SwatchRow swatches={STATUS} />
      </SpecRow>

      <SpecRow
        label="Restraint"
        hint="What the palette deliberately excludes."
        stack
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Background treatment</SpecLabel>
            <div
              className={cn(
                "mt-3 h-16 rounded-md border border-border",
                "grid-field bg-surface",
              )}
              aria-hidden="true"
            />
            <SpecNote className="mt-3">
              48px technical grid at low opacity. Texture, not a gradient.
            </SpecNote>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Hairline divider</SpecLabel>
            <div className="mt-3 flex h-16 items-center">
              <div className="hairline h-px w-full" aria-hidden="true" />
            </div>
            <SpecNote className="mt-3">
              Fades at both ends. Separates without drawing a hard box.
            </SpecNote>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
