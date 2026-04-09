import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  type OverlayBuilder,
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import {
  useServiceEvolutionAnimation,
  type Signal,
} from "./useServiceEvolutionAnimation";
import {
  VARIANT_PROFILES,
  TRAIT_META,
  type ServiceEvolutionState,
  type VariantKey,
  type TraitKey,
} from "./serviceEvolutionSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

/* ─── Canvas dimensions ──────────────────────────────── */
const W = 960;
const H = 560;

/* ─── Layout constants ───────────────────────────────── */
const CLIENT_X = 60;
const GATEWAY_X = 200;
const GATEWAY_Y = H / 2;
const SERVICES_START_X = 360;

/* ─── Colours ─────────────────────────────────────────── */
const DARK_BG = "#0f172a";
const CARD_STROKE = "#334155";
const TEXT_MAIN = "#f1f5f9";
const TEXT_DIM = "#94a3b8";
const HOT_FILL = "#1e3a5f";

/* ─── Overlay surface type alias ─────────────────────── */
type OverlaySurface = OverlayBuilder;

/* ─── Monolith internal layout ────────────────────────── */
const MONOLITH_APP_X = SERVICES_START_X + 110;
const MONOLITH_APP_Y = GATEWAY_Y;
const MONOLITH_APP_W = 222;
const MONOLITH_APP_H = 192;
const MONOLITH_APP_LEFT = MONOLITH_APP_X - MONOLITH_APP_W / 2;
const MONOLITH_APP_TOP = MONOLITH_APP_Y - MONOLITH_APP_H / 2;
const MONOLITH_STANDBY_X = MONOLITH_APP_X + 260;
const MONOLITH_STANDBY_Y = MONOLITH_APP_Y;

interface MonolithUnit {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hotspot: boolean;
}

function createMonolithUnits(
  left: number,
  top: number,
  scale = 1,
): MonolithUnit[] {
  const s = scale;
  return [
    { id: "ui", label: "UI", x: left + 12 * s, y: top + 48 * s, w: 62 * s, h: 32 * s, hotspot: false },
    { id: "catalog", label: "Catalog", x: left + 12 * s, y: top + 88 * s, w: 62 * s, h: 32 * s, hotspot: false },
    { id: "auth", label: "Auth", x: left + 12 * s, y: top + 128 * s, w: 62 * s, h: 32 * s, hotspot: false },
    { id: "cart", label: "Cart", x: left + 82 * s, y: top + 48 * s, w: 62 * s, h: 32 * s, hotspot: true },
    { id: "checkout", label: "Checkout", x: left + 82 * s, y: top + 88 * s, w: 62 * s, h: 32 * s, hotspot: true },
    { id: "payments", label: "Payments", x: left + 152 * s, y: top + 68 * s, w: 56 * s, h: 90 * s, hotspot: true },
  ];
}

/* ─── CPU load data ───────────────────────────────────── */
const MONOLITH_CPU: Record<string, Record<string, number>> = {
  default: { ui: 18, catalog: 39, auth: 22, cart: 76, checkout: 58, payments: 54 },
  scale: { ui: 32, catalog: 55, auth: 34, cart: 92, checkout: 87, payments: 78 },
  recovery: { ui: 5, catalog: 8, auth: 4, cart: 12, checkout: 10, payments: 8 },
  "deploy-offline": { ui: 0, catalog: 0, auth: 0, cart: 0, checkout: 0, payments: 0 },
  "deploy-live": { ui: 14, catalog: 32, auth: 18, cart: 68, checkout: 52, payments: 48 },
};

function monolithCpu(unitId: string, stage: string): number {
  return MONOLITH_CPU[stage]?.[unitId] ?? MONOLITH_CPU["default"][unitId] ?? 0;
}

function monolithCpuColor(load: number, subdued = false) {
  if (subdued) return { fill: "rgba(51,65,85,0.5)", stroke: "#475569", textFill: "#94a3b8" };
  if (load >= 80) return { fill: "rgba(153,27,27,0.32)", stroke: "#f87171", textFill: "#fecaca" };
  if (load >= 55) return { fill: "rgba(120,53,15,0.28)", stroke: "#f59e0b", textFill: "#fde68a" };
  return { fill: "rgba(22,101,52,0.25)", stroke: "#4ade80", textFill: "#bbf7d0" };
}

/* ─── Highlight sets ──────────────────────────────────── */
const MONOLITH_CHANGED_UNITS = new Set(["ui", "cart"]);
const MONOLITH_TRANSACTION_UNITS = new Set(["ui", "cart", "checkout", "payments"]);
const MONOLITH_LOCKED_UNITS = new Set(["checkout", "payments"]);

/* ─── Modular-monolith deploy helpers ─────────────────── */
type ModularDeployStage = "default" | "deploy-prep" | "deploy-offline" | "deploy-live";
const MODULAR_CHANGED_MODULES = new Set(["mod-0", "mod-1"]);
const MODULAR_CHANGED_SCHEMAS = new Set(["schema-0", "schema-1"]);

const MODULAR_CPU: Record<string, Record<string, number>> = {
  default: { "mod-0": 32, "mod-1": 45, "mod-2": 28, "mod-3": 15, "mod-4": 52, "mod-5": 22 },
  "deploy-offline": { "mod-0": 0, "mod-1": 0, "mod-2": 0, "mod-3": 0, "mod-4": 0, "mod-5": 0 },
  "deploy-live": { "mod-0": 28, "mod-1": 38, "mod-2": 24, "mod-3": 12, "mod-4": 46, "mod-5": 18 },
  "deploy-prep": { "mod-0": 32, "mod-1": 45, "mod-2": 28, "mod-3": 15, "mod-4": 52, "mod-5": 22 },
};

function modularCpu(moduleId: string, stage: ModularDeployStage): number {
  return MODULAR_CPU[stage]?.[moduleId] ?? MODULAR_CPU["default"][moduleId] ?? 0;
}

/* ─── Shared overlay badge helpers ────────────────────── */

function addBadge(
  o: OverlaySurface,
  key: string, x: number, y: number, text: string,
  fill: string, stroke: string, textFill = stroke,
) {
  const w = Math.max(74, text.length * 5.9 + 16);
  o.add("rect", { x, y, w, h: 20, rx: 10, ry: 10, fill, stroke, strokeWidth: 1, opacity: 0.98 }, { key: `${key}-bg` });
  o.add("text", { x: x + w / 2, y: y + 13, text, fill: textFill, fontSize: 8.5, fontWeight: 700, textAnchor: "middle" }, { key: `${key}-text` });
}

