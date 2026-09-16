import { CAPABILITIES } from "@/lib/content/landing";
import { SectionHeading } from "@/components/layout/container";

/**
 * Capability grid.
 *
 * A bordered grid rather than six floating cards: the shared hairlines make it
 * read as one table of capabilities instead of a scatter of tiles, which is
 * both denser and more characteristic of a technical product.
 *
 * Each entry ends with a mono proof line — the actual artefact or unit the
 * capability produces. It is the detail that separates a claim from a feature.
 */
export function CapabilitiesSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Capabilities"
        title="Built around the questions review actually asks."
        description="Which change is risky, why, where does the risk concentrate, and is it getting better or worse."
      />

      {/* Negative margins collapse the outer edges so only interior rules
          remain — a grid, not a set of boxes. */}
      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((capability) => (
          <article
            key={capability.id}
            className="group flex flex-col bg-card p-6 transition-colors duration-200 hover:bg-elevated"
          >
            <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface transition-colors duration-200 group-hover:border-accent/30">
              <capability.icon
                aria-hidden="true"
                className="size-4 text-accent"
              />
            </span>

            <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
              {capability.title}
            </h3>

            <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
              {capability.description}
            </p>

            <p className="mt-5 border-t border-border pt-4 font-mono text-[11px] text-faint">
              {capability.proof}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
