import React from "react";

export interface CanvasStageProps {
  /** Ref forwarded to the inner canvas div (for VizCraft mounting). */
  canvasRef?: React.Ref<HTMLDivElement>;
  /** Content rendered inside the stage but outside the canvas (e.g. VizInfoBeacons). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The main visualisation canvas wrapper with grid-dot background.
 *
 * @example
 * <CanvasStage canvasRef={containerRef}>
 *   <VizInfoBeacon … />
 * </CanvasStage>
 */
const CanvasStage: React.FC<CanvasStageProps> = ({
  canvasRef,
  children,
  className,
}) => (
  <div className={`vc-canvas-stage${className ? ` ${className}` : ""}`}>
    <div className="vc-canvas-stage__canvas" ref={canvasRef} />
    {children}
  </div>
);

export default CanvasStage;