function addCpuBadge(
  o: OverlaySurface,
  key: string, x: number, y: number,
  load: number, subdued = false, compact = false,
) {
  const text = `${load}%`;
  const tone = monolithCpuColor(load, subdued);
  const w = compact ? 28 : 30;
  const h = compact ? 10 : 12;
  o.add("rect", { x, y, w, h, rx: h / 2, ry: h / 2, fill: tone.fill, stroke: tone.stroke, strokeWidth: 0.9, opacity: 0.98 }, { key: `${key}-bg` });
  o.add("text", { x: x + w / 2, y: y + (compact ? 7 : 8), text, fill: tone.textFill, fontSize: compact ? 6 : 6.5, fontWeight: 700, textAnchor: "middle" }, { key: `${key}-text` });
}

/* ─── Node builder helpers ──────────────────────────────
   Shared, parametric helpers so individual service/fn
   nodes stay DRY.
────────────────────────────────────────────────────────── */

function buildClient(b: ReturnType<typeof viz>, hot: (id: string) => boolean) {
  b.node("client")
    .at(CLIENT_X, GATEWAY_Y)
    .rect(80, 40, 8)
    .fill(hot("client") ? HOT_FILL : DARK_BG)
    .stroke(hot("client") ? "#60a5fa" : CARD_STROKE, 2)
    .label("Client", { fill: TEXT_MAIN, fontSize: 11, fontWeight: "bold" });
}

function buildGateway(b: ReturnType<typeof viz>, hot: (id: string) => boolean) {
  b.node("gateway")
    .at(GATEWAY_X + 10, GATEWAY_Y)
    .rect(100, 50, 8)
    .fill(hot("gateway") ? HOT_FILL : DARK_BG)
    .stroke(hot("gateway") ? "#7dd3fc" : CARD_STROKE, 2)
    .label("Gateway", { fill: TEXT_MAIN, fontSize: 11, fontWeight: "bold" });
  b.edge("client", "gateway", "e-client-gw")
    .stroke(CARD_STROKE, 1.5)
    .arrow(true);
}

