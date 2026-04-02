import React from "react";

export interface StageHeaderProps {
  title: string;
  subtitle?: string;
  /** Slot rendered on the right — typically StatBadge components. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Title + subtitle + right-aligned stats area.
 *
 * @example
 * <StageHeader title="ECS Autoscaling" subtitle="Watch containers scale">
 *   <StatBadge label="Phase" value="alarm" color="#fda4af" />
 *   <StatBadge label="Tasks" value="3/5" />
 * </StageHeader>
 */
const StageHeader: React.FC<StageHeaderProps> = ({
  title,
  subtitle,
  children,
  className,
}) => (
  <div className={`vc-stage-header${className ? ` ${className}` : ""}`}>
    <div className="vc-stage-header__text">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children && <div className="vc-stage-header__stats">{children}</div>}
  </div>
);

export default StageHeader;
