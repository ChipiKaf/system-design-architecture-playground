import React from "react";

export interface StatBadgeProps {
  label: string;
  value: React.ReactNode;
  /** Colour applied to the value text. */
  color?: string;
  className?: string;
}

/**
 * A small stat/phase chip: uppercase label over a bold value.
 *
 * @example
 * <StatBadge label="Phase" value="sync" color="#93c5fd" />
 * <StatBadge label="Tasks" value="3/5" />
 */
const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  color,
  className,
}) => (
  <div className={`vc-stat-badge${className ? ` ${className}` : ""}`}>
    <span className="vc-stat-badge__label">{label}</span>
    <span className="vc-stat-badge__value" style={color ? { color } : undefined}>
      {value}
    </span>
  </div>
);

export default StatBadge;