/** Monolith: one deployable unit with blurred internal boundaries */
function buildMonolithScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
  phase: ServiceEvolutionState["phase"],
) {
  const color = VARIANT_PROFILES[variant].color;
  const deployActive = phase === "deploy";
  const acidActive = phase === "transaction";

  const acidAtomicityStage = acidActive && hot("tx-atomicity");
  const acidConsistencyStage = acidActive && hot("tx-consistency");
  const acidIsolationStage = acidActive && hot("tx-isolation");
  const acidDurabilityStage = acidActive && hot("tx-durability");

  const deployPrepareStage = deployActive && hot("deploy-prep");
  const deployOfflineStage = deployActive && hot("deploy-offline");
  const deployLiveStage = deployActive && hot("deploy-live");
  const deployChangeStage = deployPrepareStage || deployOfflineStage || deployLiveStage;
  const deployStandbyHot = hot("deploy-standby");

  const isFaultPhase = phase === "fault";
  const isFaultSpread = isFaultPhase && hot("db");
  const isScalePhase = phase === "scale-event";
  const isRecoveryPhase = phase === "recovery";
  const appHot = hot("app");
  const dbHot = hot("db");

  /* geometry */
  const appX = MONOLITH_APP_X;
  const appY = MONOLITH_APP_Y;
  const appW = MONOLITH_APP_W;
  const appH = MONOLITH_APP_H;
  const appLeft = MONOLITH_APP_LEFT;
  const appTop = MONOLITH_APP_TOP;

  const monolithStage = deployOfflineStage
    ? "deploy-offline"
    : deployLiveStage
      ? "deploy-live"
      : isScalePhase
        ? "scale"
        : isRecoveryPhase
          ? "recovery"
          : "default";

  const units = createMonolithUnits(appLeft, appTop);
  const standbyScale = 0.72;
  const standbyW = Math.round(appW * standbyScale);
  const standbyH = Math.round(appH * standbyScale);
  const standbyLeft = MONOLITH_STANDBY_X - standbyW / 2;
  const standbyTop = MONOLITH_STANDBY_Y - standbyH / 2;
  const standbyUnits = createMonolithUnits(standbyLeft, standbyTop, standbyScale);

  const transactionPath = ["ui", "cart", "checkout", "payments"] as const;
  const transactionSegments = [
    ["ui", "cart"],
    ["cart", "checkout"],
    ["checkout", "payments"],
  ] as const;

  const connections = [
    { from: "ui", to: "catalog" },
    { from: "ui", to: "auth" },
    { from: "catalog", to: "cart" },
    { from: "catalog", to: "checkout" },
    { from: "auth", to: "checkout" },
    { from: "cart", to: "checkout" },
    { from: "checkout", to: "payments" },
    { from: "payments", to: "auth" },
  ] as const;

  /* colors driven by ACID / deploy / fault phase */
  const txAccent = acidIsolationStage
    ? "#fbbf24"
    : acidConsistencyStage
      ? "#22c55e"
      : acidDurabilityStage
        ? "#4ade80"
        : "#38bdf8";
  const txFill = acidIsolationStage
    ? "rgba(113,63,18,0.18)"
    : acidConsistencyStage || acidDurabilityStage
      ? "rgba(22,101,52,0.18)"
      : "rgba(14,116,144,0.18)";

  const gatewayStroke = acidIsolationStage
    ? "#fbbf24"
    : acidAtomicityStage || acidConsistencyStage || acidDurabilityStage
      ? "#38bdf8"
      : deployOfflineStage
        ? "#ef4444"
        : deployLiveStage
          ? "#60a5fa"
          : CARD_STROKE;

  const hintText = acidAtomicityStage
    ? "one request can span UI, Cart, Checkout, Payments, and the shared DB in one local transaction"
    : acidConsistencyStage
      ? "the same call stack can verify invariants before any state becomes visible"
      : acidIsolationStage
        ? "concurrent requests wait instead of seeing half-written checkout state"
        : acidDurabilityStage
          ? "one commit makes the order durable in the shared database"
          : deployPrepareStage
            ? "CI/CD staged a full-app release, even though the change is mostly UI and Cart"
            : deployOfflineStage
              ? "traffic is drained while the whole monolith goes offline"
              : deployLiveStage
                ? "UI and Cart changed, but the whole application still had to be replaced"
                : isFaultSpread
                  ? "shared runtime and database spread the failure"
                  : isFaultPhase
                    ? "one hotspot fails, but the whole unit feels it"
                    : isScalePhase
                      ? "Checkout and Payments become the shared bottleneck"
                      : isRecoveryPhase
                        ? "recovery restarts the entire unit together"
                        : "busy and quiet paths still share one runtime";

  const hintColor = acidIsolationStage
    ? "#fcd34d"
    : acidAtomicityStage || acidConsistencyStage || acidDurabilityStage
      ? "#93c5fd"
      : deployOfflineStage
        ? "#fca5a5"
        : deployPrepareStage || deployLiveStage
          ? "#93c5fd"
          : isFaultPhase
            ? "#fca5a5"
            : isScalePhase
              ? "#fbbf24"
              : TEXT_DIM;

  /* ── Invisible anchor nodes so signals can target internal units ── */
  units.forEach((unit) => {
    b.node(unit.id)
      .at(unit.x + unit.w / 2, unit.y + unit.h / 2)
      .circle(2)
      .fill("rgba(0,0,0,0.001)")
      .stroke("rgba(0,0,0,0)", 0);
  });

  /* ── Application shell ── */
  b.node("app")
    .at(appX, appY)
    .rect(appW, appH, 16)
    .fill(
      acidIsolationStage
        ? "#21190b"
        : acidConsistencyStage || acidDurabilityStage
          ? "#11261b"
          : acidAtomicityStage
            ? "#10263a"
            : deployOfflineStage
              ? "#22161b"
              : deployLiveStage
                ? "#19283e"
                : appHot
                  ? isFaultPhase
                    ? "#2a1520"
                    : isScalePhase
                      ? "#261b11"
                      : "#1a2942"
                  : DARK_BG,
    )
    .stroke(
      acidActive
        ? txAccent
        : deployOfflineStage
          ? "#ef4444"
          : deployLiveStage
            ? "#60a5fa"
            : appHot
              ? isFaultPhase
                ? "#f87171"
                : isScalePhase
                  ? "#f59e0b"
                  : color
              : CARD_STROKE,
      2,
    );

  /* ── Database ── */
  b.node("db")
    .at(appX, GATEWAY_Y + 146)
    .rect(136, 44, 8)
    .fill(
      acidIsolationStage
        ? "#20180a"
        : acidConsistencyStage || acidDurabilityStage
          ? "#11271c"
          : acidAtomicityStage
            ? "#10263a"
            : deployOfflineStage
              ? "#151821"
              : dbHot
                ? isFaultPhase
                  ? "#24141a"
                  : "#1c2b1e"
                : DARK_BG,
    )
    .stroke(
      acidActive
        ? txAccent
        : deployOfflineStage
          ? "#7f1d1d"
          : dbHot
            ? isFaultPhase
              ? "#fb7185"
              : "#4ade80"
            : CARD_STROKE,
      1.5,
    )
    .label("Shared DB", {
      fill: acidActive
        ? acidIsolationStage
          ? "#fef3c7"
          : "#dcfce7"
        : deployOfflineStage
          ? TEXT_DIM
          : dbHot
            ? "#bbf7d0"
            : TEXT_DIM,
      fontSize: 10,
    });

  /* ── Edges ── */
  const gatewayEdge = b
    .edge("gateway", "app", "e-gw-app")
    .stroke(gatewayStroke, 1.5)
    .arrow(true);
  if (deployOfflineStage) gatewayEdge.dashed();
  b.edge("app", "db", "e-app-db").stroke(CARD_STROKE, 1.5).arrow(true);

  const cutoverEdge = b
    .edge("deploy-standby", "app", "e-standby-app")
    .stroke(
      deployLiveStage ? "rgba(96,165,250,0.82)" : "rgba(0,0,0,0)",
      deployLiveStage ? 1.4 : 0.1,
    )
    .arrow(true)
    .dashed();
  void cutoverEdge;

  /* ── Overlay: internal boxes, ACID visuals, deploy badges ── */
  b.overlay((o) => {
    /* title */
    o.add(
      "text",
      { x: appX, y: appTop + 24, text: "Application", fill: TEXT_MAIN, fontSize: 15, fontWeight: 700, textAnchor: "middle" },
      { key: "monolith-title" },
    );
    o.add(
      "text",
      { x: appX, y: appTop + 40, text: "UI + logic + data all ship together", fill: deployOfflineStage ? "#cbd5e1" : TEXT_DIM, fontSize: 8.5, fontWeight: 600, textAnchor: "middle" },
      { key: "monolith-subtitle" },
    );

    /* ── ACID visuals ── */
    if (acidActive) {
      const txStatus = acidAtomicityStage
        ? "TX open"
        : acidConsistencyStage
          ? "rules checked"
          : acidIsolationStage
            ? "locks held"
            : "commit durable";

      addBadge(o, "monolith-tx-status", appLeft + appW - 92, appTop + 12, txStatus, txFill, txAccent, acidIsolationStage ? "#fef3c7" : "#e0f2fe");

      /* transaction boundary */
      o.add(
        "rect",
        { x: appLeft + 14, y: appTop + 50, w: 194, h: 122, rx: 12, ry: 12, fill: "rgba(0,0,0,0)", stroke: txAccent, strokeWidth: 1.2, opacity: 0.78, strokeDasharray: acidDurabilityStage ? "" : "5,4" },
        { key: "monolith-tx-boundary" },
      );
      o.add(
        "text",
        { x: appLeft + 26, y: appTop + 63, text: "in-process transaction", fill: acidIsolationStage ? "#fef3c7" : "#dbeafe", fontSize: 7, fontWeight: 700 },
        { key: "monolith-tx-boundary-label" },
      );

      /* transaction route lines */
      transactionSegments.forEach(([from, to], index) => {
        const source = units.find((u) => u.id === from);
        const target = units.find((u) => u.id === to);
        if (!source || !target) return;
        o.add(
          "line",
          { x1: source.x + source.w / 2, y1: source.y + source.h / 2, x2: target.x + target.w / 2, y2: target.y + target.h / 2, stroke: txAccent, strokeWidth: 2.3, opacity: 0.82, strokeDasharray: acidIsolationStage ? "4,2" : "" },
          { key: `monolith-tx-route-${index}` },
        );
      });

      /* route to DB */
      const paymentsUnit = units.find((u) => u.id === "payments");
      if (paymentsUnit) {
        o.add(
          "line",
          { x1: paymentsUnit.x + paymentsUnit.w / 2, y1: paymentsUnit.y + paymentsUnit.h, x2: appX, y2: GATEWAY_Y + 124, stroke: txAccent, strokeWidth: acidDurabilityStage ? 2.6 : 2, opacity: acidDurabilityStage ? 0.92 : 0.74, strokeDasharray: acidDurabilityStage ? "" : "4,3" },
          { key: "monolith-tx-route-db" },
        );
      }

      /* dots on transaction units */
      transactionPath.forEach((unitId, index) => {
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return;
        o.add(
          "circle",
          { x: unit.x + unit.w / 2, y: unit.y + unit.h / 2, r: 4.5, fill: txAccent, stroke: DARK_BG, strokeWidth: 1, opacity: 0.96 },
          { key: `monolith-tx-dot-${index}` },
        );
      });

      /* ACID stage chips */
      const acidStages = [
        { key: "acid-a", label: "Atomic", active: acidAtomicityStage, color: "#38bdf8" },
        { key: "acid-c", label: "Valid", active: acidConsistencyStage, color: "#22c55e" },
        { key: "acid-i", label: "Locked", active: acidIsolationStage, color: "#fbbf24" },
        { key: "acid-d", label: "Commit", active: acidDurabilityStage, color: "#4ade80" },
      ] as const;
      acidStages.forEach((stage, index) => {
        const x = appLeft + 18 + index * 52;
        o.add(
          "rect",
          { x, y: appTop + appH - 38, w: 46, h: 17, rx: 8.5, ry: 8.5, fill: stage.active ? `${stage.color}22` : "rgba(15,23,42,0.68)", stroke: stage.active ? stage.color : "#475569", strokeWidth: 1, opacity: 0.98 },
          { key: `${stage.key}-chip` },
        );
        o.add(
          "text",
          { x: x + 23, y: appTop + appH - 27, text: stage.label, fill: stage.active ? TEXT_MAIN : TEXT_DIM, fontSize: 7.5, fontWeight: 700, textAnchor: "middle" },
          { key: `${stage.key}-chip-label` },
        );
      });

      /* consistency invariant rules */
      if (acidConsistencyStage) {
        ["total ≥ 0", "stock ≥ reserved", "payment authorized"].forEach((rule, index) => {
          o.add("text", { x: appLeft + appW - 82, y: appTop + 70 + index * 12, text: `✓ ${rule}`, fill: "#86efac", fontSize: 7, fontWeight: 600 }, { key: `monolith-invariant-${index}` });
        });
      }

      /* isolation lock bar */
      if (acidIsolationStage) {
        o.add("line", { x1: appLeft + 80, y1: GATEWAY_Y + 16, x2: appLeft + appW - 14, y2: GATEWAY_Y + 16, stroke: "#fbbf24", strokeWidth: 1.4, opacity: 0.72, strokeDasharray: "4,3" }, { key: "monolith-lock-bar" });
        o.add("text", { x: appLeft + appW / 2, y: GATEWAY_Y + 10, text: "🔒 row-level locks held", fill: "#fef3c7", fontSize: 7, fontWeight: 700, textAnchor: "middle" }, { key: "monolith-lock-label" });
        units.forEach((unit) => {
          if (!MONOLITH_LOCKED_UNITS.has(unit.id)) return;
          o.add("text", { x: unit.x + 4, y: unit.y + 10, text: "🔒", fontSize: 8 }, { key: `monolith-lock-${unit.id}` });
        });
      }

      /* durability commit */
      if (acidDurabilityStage) {
        o.add("text", { x: appX, y: GATEWAY_Y + 118, text: "✓ COMMIT — durable", fill: "#86efac", fontSize: 8, fontWeight: 700, textAnchor: "middle" }, { key: "monolith-commit-label" });
      }
    }

    /* ── Deploy badges ── */
    if (deployPrepareStage) {
      addBadge(o, "monolith-deploy-prep", appLeft + 12, appTop + 12, "CI/CD preparing", "rgba(30,64,175,0.2)", "#60a5fa", "#dbeafe");
    }
    if (deployOfflineStage) {
      addBadge(o, "monolith-offline", appLeft + appW - 88, appTop + 14, "offline", "rgba(127,29,29,0.26)", "#ef4444", "#fecaca");
    }
    if (deployLiveStage) {
      addBadge(o, "monolith-live", appLeft + appW - 92, appTop + 14, "v+1 live", "rgba(30,64,175,0.18)", "#60a5fa", "#dbeafe");
    }

    /* ── Standby copy (deploy-live) ── */
    if (deployLiveStage && deployStandbyHot) {
      o.add("rect", { x: standbyLeft, y: standbyTop, w: standbyW, h: standbyH, rx: 14, ry: 14, fill: "rgba(15,23,42,0.94)", stroke: "#93c5fd", strokeWidth: 1.8, opacity: 0.98 }, { key: "monolith-standby-shell" });
      o.add("text", { x: MONOLITH_STANDBY_X, y: standbyTop + 18, text: "Application", fill: TEXT_MAIN, fontSize: 12, fontWeight: 700, textAnchor: "middle" }, { key: "monolith-standby-title" });
      o.add("text", { x: MONOLITH_STANDBY_X, y: standbyTop + 31, text: "replacement copy", fill: "#cbd5e1", fontSize: 7.5, fontWeight: 600, textAnchor: "middle" }, { key: "monolith-standby-subtitle" });
      standbyUnits.forEach((unit) => {
        const isChanged = MONOLITH_CHANGED_UNITS.has(unit.id);
        const cpuLoad = monolithCpu(unit.id, "deploy-live");
        const compact = unit.w < 60;
        o.add("rect", { x: unit.x, y: unit.y, w: unit.w, h: unit.h, rx: 6, ry: 6, fill: isChanged ? "rgba(30,64,175,0.28)" : unit.hotspot ? "rgba(120,53,15,0.22)" : "rgba(15,23,42,0.82)", stroke: isChanged ? "#60a5fa" : unit.hotspot ? "#f59e0b" : "#475569", strokeWidth: isChanged || unit.hotspot ? 1.2 : 1, opacity: 0.98 }, { key: `monolith-standby-unit-${unit.id}` });
        o.add("text", { x: unit.x + unit.w / 2, y: unit.y + unit.h / 2 + 2, text: unit.label, fill: isChanged ? "#dbeafe" : unit.hotspot ? "#fde68a" : TEXT_MAIN, fontSize: 7, fontWeight: isChanged || unit.hotspot ? 700 : 600, textAnchor: "middle" }, { key: `monolith-standby-label-${unit.id}` });
        addCpuBadge(o, `monolith-standby-cpu-${unit.id}`, unit.x + unit.w - (compact ? 28 : 30) - 4, unit.y + 4, cpuLoad, false, compact);
      });
      addBadge(o, "monolith-standby-badge", standbyLeft + standbyW - 86, standbyTop + 10, "new release", "rgba(30,64,175,0.2)", "#60a5fa", "#dbeafe");
    }

    /* ── Coupling lines between internal units ── */
    connections.forEach(({ from, to }, index) => {
      const source = units.find((u) => u.id === from);
      const target = units.find((u) => u.id === to);
      if (!source || !target) return;
      const isChangedConn =
        MONOLITH_CHANGED_UNITS.has(source.id) || MONOLITH_CHANGED_UNITS.has(target.id);
      const lineStroke = isFaultPhase
        ? "rgba(248,113,113,0.16)"
        : isScalePhase && (source.hotspot || target.hotspot)
          ? "rgba(251,191,36,0.2)"
          : deployChangeStage && isChangedConn
            ? "rgba(96,165,250,0.25)"
            : acidActive
              ? "rgba(0,0,0,0)"
              : "rgba(148,163,184,0.12)";
      o.add(
        "line",
        { x1: source.x + source.w / 2, y1: source.y + source.h / 2, x2: target.x + target.w / 2, y2: target.y + target.h / 2, stroke: lineStroke, strokeWidth: 1, ...(isFaultPhase ? {} : { strokeDasharray: "4,3" }) },
        { key: `monolith-coupling-${index}` },
      );
    });

    /* ── Internal unit boxes ── */
    units.forEach((unit) => {
      const isHotspot = unit.hotspot;
      const isChangedUnit = deployChangeStage && MONOLITH_CHANGED_UNITS.has(unit.id);
      const isTransactionUnit = acidActive && MONOLITH_TRANSACTION_UNITS.has(unit.id);
      const isLockedUnit = acidIsolationStage && MONOLITH_LOCKED_UNITS.has(unit.id);
      const cpuLoad = monolithCpu(unit.id, monolithStage);
      const compact = unit.w < 60;

      let fill: string;
      let stroke: string;
      let textFill: string;

      if (deployOfflineStage) {
        fill = "rgba(15,23,42,0.38)";
        stroke = MONOLITH_CHANGED_UNITS.has(unit.id) ? "#7f1d1d" : "#475569";
        textFill = TEXT_DIM;
      } else if (acidActive && !isTransactionUnit) {
        fill = "rgba(15,23,42,0.22)";
        stroke = "#334155";
        textFill = "#64748b";
      } else if (acidAtomicityStage && isTransactionUnit) {
        fill = "rgba(14,116,144,0.22)";
        stroke = "#38bdf8";
        textFill = "#e0f2fe";
      } else if (acidConsistencyStage && isTransactionUnit) {
        fill = "rgba(22,101,52,0.22)";
        stroke = "#22c55e";
        textFill = "#dcfce7";
      } else if (acidIsolationStage && isTransactionUnit) {
        fill = isLockedUnit ? "rgba(113,63,18,0.26)" : "rgba(113,63,18,0.14)";
        stroke = isLockedUnit ? "#fbbf24" : "#fbbf2488";
        textFill = "#fef3c7";
      } else if (acidDurabilityStage && isTransactionUnit) {
        fill = "rgba(22,101,52,0.22)";
        stroke = "#4ade80";
        textFill = "#dcfce7";
      } else if (isChangedUnit) {
        fill = deployLiveStage ? "rgba(30,64,175,0.24)" : "rgba(30,64,175,0.18)";
        stroke = "#60a5fa";
        textFill = "#dbeafe";
      } else if (isFaultPhase && unit.id === "checkout") {
        fill = "rgba(153,27,27,0.32)";
        stroke = "#f87171";
        textFill = "#fecaca";
      } else if (isFaultPhase && isHotspot) {
        fill = "rgba(120,53,15,0.18)";
        stroke = "#f59e0b";
        textFill = "#fde68a";
      } else if (isScalePhase && isHotspot) {
        fill = "rgba(120,53,15,0.22)";
        stroke = "#f59e0b";
        textFill = "#fde68a";
      } else if (isRecoveryPhase) {
        fill = "rgba(15,23,42,0.32)";
        stroke = "#475569";
        textFill = TEXT_DIM;
      } else {
        fill = isHotspot ? "rgba(120,53,15,0.15)" : "rgba(15,23,42,0.68)";
        stroke = isHotspot ? "#f59e0b" : "#475569";
        textFill = isHotspot ? "#fde68a" : TEXT_MAIN;
      }

      o.add("rect", { x: unit.x, y: unit.y, w: unit.w, h: unit.h, rx: 8, ry: 8, fill, stroke, strokeWidth: isHotspot ? 1.6 : 1.1, opacity: 0.98 }, { key: `monolith-unit-${unit.id}` });
      o.add("text", { x: unit.x + unit.w / 2, y: unit.y + unit.h / 2 + 3, text: unit.label, fill: textFill, fontSize: 8.5, fontWeight: isChangedUnit || isHotspot ? 700 : 600, textAnchor: "middle" }, { key: `monolith-unit-label-${unit.id}` });
      addCpuBadge(o, `monolith-unit-cpu-${unit.id}`, unit.x + unit.w - (compact ? 28 : 30) - 5, unit.y + 5, cpuLoad, deployOfflineStage || isRecoveryPhase, compact);
    });

    /* hint text at bottom of app box */
    o.add(
      "text",
      { x: appX, y: appTop + appH - 14, text: hintText, fill: hintColor, fontSize: 8.5, fontWeight: 700, textAnchor: "middle" },
      { key: "monolith-hint" },
    );
  });
}

