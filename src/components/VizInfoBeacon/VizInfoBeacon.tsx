import React, { useCallback, useEffect, useRef, useState } from "react";
import "./VizInfoBeacon.scss";

export interface VizSceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VizScenePoint {
  x: number;
  y: number;
}

export interface VizInfoBeaconProps {
  viewWidth: number;
  viewHeight: number;
  hoverRegion: VizSceneRect;
  indicatorPosition: VizScenePoint;
  ariaLabel: string;
  onActivate: () => void;
  accentColor?: string;
  label?: string;
  hideDelayMs?: number;
  className?: string;
}

const VizInfoBeacon: React.FC<VizInfoBeaconProps> = ({
  viewWidth,
  viewHeight,
  hoverRegion,
  indicatorPosition,
  ariaLabel,
  onActivate,
  accentColor = "#60a5fa",
  label = "ⓘ",
  hideDelayMs = 3000,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const isHoveringButtonRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearHideTimer();
    setIsVisible(true);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (!isHoveringButtonRef.current) {
        setIsVisible(false);
      }
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [clearHideTimer, hideDelayMs]);

  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  const onButtonEnter = useCallback(() => {
    isHoveringButtonRef.current = true;
    clearHideTimer();
    setIsVisible(true);
  }, [clearHideTimer]);

  const onButtonLeave = useCallback(() => {
    isHoveringButtonRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const ix = indicatorPosition.x;
  const iy = indicatorPosition.y;
  const R = 13;

  return (
    <svg
      className={`viz-info-beacon ${className ?? ""}`.trim()}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Invisible hover region over the node */}
      <rect
        className="viz-info-beacon__hover-region"
        x={hoverRegion.x}
        y={hoverRegion.y}
        width={hoverRegion.width}
        height={hoverRegion.height}
        fill="transparent"
        onPointerEnter={show}
        onPointerLeave={scheduleHide}
      />

      {/* (i) indicator circle — appears on hover, sticks when hovered itself */}
      <g
        className={`viz-info-beacon__indicator ${isVisible ? "viz-info-beacon__indicator--visible" : ""}`}
        onPointerEnter={onButtonEnter}
        onPointerLeave={onButtonLeave}
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate();
          }
        }}
        onFocus={show}
        onBlur={onButtonLeave}
      >
        {/* Larger invisible hit area */}
        <circle cx={ix} cy={iy} r={R + 6} fill="transparent" />
        {/* Background circle */}
        <circle
          cx={ix}
          cy={iy}
          r={R}
          fill="#0f172a"
          stroke={accentColor}
          strokeWidth={1.6}
          opacity={0.95}
        />
        {/* Label text */}
        <text
          x={ix}
          y={iy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={accentColor}
          fontSize={14}
          fontWeight={700}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          style={{ pointerEvents: "none" }}
        >
          {label}
        </text>
      </g>
    </svg>
  );
};

export default VizInfoBeacon;
