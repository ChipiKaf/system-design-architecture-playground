import React from "react";

/* ─── SidePanel ───────────────────────────────────────── */

export interface SidePanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Scrollable sidebar column. Place `<SideCard>` elements inside.
 *
 * @example
 * <SidePanel>
 *   <SideCard label="What's happening"><p>{explanation}</p></SideCard>
 *   <SideCard variant="code" label="Source">…</SideCard>
 * </SidePanel>
 */
const SidePanel: React.FC<SidePanelProps> = ({ children, className }) => (
  <aside className={`vc-side-panel${className ? ` ${className}` : ""}`}>
    {children}
  </aside>
);

/* ─── SideCard ────────────────────────────────────────── */

export interface SideCardProps {
  /** Small uppercase label at the top of the card. */
  label?: string;
  /** Optional heading + sub rendered in a head row. */
  heading?: string;
  sub?: string;
  /** Extra class for variant styling, e.g. `vc-side-card--explanation`. */
  variant?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A card inside a SidePanel.
 *
 * @example
 * <SideCard label="What just happened?" variant="explanation">
 *   <p>{explanation}</p>
 * </SideCard>
 */
const SideCard: React.FC<SideCardProps> = ({
  label,
  heading,
  sub,
  variant,
  children,
  className,
}) => (
  <div
    className={`vc-side-card${variant ? ` vc-side-card--${variant}` : ""}${className ? ` ${className}` : ""}`}
  >
    {label && <div className="vc-side-card__label">{label}</div>}
    {(heading || sub) && (
      <div className="vc-side-card__head">
        {heading && <h3>{heading}</h3>}
        {sub && <span className="vc-side-card__sub">{sub}</span>}
      </div>
    )}
    {children}
  </div>
);

export { SidePanel, SideCard };
