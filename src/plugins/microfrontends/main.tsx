import React, { useMemo, useLayoutEffect, useRef, useEffect } from "react";
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
import { useMicrofrontendsAnimation } from "./useMicrofrontendsAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1200;
const H = 680;

/* ── Colour palette ────────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  violet: "#a78bfa",
  violetFill: "#2e1065",
  purple: "#c084fc",
  purpleFill: "#1a0533",
  green: "#34d399",
  greenFill: "#064e3b",
  amber: "#fbbf24",
  amberFill: "#451a03",
  red: "#f87171",
  redFill: "#450a0a",
  cyan: "#06b6d4",
  cyanFill: "#083344",
  iframeBorder: "#f59e0b",
};

const MicrofrontendsVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, currentStep, signals, phase } =
    useMicrofrontendsAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    explanation,
    hotZones,
    showEntries,
    showShared,
    showIframe,
    showDuplicateDeps,
    showHooksCrash,
    showVersionMismatch,
    failedRemote,
    showFallback,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    /* ── Shell background overlay ─────────────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 130,
          y: 78,
          w: 940,
          h: 340,
          rx: 16,
          ry: 16,
          fill: hot("shell")
            ? "rgba(30, 64, 175, 0.08)"
            : "rgba(15, 23, 42, 0.45)",
          stroke: hot("shell")
            ? "rgba(59, 130, 246, 0.38)"
            : "rgba(51, 65, 85, 0.5)",
          strokeWidth: hot("shell") ? 2 : 1,
          opacity: 1,
        },
        { key: "shell-bg" },
      );
      o.add(
        "text",
        {
          x: 150,
          y: 73,
          text: "HOST SHELL",
          fill: hot("shell") ? C.blue : "#475569",
          fontSize: 11,
          fontWeight: "bold",
        },
        { key: "shell-lbl" },
      );
    });

    /* ── User node ──────────────────────────────────── */
    b.node("user")
      .at(600, 30)
      .circle(15)
      .fill("#1e293b")
      .stroke("#64748b", 1.5)
      .label("User", { fill: C.muted, fontSize: 10, dy: 24 });

    /* ── Shell top bar ──────────────────────────────── */
    b.node("router")
      .at(240, 118)
      .rect(105, 32, 8)
      .fill(hot("router") ? C.blueFill : C.bg)
      .stroke(hot("router") ? C.blue : C.dim, 1.5)
      .label("Router", {
        fill: hot("router") ? "#93c5fd" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("auth")
      .at(400, 118)
      .rect(120, 32, 8)
      .fill(hot("auth") ? C.blueFill : C.bg)
      .stroke(hot("auth") ? C.blue : C.dim, 1.5)
      .label("Auth Context", {
        fill: hot("auth") ? "#93c5fd" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("nav")
      .at(570, 118)
      .rect(115, 32, 8)
      .fill(hot("nav") ? C.blueFill : C.bg)
      .stroke(hot("nav") ? C.blue : C.dim, 1.5)
      .label("Shared Nav", {
        fill: hot("nav") ? "#93c5fd" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("mf-runtime")
      .at(750, 118)
      .rect(140, 32, 8)
      .fill(hot("mf-runtime") ? C.violetFill : C.bg)
      .stroke(hot("mf-runtime") ? C.violet : C.dim, 1.5)
      .label("MF Runtime", {
        fill: hot("mf-runtime") ? "#c4b5fd" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    /* ── MFE Slots ──────────────────────────────────── */
    const slots = [
      {
        id: "slot-a",
        x: 260,
        label: "Dashboard",
        route: "/dashboard",
        hotStroke: C.green,
        hotFill: C.greenFill,
      },
      {
        id: "slot-b",
        x: 600,
        label: "Products",
        route: "/products",
        hotStroke: C.amber,
        hotFill: C.amberFill,
      },
      {
        id: "slot-c",
        x: 940,
        label: "Settings",
        route: "/settings",
        hotStroke: C.red,
        hotFill: C.redFill,
      },
    ];

    for (const s of slots) {
      const isHot = hot(s.id);
      const isFailed = failedRemote === "c" && s.id === "slot-c";
      const isIframed = showIframe && s.id === "slot-b";

      b.node(s.id)
        .at(s.x, 280)
        .rect(200, 210, 12)
        .fill(isFailed ? C.redFill : isHot ? s.hotFill : C.bg)
        .stroke(
          isFailed
            ? "#ef4444"
            : isIframed
              ? C.iframeBorder
              : isHot
                ? s.hotStroke
                : C.dim,
          isFailed || isIframed ? 2.5 : isHot ? 2 : 1,
        )
        .label(showFallback && s.id === "slot-c" ? "⚠ Fallback UI" : s.label, {
          fill: isFailed ? "#fca5a5" : isHot ? s.hotStroke : C.text,
          fontSize: 13,
          fontWeight: "bold",
          dy: -20,
        });
    }

    /* ── Slot inner overlays (routes + wireframes) ──── */
    b.overlay((o) => {
      for (const s of slots) {
        const isHot = hot(s.id);
        o.add(
          "text",
          {
            x: s.x,
            y: 290,
            text: s.route,
            fill: isHot ? "#cbd5e1" : "#475569",
            fontSize: 10,
          },
          { key: `${s.id}-route` },
        );
      }

      for (const s of slots) {
        const isFailed = failedRemote === "c" && s.id === "slot-c";
        if (showFallback && s.id === "slot-c") continue;
        for (let j = 0; j < 3; j++) {
          const w = j === 0 ? 120 : j === 1 ? 150 : 90;
          o.add(
            "rect",
            {
              x: s.x - w / 2,
              y: 310 + j * 32,
              w,
              h: 16,
              rx: 3,
              ry: 3,
              fill: isFailed
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(71, 85, 105, 0.12)",
              stroke: isFailed
                ? "rgba(239, 68, 68, 0.2)"
                : "rgba(71, 85, 105, 0.2)",
              strokeWidth: 0.5,
              opacity: 1,
            },
            { key: `wf-${s.id}-${j}` },
          );
        }
      }
    });

    /* ── remoteEntry.js nodes ───────────────────────── */
    if (showEntries) {
      const entries = [
        { id: "entry-a", x: 260 },
        { id: "entry-b", x: 600 },
        { id: "entry-c", x: 940 },
      ];
      for (const e of entries) {
        const isHot = hot(e.id);
        const isFailed = failedRemote === "c" && e.id === "entry-c";
        b.node(e.id)
          .at(e.x, 488)
          .rect(138, 26, 6)
          .fill(isFailed ? C.redFill : isHot ? C.purpleFill : C.bg)
          .stroke(isFailed ? "#ef4444" : isHot ? C.purple : C.dim, 1.5)
          .label("remoteEntry.js", {
            fill: isFailed ? "#fca5a5" : isHot ? "#d8b4fe" : C.muted,
            fontSize: 10,
            fontWeight: "bold",
          });
      }
    }

    /* ── Remote build servers ───────────────────────── */
    const remotes = [
      { id: "remote-a", x: 260, label: "Team A · CI/CD", color: C.green },
      { id: "remote-b", x: 600, label: "Team B · CI/CD", color: C.amber },
      { id: "remote-c", x: 940, label: "Team C · CI/CD", color: C.red },
    ];
    for (const r of remotes) {
      const isHot = hot(r.id);
      b.node(r.id)
        .at(r.x, 568)
        .rect(155, 38, 8)
        .fill(C.bg)
        .stroke(isHot ? r.color : C.dim, isHot ? 2 : 1)
        .label(r.label, {
          fill: isHot ? r.color : C.muted,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    /* ── Shared dependencies ────────────────────────── */
    if (showShared) {
      const isHot = hot("shared");
      b.node("shared")
        .at(600, 645)
        .rect(520, 28, 8)
        .fill(isHot ? C.cyanFill : C.bg)
        .stroke(isHot ? C.cyan : C.dim, 1.5)
        .label("Shared: React · ReactDOM · Router", {
          fill: isHot ? "#67e8f9" : C.muted,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    /* ── Edges ──────────────────────────────────────── */

    // User → Router
    if (currentStep >= 1) {
      b.edge("user", "router", "e-nav")
        .stroke(hot("router") ? C.blue : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Router → MF Runtime (internal hand-off)
    if (currentStep >= 6) {
      b.edge("router", "mf-runtime", "e-handoff")
        .stroke(hot("router") || hot("mf-runtime") ? C.blue : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Build → Entry
    if (showEntries) {
      const pairs = [
        ["remote-a", "entry-a"],
        ["remote-b", "entry-b"],
        ["remote-c", "entry-c"],
      ];
      for (const [from, to] of pairs) {
        b.edge(from, to, `e-build-${to.slice(-1)}`)
          .stroke(hot(from) || hot(to) ? C.purple : C.dimEdge, 1.5)
          .arrow(true);
      }
    }

    // MF Runtime → Entries (discovery / resolve)
    if (showEntries && currentStep >= 5) {
      for (const t of ["entry-a", "entry-b", "entry-c"]) {
        b.edge("mf-runtime", t, `e-disc-${t.slice(-1)}`)
          .stroke(hot("mf-runtime") || hot(t) ? C.violet : C.dimEdge, 1.5)
          .arrow(true)
          .dashed();
      }
    }

    // Entry → Slot (mount)
    if (showEntries && currentStep >= 6) {
      const mounts: [string, string, string][] = [
        ["entry-a", "slot-a", C.green],
        ["entry-b", "slot-b", C.amber],
        ["entry-c", "slot-c", C.red],
      ];
      for (const [from, to, color] of mounts) {
        b.edge(from, to, `e-mount-${to.slice(-1)}`)
          .stroke(hot(to) ? color : C.dimEdge, 1.5)
          .arrow(true);
      }
    }

    /* ── Step-specific overlays ─────────────────────── */
    b.overlay((o) => {
      // Iframe label + postMessage indicator
      if (showIframe) {
        o.add(
          "text",
          {
            x: 600,
            y: 168,
            text: "〈iframe〉",
            fill: C.iframeBorder,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "iframe-lbl" },
        );
        o.add(
          "text",
          {
            x: 600,
            y: 398,
            text: "↕ postMessage",
            fill: "#92400e",
            fontSize: 10,
          },
          { key: "postmsg" },
        );
      }

      // Failure X overlay
      if (failedRemote === "c" && !showFallback) {
        o.add(
          "text",
          {
            x: 940,
            y: 290,
            text: "✗",
            fill: "#ef4444",
            fontSize: 48,
            fontWeight: "bold",
          },
          { key: "fail-x" },
        );
      }

      // Fallback content
      if (showFallback) {
        o.add(
          "text",
          {
            x: 940,
            y: 306,
            text: "Something went wrong.",
            fill: "#fca5a5",
            fontSize: 11,
          },
          { key: "fb-msg" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 326,
            text: "Try again later.",
            fill: C.text,
            fontSize: 10,
          },
          { key: "fb-sub" },
        );
      }

      // Duplicate dependency warning overlays (Step 3: The Glue Problem)
      if (showDuplicateDeps) {
        const dupes = [
          { x: 260, label: "React 18 📦 (copy 1)" },
          { x: 600, label: "React 18 📦 (copy 2)" },
          { x: 940, label: "React 18 📦 (copy 3)" },
        ];
        for (const d of dupes) {
          o.add(
            "rect",
            {
              x: d.x - 72,
              y: 395,
              w: 144,
              h: 24,
              rx: 6,
              ry: 6,
              fill: "rgba(239, 68, 68, 0.12)",
              stroke: "rgba(239, 68, 68, 0.4)",
              strokeWidth: 1.5,
              opacity: 1,
            },
            { key: `dup-bg-${d.x}` },
          );
          o.add(
            "text",
            {
              x: d.x,
              y: 411,
              text: d.label,
              fill: "#fca5a5",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: `dup-lbl-${d.x}` },
          );
        }
        o.add(
          "text",
          {
            x: 600,
            y: 440,
            text: showHooksCrash
              ? "⚠ Two React instances → hooks break!"
              : "⚠ 3× React downloaded — wasteful!",
            fill: "#f87171",
            fontSize: 13,
            fontWeight: "bold",
          },
          { key: "dup-warning" },
        );
      }

      // Hooks crash overlay (Step 4)
      if (showHooksCrash) {
        // Error box inside Dashboard slot
        o.add(
          "rect",
          {
            x: 260 - 88,
            y: 305,
            w: 176,
            h: 72,
            rx: 8,
            ry: 8,
            fill: "rgba(239, 68, 68, 0.15)",
            stroke: "#ef4444",
            strokeWidth: 2,
            opacity: 1,
          },
          { key: "crash-box" },
        );
        o.add(
          "text",
          {
            x: 260,
            y: 325,
            text: "❌ Invalid hook call",
            fill: "#fca5a5",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "crash-title" },
        );
        o.add(
          "text",
          {
            x: 260,
            y: 345,
            text: "useState() grabbed React B's",
            fill: "#94a3b8",
            fontSize: 10,
          },
          { key: "crash-line1" },
        );
        o.add(
          "text",
          {
            x: 260,
            y: 360,
            text: "walkie-talkie — but it's silent",
            fill: "#94a3b8",
            fontSize: 10,
          },
          { key: "crash-line2" },
        );
      }

      // Version mismatch overlay (Step 9)
      if (showVersionMismatch) {
        // Settings slot shows version conflict
        o.add(
          "rect",
          {
            x: 940 - 92,
            y: 305,
            w: 184,
            h: 82,
            rx: 8,
            ry: 8,
            fill: "rgba(251, 191, 36, 0.1)",
            stroke: "#f59e0b",
            strokeWidth: 2,
            opacity: 1,
          },
          { key: "ver-box" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 322,
            text: "⚠ Version conflict",
            fill: "#fbbf24",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "ver-title" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 342,
            text: "Host: React 18.2",
            fill: "#67e8f9",
            fontSize: 10,
          },
          { key: "ver-host" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 357,
            text: "Settings wants: React 19.0",
            fill: "#fca5a5",
            fontSize: 10,
          },
          { key: "ver-remote" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 377,
            text: "strictVersion? → refuse to load",
            fill: "#94a3b8",
            fontSize: 9,
          },
          { key: "ver-strict" },
        );
      }

      // Signals
      signals.forEach((sig) => {
        const { id, ...params } = sig;
        o.add("signal", params as SignalOverlayParams, { key: id });
      });
    });

    return b;
  }, [
    currentStep,
    hotZones,
    showEntries,
    showShared,
    showIframe,
    showDuplicateDeps,
    showHooksCrash,
    showVersionMismatch,
    failedRemote,
    showFallback,
    signals,
  ]);

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
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
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

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    {
      key: "micro-frontends",
      label: "Micro-frontends",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "the-problem",
      label: "Why Module Fed?",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "hooks-crash",
      label: "Hooks Crash",
      color: "#fca5a5",
      borderColor: "#dc2626",
    },
    {
      key: "version-mismatch",
      label: "Version Mismatch",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "module-federation",
      label: "Module Federation",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "remote-entry",
      label: "remoteEntry.js",
      color: "#86efac",
      borderColor: "#10b981",
    },
    {
      key: "shared-deps",
      label: "Shared Deps",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "iframe-isolation",
      label: "Iframe",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "error-boundary",
      label: "Error Boundary",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "strategy-comparison",
      label: "Strategies",
      color: "#d8b4fe",
      borderColor: "#a855f7",
    },
  ];

  /* ── Phase subtitle ─────────────────────────────────── */
  const subtitles: Record<string, string> = {
    overview: "One giant app, all teams tangled together",
    "host-shell": "The building — hallways, security, and empty rooms",
    remotes: "Three teams, three separate apps, ship anytime",
    "glue-problem": "Without sharing, every app bundles its own React",
    "hooks-crash": "Two React copies → hooks break → app crashes",
    expose: "Each team publishes a tiny 'menu' — remoteEntry.js",
    discovery: "The Host reads the menus to learn what's available",
    "lazy-load": "Download only the code you actually need",
    "shared-deps": "One copy of React for everyone — the whole point",
    "version-mismatch": "What if one team ships a different React version?",
    iframe: "Glass wall isolation — safe but limited",
    failure: "One app breaks, the rest keep working",
    summary: "Choose the right strategy for your team",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="microfrontends-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="microfrontends-stage">
            <StageHeader
              title="Microfrontends"
              subtitle={subtitles[phase] ?? ""}
            >
              <StatBadge
                label="Phase"
                value={phase.replace(/-/g, " ")}
                className={`microfrontends-phase microfrontends-phase--${phase}`}
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
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default MicrofrontendsVisualization;