/** CI/CD deploy control plane — shared by monolith and modular-monolith */
function buildDeploymentLane(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
  phase: ServiceEvolutionState["phase"],
) {
  const deployActive = phase === "deploy";
  const cicdHot = hot("cicd");
  const releaseHot = hot("deploy-window");
  const standbyHot = hot("deploy-standby");

  b.node("cicd")
    .at(744, 52)
    .rect(100, 32, 8)
    .fill(cicdHot ? "#1e3a5f" : "rgba(15,23,42,0.6)")
    .stroke(cicdHot ? "#60a5fa" : "rgba(100,116,139,0.28)", 1.2)
    .label("CI / CD", { fill: cicdHot ? TEXT_MAIN : TEXT_DIM, fontSize: 9, fontWeight: "bold" });

  b.node("deploy-window")
    .at(744, 84)
    .rect(100, 28, 6)
    .fill(releaseHot ? "rgba(30,64,175,0.12)" : "rgba(15,23,42,0.4)")
    .stroke(releaseHot ? "rgba(96,165,250,0.42)" : "rgba(100,116,139,0.18)", 1)
    .label("Release gate", { fill: releaseHot || deployActive ? "#93c5fd" : TEXT_DIM, fontSize: 8 });

  b.edge("cicd", "deploy-window", "e-cicd-release")
    .stroke(
      cicdHot || releaseHot || deployActive
        ? "rgba(96,165,250,0.38)"
        : "rgba(100,116,139,0.18)",
      1.2,
    )
    .arrow(true)
    .dashed();

  if (variant === "monolith" || variant === "modular-monolith") {
    b.node("deploy-standby")
      .at(MONOLITH_STANDBY_X, MONOLITH_STANDBY_Y)
      .rect(172, 138, 14)
      .fill(standbyHot ? "rgba(96,165,250,0.04)" : "rgba(0,0,0,0.001)")
      .stroke(standbyHot ? "rgba(96,165,250,0.18)" : "rgba(0,0,0,0)", 0.6);

    b.edge("deploy-window", "deploy-standby", "e-release-standby")
      .stroke(
        standbyHot || deployActive
          ? "rgba(96,165,250,0.28)"
          : "rgba(100,116,139,0.12)",
        1,
      )
      .arrow(true)
      .dashed();
  }

  b.overlay((o) => {
    o.add(
      "text",
      { x: 744, y: 42, text: "Deploy control plane", fill: deployActive ? "#93c5fd" : TEXT_DIM, fontSize: 9, fontWeight: 700, textAnchor: "middle" },
      { key: "deploy-lane-label" },
    );
  });
}

