import React from "react";

export interface PillDef {
  key: string;
  label: string;
  /** CSS class modifier appended as `vc-pill--{variant}`.
   *  Alternatively supply `color` + `borderColor` inline. */
  variant?: string;
  color?: string;
  borderColor?: string;
}

export interface ConceptPillsProps {
  pills: PillDef[];
  onOpen: (key: string) => void;
  className?: string;
}

/**
 * A horizontal row of clickable concept pills.
 * Each pill fires `onOpen(pill.key)` — typically to open an InfoModal.
 *
 * @example
 * <ConceptPills
 *   pills={[
 *     { key: "kafka", label: "Kafka", variant: "kafka" },
 *     { key: "partitioning", label: "Partitioning", color: "#fde68a", borderColor: "#f59e0b" },
 *   ]}
 *   onOpen={openConcept}
 * />
 */
const ConceptPills: React.FC<ConceptPillsProps> = ({
  pills,
  onOpen,
  className,
}) => (
  <div className={`vc-pills${className ? ` ${className}` : ""}`}>
    {pills.map((p) => (
      <button
        key={p.key}
        className={`vc-pill${p.variant ? ` vc-pill--${p.variant}` : ""}`}
        style={
          !p.variant && p.color
            ? { color: p.color, borderColor: p.borderColor ?? p.color }
            : undefined
        }
        onClick={() => onOpen(p.key)}
      >
        {p.label}
      </button>
    ))}
  </div>
);

export default ConceptPills;
