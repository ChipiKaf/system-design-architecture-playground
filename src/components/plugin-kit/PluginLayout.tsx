import React from "react";

export interface PluginLayoutProps {
  /** Content rendered above the body grid (pills bar, toolbar). */
  toolbar?: React.ReactNode;
  /** The main visualisation area (left column). */
  canvas: React.ReactNode;
  /** The right-hand sidebar (right column). Omit for full-width canvas. */
  sidebar?: React.ReactNode;
  /** Extra class on the root. */
  className?: string;
}

/**
 * Standard two-column plugin layout: toolbar → body (canvas + sidebar).
 *
 * @example
 * <PluginLayout
 *   toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
 *   canvas={<CanvasStage canvasRef={ref} />}
 *   sidebar={<SidePanel>…</SidePanel>}
 * />
 */
const PluginLayout: React.FC<PluginLayoutProps> = ({
  toolbar,
  canvas,
  sidebar,
  className,
}) => (
  <div className={`vc-plugin-layout${className ? ` ${className}` : ""}`}>
    {toolbar}
    <div
      className={`vc-plugin-layout__body${sidebar ? "" : " vc-plugin-layout__body--full"}`}
    >
      {canvas}
      {sidebar}
    </div>
  </div>
);

export default PluginLayout;