/** Modular Monolith: a single backend containing bounded modules. */
function buildModularMonolithScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
  phase: ServiceEvolutionState["phase"],
) {
  const color = VARIANT_PROFILES[variant].color;
  const deployActive = phase === "deploy";
  const deployPrepStage = deployActive && hot("deploy-prep");
  const deployOfflineStage = deployActive && hot("deploy-offline");
  const deployLiveStage = deployActive && hot("deploy-live");
  const modularStage: ModularDeployStage = deployLiveStage
    ? "deploy-live"
    : deployOfflineStage
      ? "deploy-offline"
      : deployPrepStage
        ? "deploy-prep"
        : "default";

  const modules = [
    { id: "mod-0", label: "Catalog Module", schemaId: "schema-0", schemaLabel: "catalog.*", y: GATEWAY_Y - 92, x: 430, schemaX: 790 },
    { id: "mod-1", label: "Ordering Module", schemaId: "schema-1", schemaLabel: "ordering.*", y: GATEWAY_Y - 92, x: 605, schemaX: 872 },
    { id: "mod-2", label: "Basket Module", schemaId: "schema-2", schemaLabel: "basket.*", y: GATEWAY_Y, x: 430, schemaX: 790 },
    { id: "mod-3", label: "Identity Module", schemaId: "schema-3", schemaLabel: "identity.*", y: GATEWAY_Y, x: 605, schemaX: 872 },
    { id: "mod-4", label: "Payment Module", schemaId: "schema-4", schemaLabel: "payment.*", y: GATEWAY_Y + 92, x: 430, schemaX: 790 },
    { id: "mod-5", label: "Shipment Module", schemaId: "schema-5", schemaLabel: "shipment.*", y: GATEWAY_Y + 92, x: 605, schemaX: 872 },
  ];

  /* ── Outer application shell ── */
  b.node("app")
    .at(520, GATEWAY_Y)
    .rect(360, 280, 16)
    .fill(
      deployOfflineStage ? "#22161b"
        : deployLiveStage ? "#17253a"
          : deployPrepStage ? "#13263a"
            : hot("app") ? "#1a2942" : DARK_BG,
    )
    .stroke(
      deployOfflineStage ? "#ef4444"
        : deployLiveStage || deployPrepStage ? "#60a5fa"
          : hot("app") ? color : CARD_STROKE,
      2,
    );

  /* ── Shared database shell ── */
  b.node("db")
    .at(830, GATEWAY_Y)
    .rect(170, 280, 16)
    .fill(
      deployOfflineStage ? "#151821"
        : deployLiveStage || deployPrepStage ? "#10251a"
          : hot("db") ? "#1c2b1e" : DARK_BG,
    )
    .stroke(
      deployOfflineStage ? "#7f1d1d"
        : deployLiveStage || deployPrepStage ? "#4ade80"
          : hot("db") ? "#4ade80" : CARD_STROKE,
      2,
    );

  /* ── Module + schema nodes ── */
  modules.forEach(({ id, label, y, x, schemaId, schemaLabel, schemaX }) => {
    const moduleTouched = MODULAR_CHANGED_MODULES.has(id);
    const schemaTouched = MODULAR_CHANGED_SCHEMAS.has(schemaId);

    const moduleFill = deployOfflineStage
      ? "rgba(15,23,42,0.34)"
      : deployLiveStage
        ? moduleTouched ? "rgba(30,64,175,0.12)" : "rgba(15,23,42,0.48)"
        : deployPrepStage && moduleTouched
          ? "rgba(30,64,175,0.22)"
          : hot(id) ? HOT_FILL : DARK_BG;
    const moduleStroke = deployOfflineStage
      ? moduleTouched ? "#7f1d1d" : "#475569"
      : deployLiveStage
        ? moduleTouched ? "#60a5fa" : "#475569"
        : deployPrepStage && moduleTouched
          ? "#60a5fa"
          : hot(id) ? color : CARD_STROKE;
    const moduleText = deployOfflineStage
      ? TEXT_DIM
      : deployLiveStage
        ? moduleTouched ? "#dbeafe" : TEXT_MAIN
        : deployPrepStage && moduleTouched
          ? "#dbeafe"
          : TEXT_MAIN;

    b.node(id).at(x, y).rect(142, 42, 8).fill(moduleFill).stroke(moduleStroke, 1.5)
      .label(label, { fill: moduleText, fontSize: 9, fontWeight: "bold" });

    b.node(schemaId).at(schemaX, y).rect(68, 30, 6)
      .fill(
        deployOfflineStage ? "rgba(15,23,42,0.32)"
          : deployLiveStage ? schemaTouched ? "rgba(22,101,52,0.22)" : "#111827"
            : deployPrepStage && schemaTouched ? "rgba(22,101,52,0.24)"
              : hot(schemaId) ? "#1f3522" : "#111827",
      )
      .stroke(
        deployOfflineStage ? schemaTouched ? "#7f1d1d" : CARD_STROKE
          : deployLiveStage ? schemaTouched ? "#4ade80" : CARD_STROKE
            : deployPrepStage && schemaTouched ? "#4ade80"
              : hot(schemaId) ? "#4ade80" : CARD_STROKE,
        1,
      )
      .label(schemaLabel, {
        fill: deployOfflineStage ? TEXT_DIM
          : deployLiveStage ? schemaTouched ? "#bbf7d0" : TEXT_DIM
            : deployPrepStage && schemaTouched ? "#bbf7d0"
              : hot(schemaId) ? "#bbf7d0" : TEXT_DIM,
        fontSize: 7.5, fontWeight: "bold",
      });

    b.edge(id, schemaId, `e-${id}-${schemaId}`).stroke("#334155", 1).arrow(true).dashed();
  });

  b.edge("gateway", "app", "e-gw-app").stroke(CARD_STROKE, 1.5).arrow(true);
  b.edge("app", "db", "e-app-db").stroke(CARD_STROKE, 1.5).arrow(true);

  type ModularModule = (typeof modules)[number];

  const addModuleCopy = (
    o: OverlaySurface, module: ModularModule,
    offsetX: number, offsetY: number, stage: ModularDeployStage,
  ) => {
    const moduleTouched = MODULAR_CHANGED_MODULES.has(module.id);
    const schemaTouched = MODULAR_CHANGED_SCHEMAS.has(module.schemaId);
    const load = modularCpu(module.id, stage);
    const mx = module.x + offsetX;
    const my = module.y + offsetY;
    const sx = module.schemaX + offsetX;
    o.add("rect", { x: mx, y: my, w: 142, h: 42, rx: 8, ry: 8, fill: moduleTouched ? "rgba(30,64,175,0.24)" : "rgba(15,23,42,0.84)", stroke: moduleTouched ? "#60a5fa" : "#475569", strokeWidth: 1.5, opacity: 0.98 }, { key: `modular-copy-module-${module.id}` });
    o.add("text", { x: mx + 71, y: my + 24, text: module.label, fill: moduleTouched ? "#dbeafe" : TEXT_MAIN, fontSize: 9, fontWeight: 700, textAnchor: "middle" }, { key: `modular-copy-module-label-${module.id}` });
    o.add("rect", { x: sx, y: my + 6, w: 68, h: 30, rx: 6, ry: 6, fill: schemaTouched ? "rgba(22,101,52,0.24)" : "#111827", stroke: schemaTouched ? "#4ade80" : "#475569", strokeWidth: 1, opacity: 0.98 }, { key: `modular-copy-schema-${module.schemaId}` });
    o.add("text", { x: sx + 34, y: my + 26, text: module.schemaLabel, fill: schemaTouched ? "#bbf7d0" : TEXT_DIM, fontSize: 7.5, fontWeight: 700, textAnchor: "middle" }, { key: `modular-copy-schema-label-${module.schemaId}` });
    addCpuBadge(o, `modular-copy-cpu-${module.id}`, mx + 104, my + 5, load, stage === "deploy-offline");
  };

  /* ── Main overlay ── */
  b.overlay((o) => {
    o.add("text", { x: 520, y: 150, text: "Modular Monolith", fill: TEXT_MAIN, fontSize: 15, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-title" });
    o.add("text", { x: 520, y: 162, text: "Single deployment unit", fill: TEXT_DIM, fontSize: 9, textAnchor: "middle" }, { key: "modulith-subtitle" });
    o.add("text", { x: 830, y: 150, text: "PostgreSQL", fill: TEXT_MAIN, fontSize: 14, fontWeight: 700, textAnchor: "middle" }, { key: "db-title" });
    o.add("text", { x: 830, y: 162, text: "Separate schema per module", fill: TEXT_DIM, fontSize: 8, textAnchor: "middle" }, { key: "db-subtitle" });

    /* deploy-prep badge and outlines */
    if (deployPrepStage) {
      o.add("rect", { x: 408, y: 174, w: 204, h: 20, rx: 10, ry: 10, fill: "rgba(30,64,175,0.18)", stroke: "#60a5fa", strokeWidth: 1, opacity: 0.98 }, { key: "modulith-prep-badge-bg" });
      o.add("text", { x: 510, y: 187, text: "Catalog + Ordering touched", fill: "#dbeafe", fontSize: 8, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-prep-badge-text" });
      modules.forEach((module) => {
        if (!MODULAR_CHANGED_MODULES.has(module.id)) return;
        o.add("rect", { x: module.x - 2, y: module.y - 2, w: 146, h: 46, rx: 10, ry: 10, fill: "rgba(96,165,250,0.06)", stroke: "rgba(96,165,250,0.55)", strokeWidth: 1, opacity: 0.9 }, { key: `modular-prep-outline-${module.id}` });
      });
    }

    /* deploy-offline badge */
    if (deployOfflineStage) {
      o.add("rect", { x: 433, y: 174, w: 72, h: 20, rx: 10, ry: 10, fill: "rgba(127,29,29,0.22)", stroke: "#ef4444", strokeWidth: 1, opacity: 0.98 }, { key: "modulith-offline-badge-bg" });
      o.add("text", { x: 469, y: 187, text: "offline", fill: "#fecaca", fontSize: 8, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-offline-badge-text" });
    }

    /* CPU badges on active modules */
    if (!deployLiveStage) {
      modules.forEach((module) => {
        addCpuBadge(o, `modular-active-cpu-${module.id}`, module.x + 104, module.y + 5, modularCpu(module.id, modularStage), deployOfflineStage);
      });
    }

    /* replacement copy during deploy-live */
    if (deployLiveStage) {
      o.add("rect", { x: 520, y: GATEWAY_Y, w: 360, h: 280, rx: 16, ry: 16, fill: "rgba(15,23,42,0.94)", stroke: "#60a5fa", strokeWidth: 2, opacity: 0.98 }, { key: "modulith-copy-shell" });
      o.add("text", { x: 700, y: 150, text: "Modular Monolith", fill: TEXT_MAIN, fontSize: 15, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-copy-title" });
      o.add("text", { x: 700, y: 162, text: "replacement copy", fill: "#dbeafe", fontSize: 9, textAnchor: "middle" }, { key: "modulith-copy-subtitle" });
      o.add("rect", { x: 830, y: GATEWAY_Y, w: 170, h: 280, rx: 16, ry: 16, fill: "rgba(15,23,42,0.92)", stroke: "#4ade80", strokeWidth: 2, opacity: 0.95 }, { key: "modulith-copy-db-shell" });
      o.add("text", { x: 915, y: 150, text: "PostgreSQL", fill: TEXT_MAIN, fontSize: 14, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-copy-db-title" });
      o.add("text", { x: 915, y: 162, text: "Same schemas, new binary", fill: "#cbd5e1", fontSize: 8, textAnchor: "middle" }, { key: "modulith-copy-db-subtitle" });
      modules.forEach((module) => addModuleCopy(o, module, 0, 0, "deploy-live"));
      o.add("rect", { x: 646, y: 174, w: 112, h: 20, rx: 10, ry: 10, fill: "rgba(30,64,175,0.2)", stroke: "#60a5fa", strokeWidth: 1, opacity: 0.98 }, { key: "modulith-copy-badge-bg" });
      o.add("text", { x: 700, y: 187, text: "replacement copy", fill: "#dbeafe", fontSize: 8, fontWeight: 700, textAnchor: "middle" }, { key: "modulith-copy-badge-text" });
    }
  });
}

/** Microservices: 6 independent services, each with own DB */
function buildMicroScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const services = [
    { id: "svc-0", label: "Catalog Svc", y: GATEWAY_Y - 120, x: 470 },
    { id: "svc-1", label: "Ordering Svc", y: GATEWAY_Y - 120, x: 690 },
    { id: "svc-2", label: "Basket Svc", y: GATEWAY_Y - 10, x: 470 },
    { id: "svc-3", label: "Identity Svc", y: GATEWAY_Y - 10, x: 690 },
    { id: "svc-4", label: "Payment Svc", y: GATEWAY_Y + 100, x: 470 },
    { id: "svc-5", label: "Shipment Svc", y: GATEWAY_Y + 100, x: 690 },
  ];

  services.forEach(({ id, label, x, y }, i) => {
    const dbId = `db-${i}`;

    b.node(id)
      .at(x, y)
      .rect(132, 40, 7)
      .fill(hot(id) ? HOT_FILL : DARK_BG)
      .stroke(hot(id) ? color : CARD_STROKE, 1.5)
      .label(label, { fill: TEXT_MAIN, fontSize: 9, fontWeight: "bold" });

    b.node(dbId)
      .at(x, y + 50)
      .rect(70, 28, 5)
      .fill(hot(dbId) ? "#1c2b1e" : DARK_BG)
      .stroke(hot(dbId) ? "#4ade80" : CARD_STROKE, 1)
      .label("Owned DB", { fill: TEXT_DIM, fontSize: 7.5, fontWeight: "bold" });

    b.edge("gateway", id, `e-gw-${id}`).stroke(CARD_STROKE, 1).arrow(true);
    b.edge(id, dbId, `e-${id}-${dbId}`)
      .stroke(CARD_STROKE, 1)
      .arrow(true)
      .dashed();
  });

  b.overlay((o) => {
    o.add(
      "text",
      {
        x: 595,
        y: 108,
        text: "Database-per-Service",
        fill: TEXT_MAIN,
        fontSize: 12,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "microservices-title" },
    );
    o.add(
      "text",
      {
        x: 595,
        y: 122,
        text: "Each service owns its private data",
        fill: TEXT_DIM,
        fontSize: 9,
        textAnchor: "middle",
      },
      { key: "microservices-subtitle" },
    );
    o.add(
      "text",
      {
        x: 595,
        y: 136,
        text: "Other services should use APIs or events, not direct DB access",
        fill: "#c4b5fd",
        fontSize: 8,
        textAnchor: "middle",
      },
      { key: "microservices-contract" },
    );
  });
}

/** Serverless: 12 function nodes in a grid (no DBs — managed services) */
function buildServerlessScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const cols = 4;
  const rows = 3;
  const startX = SERVICES_START_X + 20;
  const startY = GATEWAY_Y - 130;
  const spacingX = 130;
  const spacingY = 95;
  const fnLabels = [
    "auth",
    "order",
    "user",
    "catalog",
    "pay",
    "notify",
    "email",
    "search",
    "report",
    "cart",
    "review",
    "ship",
  ];

  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fnId = `fn-${i}`;
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

    b.node(fnId)
      .at(x, y)
      .circle(28)
      .fill(hot(fnId) ? "#1e3a1f" : DARK_BG)
      .stroke(hot(fnId) ? color : "#334155", 1.5)
      .label(`ƒ\n${fnLabels[i]}`, {
        fill: hot(fnId) ? color : TEXT_DIM,
        fontSize: 8,
      });

    b.edge("gateway", fnId, `e-gw-${fnId}`).stroke("#1e293b", 1).arrow(true);
  }

  void rows; // satisfy linter
}

/* ════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════ */

const ServiceEvolutionVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } =
    useServiceEvolutionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as ServiceEvolutionState;
  const {
    explanation,
    hotZones,
    phase,
    variant,
    deployTimeS,
    scaleLatencyS,
    blastRadius,
  } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);
  const showMicroserviceDataCard = variant === "microservices";

  /* ── Build VizCraft scene based on active variant ──── */
  const scene = (() => {
    const b = viz().view(W, H);

    buildClient(b, hot);
    buildGateway(b, hot);

    switch (variant) {
      case "monolith":
        buildDeploymentLane(b, hot, variant, phase);
        buildMonolithScene(b, hot, variant, phase);
        break;
      case "modular-monolith":
        buildDeploymentLane(b, hot, variant, phase);
        buildModularMonolithScene(b, hot, variant, phase);
        break;
      case "microservices":
        buildMicroScene(b, hot, variant);
        break;
      case "serverless":
        buildServerlessScene(b, hot, variant);
        break;
    }

    /* ── Signals overlay ─────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return b;
  })();

  /* ── Mount / unmount ────────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 0.9,
        initialPan: saved?.pan ?? { x: 20, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Phase-driven className for fault visual ─────────── */
  const rootClass = [
    "service-evolution-root",
    `service-evolution-phase--${phase}`,
  ].join(" ");

  /* ── Concept pills ────────────────────────────────── */
  const pills = [
    {
      key: "monolith",
      label: "Monolith",
      color: "#94a3b8",
      borderColor: "#64748b",
    },
    {
      key: "modular-monolith",
      label: "Modular Monolith",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "microservices",
      label: "Microservices",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "serverless",
      label: "Serverless",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "when-to-migrate",
      label: "When to Migrate",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "tradeoffs",
      label: "Trade-off Guide",
      color: "#fcd34d",
      borderColor: "#d97706",
    },
  ];

  /* ── Trait bars ───────────────────────────────────── */
  const traitKeys = Object.keys(TRAIT_META) as TraitKey[];

  return (
    <div className={rootClass}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="service-evolution-stage">
            <StageHeader
              title="Monolith → Serverless"
              subtitle={`${profile.label} · ${profile.accentText} · compare deploy, scale, and fault boundaries`}
            >
              <StatBadge
                label="Deploy"
                value={`~${deployTimeS}s`}
                color={
                  deployTimeS <= 8
                    ? "#4ade80"
                    : deployTimeS <= 45
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
              <StatBadge
                label="Scale"
                value={`~${scaleLatencyS}s`}
                color={
                  scaleLatencyS <= 5
                    ? "#4ade80"
                    : scaleLatencyS <= 20
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
              <StatBadge
                label="Blast %"
                value={`${blastRadius}%`}
                color={
                  blastRadius <= 5
                    ? "#4ade80"
                    : blastRadius <= 35
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            <SideCard label="Architecture traits" variant="info">
              <div className="service-evolution-traits">
                {traitKeys.map((key) => {
                  const meta = TRAIT_META[key];
                  const score = profile.traits[key];
                  const label = profile.traitLabels[key];
                  return (
                    <div key={key} className="service-evolution-trait-row">
                      <span className="service-evolution-trait-name">
                        {meta.label}
                      </span>
                      <div className="service-evolution-trait-bar-wrap">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`service-evolution-trait-pip${i < score ? " active" : ""}`}
                            style={
                              i < score ? { background: profile.color } : {}
                            }
                          />
                        ))}
                      </div>
                      <span className="service-evolution-trait-label">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SideCard>

            {showMicroserviceDataCard && (
              <SideCard label="Database-per-Service" variant="info">
                <div className="service-evolution-db-pattern">
                  <p>
                    Each database shown beneath a service is{" "}
                    <strong>private to that service</strong>. The owning service
                    is the only one allowed to read or write it directly.
                  </p>
                  <ul className="service-evolution-db-pattern__list">
                    <li>
                      Other services should call an API or consume an event, not
                      query the database directly.
                    </li>
                    <li>
                      That gives clear data ownership, independent schema
                      evolution, and per-service scaling.
                    </li>
                    <li>
                      It also enables polyglot persistence: one service can use
                      SQL while another uses a document or key-value store.
                    </li>
                  </ul>
                  <p className="service-evolution-db-pattern__warning">
                    Trade-off: joins and multi-service transactions stop being
                    simple database operations and become application-level
                    coordination problems.
                  </p>
                </div>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default ServiceEvolutionVisualization;
