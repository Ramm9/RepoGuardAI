
import { designSection } from "@/components/design/manifest";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Spacing, radii, and elevation.
 *
 * The spacing steps are rendered as measured bars rather than described, so the
 * scale can be judged at a glance: the jump from 24 to 32 is meant to be visible,
 * and the absence of a 20px or 28px step is deliberate.
 */
const SPACING_STEPS = [8, 12, 16, 24, 32, 40, 48, 64, 80, 96];

const RADII = [
  { token: "xs", px: "3px", usage: "Checkbox, tiny chips" },
  { token: "sm", px: "4px", usage: "Badges, small buttons" },
  { token: "md", px: "6px", usage: "Buttons, inputs, menus" },
  { token: "lg", px: "8px", usage: "Cards, panels" },
  { token: "xl", px: "10px", usage: "Dialogs on desktop" },
  { token: "2xl", px: "14px", usage: "Mobile bottom sheet" },
];

export function LayoutSection() {
  return (
    <SpecSection meta={designSection("layout")}>
      <SpecRow
        label="Spacing scale"
        hint="8px base. The named steps are the whole vocabulary — arbitrary values are a last resort, not a style choice."
      >
        <ul className="flex flex-col gap-2">
          {SPACING_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-4">
              <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-faint">
                {step}px
              </span>
              <span
                aria-hidden="true"
                className="h-2 shrink-0 rounded-sm bg-accent/45"
                style={{ width: `${step}px` }}
              />
              <span className="font-mono text-[11px] text-faint">
                gap-{step / 4} · p-{step / 4}
              </span>
            </li>
          ))}
        </ul>
        <SpecNote className="mt-4">
          Used for: 8 first-level gaps · 12 stacked controls · 16 panel padding ·
          24 block gap · 32 page gutter · 48–96 section rhythm.
        </SpecNote>
      </SpecRow>

      <SpecRow label="Radii" hint="Restrained. Large radii read as consumer software.">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {RADII.map((radius) => (
            <li key={radius.token} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-10 shrink-0 border border-border-strong bg-elevated"
                style={{ borderRadius: `var(--radius-${radius.token})` }}
              />
              <div className="min-w-0">
                <p className="font-mono text-xs text-foreground">
                  {radius.token} · {radius.px}
                </p>
                <p className="text-[11px] text-faint">{radius.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </SpecRow>

      <SpecRow
        label="Elevation"
        hint="Expressed as a surface step. Only overlays and the elevated card carry a shadow."
      >
        <div className="flex flex-wrap items-stretch gap-3">
          {[
            { name: "card", cls: "bg-card", note: "Default panel" },
            { name: "elevated", cls: "bg-elevated", note: "Hover / active" },
            { name: "overlay", cls: "bg-overlay", note: "Menus, tooltips" },
          ].map((surface) => (
            <div
              key={surface.name}
              className={`flex h-24 w-40 flex-col justify-between rounded-lg border border-border p-3 ${surface.cls}`}
            >
              <span className="font-mono text-[11px] text-foreground">
                bg-{surface.name}
              </span>
              <span className="text-[11px] text-faint">{surface.note}</span>
            </div>
          ))}

          <div className="flex h-24 w-40 flex-col justify-between rounded-lg border border-border bg-elevated p-3 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            <span className="font-mono text-[11px] text-foreground">
              elevated + shadow
            </span>
            <span className="text-[11px] text-faint">Opt-in only</span>
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="Grid & rhythm"
        stack
        hint="The two container widths the product commits to."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>PageBody · app routes</SpecLabel>
            <div className="mt-3 rounded-md border border-dashed border-border-strong p-3">
              <div className="h-10 rounded-sm bg-elevated" aria-hidden="true" />
            </div>
            <SpecNote className="mt-3">
              max-w-[1680px] · px-4 py-6, scaling to px-6 py-8 at sm.
              Dashboards take every available pixel.
            </SpecNote>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Container · marketing routes</SpecLabel>
            <div className="mt-3 flex justify-center rounded-md border border-dashed border-border-strong p-3">
              <div className="h-10 w-2/3 rounded-sm bg-elevated" aria-hidden="true" />
            </div>
            <SpecNote className="mt-3">
              max-w-[1280px] · px-6. Constrained measure — marketing copy does
              not want full width.
            </SpecNote>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
