/* ═══════════════════════════════════════════════════════
 *  VizCraft Plugin Kit
 *
 *  Shared, composable building blocks for plugin authors.
 *
 *  Usage:
 *    import {
 *      ConceptPills,
 *      useConceptModal,
 *      PluginLayout,
 *      StageHeader,
 *      StatBadge,
 *      SidePanel,
 *      SideCard,
 *      CanvasStage,
 *    } from "../../components/plugin-kit";
 *
 *  Styles:
 *    @use "../../components/plugin-kit/plugin-kit";
 *    — or import plugin-kit.scss once in your main.scss
 * ═══════════════════════════════════════════════════════ */

export { default as ConceptPills } from "./ConceptPills";
export type { PillDef, ConceptPillsProps } from "./ConceptPills";

export { useConceptModal } from "./useConceptModal";
export type { ConceptDefinition } from "./useConceptModal";

export { default as PluginLayout } from "./PluginLayout";
export type { PluginLayoutProps } from "./PluginLayout";

export { default as StageHeader } from "./StageHeader";
export type { StageHeaderProps } from "./StageHeader";

export { default as StatBadge } from "./StatBadge";
export type { StatBadgeProps } from "./StatBadge";

export { SidePanel, SideCard } from "./SidePanel";
export type { SidePanelProps, SideCardProps } from "./SidePanel";

export { default as CanvasStage } from "./CanvasStage";
export type { CanvasStageProps } from "./CanvasStage";
