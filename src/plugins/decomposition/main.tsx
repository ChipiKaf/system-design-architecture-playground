import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
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
  useDecompositionAnimation,
  type Signal,
} from "./useDecompositionAnimation";
import {
  VARIANT_PROFILES,
  type DecompositionState,
  type ServiceNode,
} from "./decompositionSlice";
import { buildSteps } from "./flow-engine";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

/* ── Canvas dimensions ───────────────────────────────── */
const W = 960;
const H = 560;

/* ── Layout constants ────────────────────────────────── */
const MONOLITH_X = 400;
const MONOLITH_Y = 220;
const API_GW_X = 400;
const API_GW_Y = 440;
const CLIENT_WEB_X = 80;
const CLIENT_WEB_Y = 380;
const CLIENT_MOB_X = 80;
const CLIENT_MOB_Y = 460;

/* Service positions (right column, stacked) */
const SVC_POSITIONS: Record<string, { x: number; y: number }> = {
  "svc-catalog": { x: 720, y: 100 },
  "svc-basket": { x: 720, y: 190 },
  "svc-ordering": { x: 720, y: 280 },
  "svc-identity": { x: 720, y: 370 },
};

/* DB positions (to the right of each service) */
const DB_X = 860;

/* ── Phase → colour helper ───────────────────────────── */
const PHASE_BADGE: Record<string, { label: string; color: string }> = {
  overview: { label: "Overview", color: "#64748b" },
  "domain-analysis": { label: "Domain Analysis", color: "#a78bfa" },
  monolith: { label: "Monolith", color: "#f59e0b" },
  identifying: { label: "Identify Bounds", color: "#a78bfa" },
  checklist: { label: "Evaluate", color: "#22c55e" },
  "api-gateway": { label: "API Gateway", color: "#38bdf8" },
  "extract-catalog": { label: "Extract Catalog", color: "#818cf8" },
  "extract-basket": { label: "Extract Basket", color: "#34d399" },
  "extract-ordering": { label: "Extract Ordering", color: "#fb923c" },
  "extract-identity": { label: "Extract Identity", color: "#f472b6" },
  "db-isolation": { label: "DB-per-Service", color: "#c084fc" },
  traffic: { label: "Live Traffic", color: "#22c55e" },
  "fulfillment-flow": { label: "Fulfillment", color: "#fb923c" },
  "strangler-fig": { label: "Strangler Fig", color: "#f59e0b" },
  landscape: { label: "Landscape", color: "#38bdf8" },
  summary: { label: "Summary", color: "#64748b" },
};

/* ── Coupling label colour ───────────────────────────── */
const COUPLING_COLOR: Record<string, string> = {
  "1": "#22c55e",
  "2": "#22c55e",
  "3": "#22c55e",
  "4": "#84cc16",
  "5": "#f59e0b",
  "6": "#f97316",
  "7": "#ef4444",
  "8": "#ef4444",
  "9": "#ef4444",
  "10": "#ef4444",
};

const DecompositionVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } = useDecompositionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as DecompositionState;
  const {
    explanation,
    hotZones,
    phase,
    variant,
    services,
    couplingScore,
    autonomyScore,
    clarityScore,
  } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Derived ────────────────────────────────────────── */
  const phaseStr = phase as string;
  const apiGwVisible =
    phaseStr !== "overview" &&
    phaseStr !== "monolith" &&
    phaseStr !== "identifying" &&
    phaseStr !== "domain-analysis" &&
    phaseStr !== "checklist";

  const showDbPhase =
    phaseStr === "db-isolation" ||
    phaseStr === "traffic" ||
    phaseStr === "fulfillment-flow" ||
    phaseStr === "summary";

  /* Phases that use a completely separate scene */
  const isDomainAnalysis = phaseStr === "domain-analysis";
  const isChecklist = phaseStr === "checklist";
  const isFulfillmentFlow = phaseStr === "fulfillment-flow";
  const isStranglerFig = phaseStr === "strangler-fig";
  const isLandscape = phaseStr === "landscape";

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ═══════════════════════════════════════════════════════
     *  DOMAIN ANALYSIS — separate scene
     * ═══════════════════════════════════════════════════════ */
    if (isDomainAnalysis) {
      /* Column title labels */
      b.node("lbl-stories")
        .at(140, 30)
        .rect(200, 32, 8)
        .fill("#1e1b4b")
        .stroke("#818cf844", 1)
        .label("User Stories", {
          fill: "#c4b5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("lbl-nouns")
        .at(680, 30)
        .rect(200, 32, 8)
        .fill("#1e1b4b")
        .stroke("#818cf844", 1)
        .label("Domain Nouns", {
          fill: "#c4b5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      /* User story nodes */
      const stories = [
        {
          id: "story-products",
          y: 100,
          text: '"I want to list products"',
          color: "#818cf8",
        },
        {
          id: "story-cart",
          y: 190,
          text: '"I want to add to cart"',
          color: "#34d399",
        },
        {
          id: "story-checkout",
          y: 280,
          text: '"I want to checkout"',
          color: "#fb923c",
        },
        {
          id: "story-account",
          y: 370,
          text: '"I want to login & see orders"',
          color: "#f472b6",
        },
      ];

      stories.forEach(({ id, y, text, color }) => {
        b.node(id)
          .at(140, y)
          .rect(220, 48, 10)
          .fill(hot(id) ? `${color}22` : "#0f172a")
          .stroke(hot(id) ? color : "#334155", 2)
          .label(text, { fill: "#e2e8f0", fontSize: 10, fontWeight: "bold" });
      });

      /* Domain noun nodes — grouped by future service colour */
      const nouns = [
        /* Catalog group (purple) */
        {
          id: "noun-product",
          x: 600,
          y: 90,
          text: "Product",
          color: "#818cf8",
        },
        {
          id: "noun-category",
          x: 760,
          y: 90,
          text: "Category",
          color: "#818cf8",
        },
        {
          id: "noun-brand",
          x: 680,
          y: 145,
          text: "Brand",
          color: "#818cf8",
        },
        /* Basket group (green) */
        {
          id: "noun-cart",
          x: 600,
          y: 210,
          text: "Shopping Cart",
          color: "#34d399",
        },
        {
          id: "noun-item",
          x: 760,
          y: 210,
          text: "Cart Item",
          color: "#34d399",
        },
        /* Ordering group (orange) */
        {
          id: "noun-order",
          x: 600,
          y: 300,
          text: "Order",
          color: "#fb923c",
        },
        {
          id: "noun-address",
          x: 760,
          y: 300,
          text: "Address",
          color: "#fb923c",
        },
        /* Identity group (pink) */
        {
          id: "noun-customer",
          x: 600,
          y: 390,
          text: "Customer",
          color: "#f472b6",
        },
        {
          id: "noun-user",
          x: 760,
          y: 390,
          text: "User Account",
          color: "#f472b6",
        },
      ];

      nouns.forEach(({ id, x, y, text, color }) => {
        b.node(id)
          .at(x, y)
          .rect(120, 42, 8)
          .fill(hot(id) ? `${color}22` : "#0f172a")
          .stroke(hot(id) ? color : `${color}55`, 2)
          .label(text, { fill: color, fontSize: 10, fontWeight: "bold" });
      });

      /* Edges from stories to their primary nouns */
      b.edge("story-products", "noun-product", "e-sp")
        .stroke("#818cf844", 1.5)
        .arrow()
        .dashed();
      b.edge("story-cart", "noun-cart", "e-sc")
        .stroke("#34d39944", 1.5)
        .arrow()
        .dashed();
      b.edge("story-checkout", "noun-order", "e-so")
        .stroke("#fb923c44", 1.5)
        .arrow()
        .dashed();
      b.edge("story-account", "noun-customer", "e-sa")
        .stroke("#f472b644", 1.5)
        .arrow()
        .dashed();

      /* Arrow label */
      b.overlay((o) => {
        o.text({
          x: 410,
          y: 232,
          text: "→ Extract Nouns",
          fill: "#64748b",
          fontSize: 12,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        /* Group labels on right side */
        o.text({
          x: 680,
          y: 70,
          text: "Catalog",
          fill: "#818cf888",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 680,
          y: 190,
          text: "Basket",
          fill: "#34d39988",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 680,
          y: 280,
          text: "Ordering",
          fill: "#fb923c88",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 680,
          y: 370,
          text: "Identity",
          fill: "#f472b688",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
      });

      /* Signals overlay */
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
    }

    /* ═══════════════════════════════════════════════════════
     *  STRANGLER FIG — separate scene
     * ═══════════════════════════════════════════════════════ */
    if (isStranglerFig) {
      /* Client */
      b.node("sf-client")
        .at(80, 400)
        .rect(100, 44, 10)
        .fill("#0f172a")
        .stroke(hot("sf-client") ? "#60a5fa" : "#334155", 2)
        .label("Client", { fill: "#94a3b8", fontSize: 11, fontWeight: "bold" });

      /* Monolith (left — shrinking) */
      b.node("sf-monolith")
        .at(180, 180)
        .rect(180, 150, 14)
        .fill(hot("sf-monolith") ? "#1c1917" : "#111827")
        .stroke(hot("sf-monolith") ? "#f59e0b" : "#374151", 2)
        .label("Monolith", {
          fill: "#fbbf24",
          fontSize: 13,
          fontWeight: "bold",
        });

      /* Internal modules still inside monolith */
      b.node("sf-mod-identity")
        .at(180, 200)
        .rect(120, 36, 6)
        .fill("#f472b622")
        .stroke("#f472b6", 1)
        .label("Identity", {
          fill: "#f472b6",
          fontSize: 9,
          fontWeight: "bold",
        });

      /* Faded modules (already extracted) */
      const fadedMods = [
        {
          id: "sf-mod-catalog",
          label: "Catalog ✗",
          y: 145,
          x: 140,
          color: "#818cf8",
        },
        {
          id: "sf-mod-basket",
          label: "Basket ✗",
          y: 145,
          x: 230,
          color: "#34d399",
        },
        {
          id: "sf-mod-ordering",
          label: "Ordering ✗",
          y: 240,
          x: 180,
          color: "#fb923c",
        },
      ];
      fadedMods.forEach(({ id, label, x, y, color }) => {
        b.node(id)
          .at(x, y)
          .rect(80, 28, 4)
          .fill(`${color}08`)
          .stroke(`${color}33`, 1)
          .label(label, { fill: `${color}44`, fontSize: 8 });
      });

      /* Strangler Facade (center) */
      b.node("sf-facade")
        .at(440, 280)
        .rect(160, 56, 12)
        .fill(hot("sf-facade") ? "#0c2a40" : "#0f172a")
        .stroke(hot("sf-facade") ? "#f59e0b" : "#475569", 2)
        .label("Strangler Facade", {
          fill: "#fbbf24",
          fontSize: 12,
          fontWeight: "bold",
        });

      /* Extracted services (right) */
      const sfServices = [
        {
          id: "sf-catalog",
          label: "Catalog Svc",
          y: 100,
          color: "#818cf8",
        },
        {
          id: "sf-basket",
          label: "Basket Svc",
          y: 190,
          color: "#34d399",
        },
        {
          id: "sf-ordering",
          label: "Ordering Svc",
          y: 280,
          color: "#fb923c",
        },
        {
          id: "sf-identity",
          label: "Identity (next)",
          y: 370,
          color: "#f472b6",
        },
      ];
      sfServices.forEach(({ id, label, y, color }) => {
        b.node(id)
          .at(720, y)
          .rect(140, 48, 10)
          .fill(hot(id) ? `${color}33` : "#0f172a")
          .stroke(hot(id) ? color : `${color}88`, 2)
          .label(label, { fill: color, fontSize: 11, fontWeight: "bold" });
      });

      /* Edges */
      b.edge("sf-client", "sf-facade", "e-cf").stroke("#f59e0b55", 1.5).arrow();
      b.edge("sf-facade", "sf-monolith", "e-fm")
        .stroke("#f59e0b44", 1.5)
        .arrow()
        .dashed();
      b.edge("sf-facade", "sf-catalog", "e-fc")
        .stroke("#818cf855", 1.5)
        .arrow();
      b.edge("sf-facade", "sf-basket", "e-fb").stroke("#34d39955", 1.5).arrow();
      b.edge("sf-facade", "sf-ordering", "e-fo")
        .stroke("#fb923c55", 1.5)
        .arrow();
      b.edge("sf-facade", "sf-identity", "e-fi")
        .stroke("#f472b633", 1.5)
        .arrow()
        .dashed();

      /* Labels */
      b.overlay((o) => {
        o.text({
          x: 300,
          y: 340,
          text: "old route",
          fill: "#f59e0b88",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 590,
          y: 190,
          text: "new routes",
          fill: "#22c55e88",
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 440,
          y: 40,
          text: "Strangler Fig Migration",
          fill: "#94a3b8",
          fontSize: 14,
          fontWeight: "bold",
          textAnchor: "middle",
        });
      });

      /* Signals */
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
    }

    /* ═══════════════════════════════════════════════════════
     *  LANDSCAPE — separate scene
     * ═══════════════════════════════════════════════════════ */
    if (isLandscape) {
      /* API Gateway */
      b.node("ls-gw")
        .at(480, 30)
        .rect(140, 40, 8)
        .fill("#0c2a40")
        .stroke("#38bdf8", 2)
        .label("API Gateway", {
          fill: "#38bdf8",
          fontSize: 11,
          fontWeight: "bold",
        });

      /* ── Main Microservices group ─────────────── */
      b.node("ls-main-bg")
        .at(180, 168)
        .rect(320, 188, 14)
        .fill("#818cf80a")
        .stroke("#818cf833", 1);

      const mainSvcs = [
        { id: "ls-users", label: "Users", x: 80, y: 120 },
        { id: "ls-product", label: "Product", x: 200, y: 120 },
        { id: "ls-customers", label: "Customers", x: 320, y: 120 },
        { id: "ls-cart", label: "Shopping Cart", x: 80, y: 200 },
        { id: "ls-discount", label: "Discount", x: 200, y: 200 },
        { id: "ls-orders-m", label: "Orders", x: 320, y: 200 },
      ];
      mainSvcs.forEach(({ id, label, x, y }) => {
        b.node(id)
          .at(x, y)
          .rect(100, 38, 8)
          .fill(hot(id) ? "#818cf822" : "#0f172a")
          .stroke(hot(id) ? "#818cf8" : "#818cf866", 1.5)
          .label(label, {
            fill: "#818cf8",
            fontSize: 10,
            fontWeight: "bold",
          });
      });

      /* ── Order Transactional group ────────────── */
      b.node("ls-order-bg")
        .at(680, 168)
        .rect(320, 188, 14)
        .fill("#fb923c0a")
        .stroke("#fb923c33", 1);

      const orderSvcs = [
        { id: "ls-orders", label: "Orders", x: 580, y: 120 },
        { id: "ls-payment", label: "Payment", x: 700, y: 120 },
        { id: "ls-inventory", label: "Inventory", x: 820, y: 120 },
        { id: "ls-shipping", label: "Shipping", x: 580, y: 200 },
        { id: "ls-billing", label: "Billing", x: 700, y: 200 },
        { id: "ls-notif", label: "Notification", x: 820, y: 200 },
      ];
      orderSvcs.forEach(({ id, label, x, y }) => {
        b.node(id)
          .at(x, y)
          .rect(100, 38, 8)
          .fill(hot(id) ? "#fb923c22" : "#0f172a")
          .stroke(hot(id) ? "#fb923c" : "#fb923c66", 1.5)
          .label(label, {
            fill: "#fb923c",
            fontSize: 10,
            fontWeight: "bold",
          });
      });

      /* ── Intelligence group ───────────────────── */
      b.node("ls-intel-bg")
        .at(440, 390)
        .rect(560, 100, 14)
        .fill("#38bdf80a")
        .stroke("#38bdf833", 1);

      const intelSvcs = [
        { id: "ls-identity", label: "Identity", x: 220, y: 380 },
        { id: "ls-marketing", label: "Marketing", x: 350, y: 380 },
        { id: "ls-location", label: "Location", x: 480, y: 380 },
        { id: "ls-rating", label: "Rating", x: 610, y: 380 },
        { id: "ls-recommend", label: "Recommendation", x: 740, y: 380 },
      ];
      intelSvcs.forEach(({ id, label, x, y }) => {
        b.node(id)
          .at(x, y)
          .rect(110, 38, 8)
          .fill(hot(id) ? "#38bdf822" : "#0f172a")
          .stroke(hot(id) ? "#38bdf8" : "#38bdf866", 1.5)
          .label(label, {
            fill: "#38bdf8",
            fontSize: 10,
            fontWeight: "bold",
          });
      });

      /* Edges from gateway */
      b.edge("ls-gw", "ls-product", "lg1")
        .stroke("#818cf844", 1.5)
        .arrow()
        .dashed();
      b.edge("ls-gw", "ls-cart", "lg2")
        .stroke("#818cf844", 1.5)
        .arrow()
        .dashed();
      b.edge("ls-gw", "ls-orders", "lg3")
        .stroke("#fb923c44", 1.5)
        .arrow()
        .dashed();
      b.edge("ls-gw", "ls-payment", "lg4")
        .stroke("#fb923c44", 1.5)
        .arrow()
        .dashed();
      b.edge("ls-gw", "ls-identity", "lg5")
        .stroke("#38bdf844", 1.5)
        .arrow()
        .dashed();

      /* Group labels */
      b.overlay((o) => {
        o.text({
          x: 180,
          y: 88,
          text: "Main Microservices",
          fill: "#818cf8aa",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 680,
          y: 88,
          text: "Order Transactional",
          fill: "#fb923caa",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        });
        o.text({
          x: 440,
          y: 350,
          text: "Intelligence Microservices",
          fill: "#38bdf8aa",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        });
      });

      /* Signals */
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
    }

    /* ═══════════════════════════════════════════════════════
     *  STANDARD SCENES (monolith, extraction, traffic, etc.)
     * ═══════════════════════════════════════════════════════ */

    /* ── Clients ─────────────────────────────────────── */
    b.node("client-web")
      .at(CLIENT_WEB_X, CLIENT_WEB_Y)
      .rect(110, 44, 10)
      .fill(hot("client-web") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client-web") ? "#60a5fa" : "#334155", 2)
      .label("Web (SPA)", {
        fill: "#94a3b8",
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("client-mobile")
      .at(CLIENT_MOB_X, CLIENT_MOB_Y)
      .rect(110, 44, 10)
      .fill(hot("client-mobile") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client-mobile") ? "#60a5fa" : "#334155", 2)
      .label("Mobile", { fill: "#94a3b8", fontSize: 11, fontWeight: "bold" });

    /* ── API Gateway ─────────────────────────────────── */
    if (apiGwVisible) {
      b.node("api-gateway")
        .at(API_GW_X, API_GW_Y)
        .rect(160, 50, 10)
        .fill(hot("api-gateway") ? "#0c2a40" : "#0f172a")
        .stroke(hot("api-gateway") ? "#38bdf8" : "#334155", 2)
        .label("API Gateway", {
          fill: "#38bdf8",
          fontSize: 12,
          fontWeight: "bold",
        });
    }

    /* ── Monolith block ──────────────────────────────── */
    const allExtracted = services.every((s: ServiceNode) => s.extracted);
    const someExtracted = services.some((s: ServiceNode) => s.extracted);

    if (!allExtracted) {
      const monoAlpha = someExtracted ? 0.5 : 1;

      b.node("monolith")
        .at(MONOLITH_X, MONOLITH_Y)
        .rect(220, 180, 16)
        .fill(hot("monolith") ? "#1c1917" : "#111827")
        .stroke(hot("monolith") ? "#f59e0b" : "#374151", 2)
        .label("Monolith", {
          fill: `rgba(251,191,36,${monoAlpha})`,
          fontSize: 14,
          fontWeight: "bold",
        });

      /* Internal boundary rectangles (visible in identifying phase) */
      if (phaseStr === "identifying" || someExtracted) {
        const INNER = [
          {
            id: "b-catalog",
            label: "Catalog",
            color: "#818cf8",
            x: MONOLITH_X - 70,
            y: MONOLITH_Y - 50,
          },
          {
            id: "b-basket",
            label: "Basket",
            color: "#34d399",
            x: MONOLITH_X + 30,
            y: MONOLITH_Y - 50,
          },
          {
            id: "b-ordering",
            label: "Ordering",
            color: "#fb923c",
            x: MONOLITH_X - 70,
            y: MONOLITH_Y + 20,
          },
          {
            id: "b-identity",
            label: "Identity",
            color: "#f472b6",
            x: MONOLITH_X + 30,
            y: MONOLITH_Y + 20,
          },
        ];
        const svcMap = Object.fromEntries(
          services.map((s: ServiceNode) => [s.id, s]),
        );

        INNER.forEach(({ id, label, color, x, y }) => {
          const svcId = id.replace("b-", "svc-");
          const extracted = svcMap[svcId]?.extracted ?? false;
          if (!extracted) {
            b.node(id)
              .at(x, y)
              .rect(90, 56, 8)
              .fill(`${color}22`)
              .stroke(color, 1.5)
              .label(label, { fill: color, fontSize: 10, fontWeight: "bold" });
          }
        });
      }
    }

    /* ── Extracted services ──────────────────────────── */
    services.forEach((svc: ServiceNode) => {
      if (!svc.extracted) return;
      const pos = SVC_POSITIONS[svc.id];
      if (!pos) return;

      b.node(svc.id)
        .at(pos.x, pos.y)
        .rect(120, 52, 10)
        .fill(hot(svc.id) ? `${svc.color}33` : "#0f172a")
        .stroke(hot(svc.id) ? svc.color : `${svc.color}88`, 2)
        .label(svc.label, {
          fill: svc.color,
          fontSize: 12,
          fontWeight: "bold",
        });

      /* API Gateway → service edge */
      if (apiGwVisible) {
        b.edge("api-gateway", svc.id, `gw-${svc.id}`)
          .stroke(`${svc.color}55`, 1.5)
          .arrow();
      }

      /* DB node (only in db-isolation / traffic / summary phases) */
      if (showDbPhase) {
        const dbId = `db-${svc.id}`;
        b.node(dbId)
          .at(DB_X, pos.y)
          .rect(90, 42, 8)
          .fill(hot(svc.id) ? `${svc.color}22` : "#0a0f1a")
          .stroke(`${svc.color}66`, 1.5)
          .label(svc.dbType, { fill: `${svc.color}cc`, fontSize: 9 });

        b.edge(svc.id, dbId, `edge-${svc.id}-db`)
          .stroke(`${svc.color}44`, 1.5)
          .arrow();
      }
    });

    /* ── Client → gateway edges (traffic phase) ──────── */
    if (apiGwVisible) {
      b.edge("client-web", "api-gateway", "edge-web-gw")
        .stroke("#38bdf855", 1.5)
        .arrow()
        .dashed();
      b.edge("client-mobile", "api-gateway", "edge-mob-gw")
        .stroke("#38bdf855", 1.5)
        .arrow()
        .dashed();
    }

    /* ── Checklist nodes (checklist phase) ────────────── */
    if (isChecklist) {
      const checks = [
        { id: "check-srp", y: 70, text: "✓ Single Responsibility" },
        { id: "check-size", y: 130, text: "✓ Appropriate Size" },
        { id: "check-comm", y: 190, text: "✓ Communication Patterns" },
        { id: "check-data", y: 250, text: "✓ Data Ownership" },
        { id: "check-deploy", y: 310, text: "✓ Independent Deployability" },
        { id: "check-autonomy", y: 370, text: "✓ Team Autonomy" },
        { id: "check-business", y: 430, text: "✓ Business Alignment" },
      ];

      checks.forEach(({ id, y, text }, i) => {
        b.node(id)
          .at(740, y)
          .rect(200, 42, 8)
          .fill(hot(id) ? "#22c55e18" : "#0f172a")
          .stroke(hot(id) ? "#22c55e" : "#334155", 1.5)
          .label(text, {
            fill: hot(id) ? "#22c55e" : "#94a3b8",
            fontSize: 10,
            fontWeight: "bold",
          });

        /* Chain edges between checklist items */
        if (i > 0) {
          b.edge(checks[i - 1].id, id, `ck-e-${i}`)
            .stroke("#22c55e33", 1)
            .arrow();
        }
      });

      b.overlay((o) => {
        o.text({
          x: 740,
          y: 40,
          text: "Decomposition Checklist",
          fill: "#22c55eaa",
          fontSize: 12,
          fontWeight: "bold",
          textAnchor: "middle",
        });
      });
    }

    /* ── Fulfillment flow nodes (fulfillment-flow phase) ─ */
    if (isFulfillmentFlow) {
      const ffNodes = [
        {
          id: "ff-create",
          x: 100,
          y: 400,
          text: "Create Order",
          sub: "Ordering",
          color: "#fb923c",
        },
        {
          id: "ff-payment",
          x: 270,
          y: 400,
          text: "Validate Payment",
          sub: "Payment",
          color: "#f472b6",
        },
        {
          id: "ff-inventory",
          x: 440,
          y: 400,
          text: "Update Inventory",
          sub: "Inventory",
          color: "#818cf8",
        },
        {
          id: "ff-shipment",
          x: 610,
          y: 400,
          text: "Shipment",
          sub: "Shipping",
          color: "#34d399",
        },
        {
          id: "ff-notify",
          x: 780,
          y: 400,
          text: "Notify",
          sub: "Notification",
          color: "#38bdf8",
        },
        {
          id: "ff-complete",
          x: 100,
          y: 490,
          text: "Complete Order",
          sub: "Ordering",
          color: "#22c55e",
        },
      ];

      ffNodes.forEach(({ id, x, y, text, color }) => {
        b.node(id)
          .at(x, y)
          .rect(140, 48, 10)
          .fill(hot(id) ? `${color}22` : "#0f172a")
          .stroke(hot(id) ? color : `${color}88`, 2)
          .label(text, { fill: color, fontSize: 10, fontWeight: "bold" });
      });

      /* Chain edges */
      for (let i = 1; i < ffNodes.length; i++) {
        b.edge(ffNodes[i - 1].id, ffNodes[i].id, `ff-e-${i}`)
          .stroke(`${ffNodes[i].color}44`, 1.5)
          .arrow();
      }

      /* Service ownership labels */
      b.overlay((o) => {
        ffNodes.forEach(({ id, sub, color }) => {
          o.text({
            nodeId: id,
            offsetX: 0,
            offsetY: 30,
            text: sub,
            fill: `${color}88`,
            fontSize: 8,
            fontWeight: "bold",
            textAnchor: "middle",
          });
        });
        o.text({
          x: 440,
          y: 360,
          text: "Order Fulfillment Process",
          fill: "#94a3b8",
          fontSize: 12,
          fontWeight: "bold",
          textAnchor: "middle",
        });
      });
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

  /* ── Mount / destroy VizCraft scene ─────────────────── */
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
        initialPan: saved?.pan ?? { x: 20, y: 20 },
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

  /* ── Derived sidebar data ─────────────────────────── */
  const phaseBadge = PHASE_BADGE[phase as string] ?? PHASE_BADGE.overview;
  const extractedServices = services.filter((s: ServiceNode) => s.extracted);
  const remainingServices = services.filter((s: ServiceNode) => !s.extracted);
  const activeSteps = buildSteps(st);

  /* ── Pill definitions ─────────────────────────────── */
  const pills = [
    {
      key: "decomposition",
      label: "Decomposition",
      color: "#c4b5fd",
      borderColor: "#818cf8",
    },
    {
      key: "domain-analysis",
      label: "Domain Analysis",
      color: "#c4b5fd",
      borderColor: "#a78bfa",
    },
    {
      key: "business-capability",
      label: "Business Capability",
      color: "#c4b5fd",
      borderColor: "#818cf8",
    },
    {
      key: "subdomain-ddd",
      label: "Subdomain / DDD",
      color: "#7dd3fc",
      borderColor: "#38bdf8",
    },
    {
      key: "size-based",
      label: "Size-Based",
      color: "#fdba74",
      borderColor: "#fb923c",
    },
    {
      key: "eval-checklist",
      label: "Eval Checklist",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "coupling",
      label: "Coupling",
      color: "#d8b4fe",
      borderColor: "#a78bfa",
    },
    {
      key: "db-per-service",
      label: "DB-per-Service",
      color: "#e9d5ff",
      borderColor: "#c084fc",
    },
    {
      key: "fulfillment",
      label: "Fulfillment",
      color: "#fdba74",
      borderColor: "#fb923c",
    },
    {
      key: "strangler-fig",
      label: "Strangler Fig",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
  ] satisfies {
    key: ConceptKey;
    label: string;
    color: string;
    borderColor: string;
  }[];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`decomposition-root decomposition-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="decomposition-stage">
            <StageHeader
              title="Microservices Decomposition Lab"
              subtitle={`Strategy: ${profile.label} — ${profile.tagline}`}
            >
              <StatBadge
                label="Phase"
                value={phaseBadge.label}
                color={phaseBadge.color}
                className="decomposition-phase-badge"
              />
              <StatBadge
                label="Coupling"
                value={`${couplingScore}/10`}
                color={COUPLING_COLOR[String(couplingScore)] ?? "#f59e0b"}
              />
              <StatBadge label="Autonomy" value={`${autonomyScore}/10`} />
              <StatBadge label="Clarity" value={`${clarityScore}/10`} />
              <StatBadge
                label="Extracted"
                value={`${extractedServices.length}/${services.length}`}
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            {/* Explanation card */}
            <SideCard label="What's happening" variant="explanation">
              {explanation.split("\n\n").map((para, i) => (
                <p key={i} style={i > 0 ? { marginTop: 8 } : undefined}>
                  {para}
                </p>
              ))}
            </SideCard>

            {/* Strategy card */}
            <SideCard label="Active Strategy" variant="info">
              <p
                style={{
                  color: profile.color,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {profile.label}
              </p>
              <p>{profile.description}</p>
            </SideCard>

            {/* Progress card — shown once extraction has started */}
            {(extractedServices.length > 0 ||
              remainingServices.length < services.length) && (
              <SideCard label="Extraction Progress" variant="info">
                {extractedServices.length > 0 && (
                  <div className="decomposition-progress">
                    <span className="decomposition-progress__heading">
                      Extracted
                    </span>
                    {extractedServices.map((s: ServiceNode) => (
                      <div
                        key={s.id}
                        className="decomposition-progress__item decomposition-progress__item--done"
                      >
                        <span
                          className="decomposition-progress__dot"
                          style={{ background: s.color }}
                        />
                        <span>{s.label}</span>
                        <span className="decomposition-progress__db">
                          {s.dbType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {remainingServices.length > 0 && (
                  <div
                    className="decomposition-progress"
                    style={{ marginTop: extractedServices.length > 0 ? 8 : 0 }}
                  >
                    <span
                      className="decomposition-progress__heading"
                      style={{ color: "#64748b" }}
                    >
                      Remaining
                    </span>
                    {remainingServices.map((s: ServiceNode) => (
                      <div key={s.id} className="decomposition-progress__item">
                        <span
                          className="decomposition-progress__dot"
                          style={{ background: `${s.color}55` }}
                        />
                        <span style={{ color: "#64748b" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SideCard>
            )}

            {/* Metrics card — shown from summary onwards */}
            {phaseStr === "summary" && (
              <SideCard label="Strategy Metrics" variant="info">
                <div className="decomposition-metrics">
                  <div className="decomposition-metrics__row">
                    <span>Coupling</span>
                    <span className="decomposition-metrics__bar">
                      <span
                        className="decomposition-metrics__fill"
                        style={{
                          width: `${couplingScore * 10}%`,
                          background:
                            COUPLING_COLOR[String(couplingScore)] ?? "#f59e0b",
                        }}
                      />
                    </span>
                    <span className="decomposition-metrics__val">
                      {profile.couplingLabel}
                    </span>
                  </div>
                  <div className="decomposition-metrics__row">
                    <span>Team Autonomy</span>
                    <span className="decomposition-metrics__bar">
                      <span
                        className="decomposition-metrics__fill"
                        style={{
                          width: `${autonomyScore * 10}%`,
                          background: "#34d399",
                        }}
                      />
                    </span>
                    <span className="decomposition-metrics__val">
                      {profile.autonomyLabel}
                    </span>
                  </div>
                  <div className="decomposition-metrics__row">
                    <span>Boundary Clarity</span>
                    <span className="decomposition-metrics__bar">
                      <span
                        className="decomposition-metrics__fill"
                        style={{
                          width: `${clarityScore * 10}%`,
                          background: "#818cf8",
                        }}
                      />
                    </span>
                    <span className="decomposition-metrics__val">
                      {profile.complexityLabel}
                    </span>
                  </div>
                </div>
                <p className="decomposition-metrics__hint">
                  Switch strategy above and hit Replay to compare.
                </p>
              </SideCard>
            )}

            {/* Steps map */}
            {activeSteps.length > 0 && (
              <SideCard label="Steps" variant="info">
                <ol className="decomposition-steps-list">
                  {activeSteps.map((step) => (
                    <li
                      key={step.key}
                      className={`decomposition-steps-list__item${phaseStr === step.key ? " decomposition-steps-list__item--active" : ""}`}
                    >
                      {step.label}
                    </li>
                  ))}
                </ol>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default DecompositionVisualization;
