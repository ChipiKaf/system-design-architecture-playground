import React, { useLayoutEffect, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
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
import { tickCacheAge } from "./httpCachingSlice";
import { useHttpCachingAnimation } from "./useHttpCachingAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 940;
const H = 520;

const HttpCachingVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const dispatch = useDispatch();
  const { runtime, signals } = useHttpCachingAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    components,
    clients,
    cachePolicy,
    cacheTtlSeconds,
    cacheAgeSeconds,
    cacheExpired,
    latencyMs,
    browserHitRate,
    cdnHitRate,
    originRequests,
    totalRequests,
    explanation,
    hotZones,
    phase,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  /* ── TTL countdown timer ─────────────────────────────────── */
  useEffect(() => {
    if (
      cachePolicy !== "max-age" ||
      !components.browserCache ||
      cacheExpired ||
      phase === "overview"
    )
      return;
    const id = setInterval(() => {
      dispatch(tickCacheAge());
    }, 1000);
    return () => clearInterval(id);
  }, [cachePolicy, components.browserCache, cacheExpired, phase, dispatch]);
  /* ── Build VizCraft scene ─────────────────────────────
   *
   *  Layout (vertical, dynamic):
   *
   *  [Clients row]
   *       ↓
   *  [Internet]
   *       ↓
   *  [Browser Cache]?   ← only if browserCache ON
   *       ↓
   *  [CDN Edge]?        ← only if cdn ON
   *       ↓
   *  [Origin Server]    ← always present
   * ──────────────────────────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);
    let nextY = 30;

    /* ── Clients row ─────────────────────────────────── */
    const clientRowWidth = (clients.length - 1) * 72 + 56;
    const clientStartX = Math.max(80, W / 2 - clientRowWidth / 2);
    clients.forEach((client, i) => {
      const x = clientStartX + i * 72;
      b.node(client.id)
        .at(x, nextY)
        .rect(56, 40, 8)
        .fill(hot(client.id) ? "#1e3a8a" : "#0f172a")
        .stroke(hot(client.id) ? "#60a5fa" : "#334155", 1.4)
        .image(
          client.type === "mobile" ? "/mobile.svg" : "/mobile.svg",
          20,
          20,
          { dy: -5, position: "center" },
        );
      b.node(client.id).label(`${i + 1}`, {
        fill: "#94a3b8",
        fontSize: 8,
        dy: 13,
      });
    });
    nextY += 75;

    /* ── Internet ────────────────────────────────────── */
    b.node("internet")
      .at(W / 2 - 70, nextY)
      .rect(140, 52, 14)
      .fill(hot("internet") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("internet") ? "#60a5fa" : "#334155", 2)
      .label("☁ Internet (HTTPS)", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: 0,
      })
      .onClick(() => openConcept("httpVsHttps"));
    nextY += 80;

    // Edges: clients → internet
    clients.forEach((client) => {
      const active = hot(client.id) && hot("internet");
      const e = b
        .edge(client.id, "internet", `e-${client.id}-internet`)
        .arrow(true)
        .stroke(active ? "#60a5fa" : "#1e3a8a", active ? 1.6 : 0.7);
      if (active) e.animate("flow", { duration: "0.5s" });
    });

    /* ── Browser Cache (optional) ────────────────────── */
    if (components.browserCache) {
      const bcExpiredFill = "#431407";
      const bcExpiredStroke = "#ea580c";
      const bcFreshFill = hot("browser-cache") ? "#14532d" : "#0f172a";
      const bcFreshStroke = hot("browser-cache") ? "#22c55e" : "#166534";

      b.node("browser-cache")
        .at(W / 2 - 75, nextY)
        .rect(150, 52, 12)
        .fill(cacheExpired ? bcExpiredFill : bcFreshFill)
        .stroke(cacheExpired ? bcExpiredStroke : bcFreshStroke, 2)
        .label(cacheExpired ? "⚠️ Browser Cache" : "Browser Cache", {
          fill: cacheExpired ? "#fdba74" : "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dy: -5,
        })
        .onClick(() => openConcept("cacheControl"));
      b.node("browser-cache").label(
        cacheExpired
          ? "EXPIRED ⏰"
          : cachePolicy === "max-age"
            ? "max-age ✓"
            : cachePolicy === "no-cache"
              ? "must validate"
              : "no-store ✗",
        {
          fill: cacheExpired
            ? "#fb923c"
            : cachePolicy === "max-age"
              ? "#86efac"
              : cachePolicy === "no-cache"
                ? "#fde68a"
                : "#fca5a5",
          fontSize: 9,
          dy: 13,
        },
      );
      nextY += 75;

      // Edge: internet → browser-cache
      const bcActive = hot("internet") && hot("browser-cache");
      const eBc = b
        .edge("internet", "browser-cache", "e-internet-bcache")
        .arrow(true)
        .stroke(bcActive ? "#22c55e" : "#334155", bcActive ? 2 : 1.2);
      if (bcActive) eBc.animate("flow", { duration: "0.5s" });
    }

    /* ── CDN Edge (optional) ─────────────────────────── */
    if (components.cdn) {
      b.node("cdn")
        .at(W / 2 - 75, nextY)
        .rect(150, 52, 12)
        .fill(hot("cdn") ? "#2e1065" : "#0f172a")
        .stroke(hot("cdn") ? "#a855f7" : "#581c87", 2)
        .label("CDN Edge", {
          fill: "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dy: -5,
        })
        .onClick(() => openConcept("cacheControl"));
      b.node("cdn").label(
        cachePolicy === "no-store" ? "pass-through" : "edge cache",
        {
          fill: cachePolicy === "no-store" ? "#fca5a5" : "#c4b5fd",
          fontSize: 9,
          dy: 13,
        },
      );
      nextY += 75;

      // Edge: browser-cache → cdn  OR  internet → cdn
      const cdnSource = components.browserCache ? "browser-cache" : "internet";
      const cdnActive = hot(cdnSource) || hot("cdn");
      const eCdn = b
        .edge(cdnSource, "cdn", `e-${cdnSource}-cdn`)
        .arrow(true)
        .stroke(cdnActive ? "#a855f7" : "#334155", cdnActive ? 2 : 1.2);
      if (cdnActive) eCdn.animate("flow", { duration: "0.6s" });
    }

    /* ── Origin Server (always present) ──────────────── */
    const originSource = components.cdn
      ? "cdn"
      : components.browserCache
        ? "browser-cache"
        : "internet";

    b.node("origin")
      .at(W / 2 - 80, nextY)
      .rect(160, 60, 12)
      .fill(hot("origin") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("origin") ? "#ef4444" : "#991b1b", 2)
      .image("/server2.svg", 20, 20, { dy: -8, position: "center" })
      .label("Origin Server", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: 10,
      });
    b.node("origin").label(`~200ms`, {
      fill: "#fca5a5",
      fontSize: 9,
      dy: 22,
    });

    // Edge: previous layer → origin
    const originActive = hot(originSource) || hot("origin");
    const eOrigin = b
      .edge(originSource, "origin", `e-${originSource}-origin`)
      .arrow(true)
      .stroke(originActive ? "#ef4444" : "#334155", originActive ? 2 : 1.2);
    if (originActive) eOrigin.animate("flow", { duration: "0.7s" });

    /* ── Side annotations ────────────────────────────── */
    // Layer labels on the right side
    const layerAnnotations: { y: number; text: string; color: string }[] = [];

    if (components.browserCache) {
      layerAnnotations.push({
        y: 75 + 30 + 80, // approximate Y of browser-cache
        text: "Layer 7 — Application",
        color: "#22c55e",
      });
    }

    /* ── Signal overlay ──────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          o.add(
            "signal",
            {
              from: sig.from,
              to: sig.to,
              progress: sig.progress,
              magnitude: sig.magnitude ?? 1,
            } as SignalOverlayParams,
            { key: sig.id },
          );
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
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
      key: "httpVsHttps" as ConceptKey,
      label: "HTTP/HTTPS",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "browserCache" as ConceptKey,
      label: "Browser Cache",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "cdnCache" as ConceptKey,
      label: "CDN",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "cacheControl" as ConceptKey,
      label: "Cache-Control",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "etagValidation" as ConceptKey,
      label: "ETag / 304",
      color: "#99f6e4",
      borderColor: "#14b8a6",
    },
  ];

  /* ── Computed values for badges ─────────────────────── */
  const hitRate = Math.round(
    (1 - originRequests / Math.max(1, totalRequests)) * 100,
  );

  const policyColor =
    cachePolicy === "max-age"
      ? "#22c55e"
      : cachePolicy === "no-cache"
        ? "#f59e0b"
        : "#ef4444";

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="http-caching-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="http-caching-stage">
            <StageHeader
              title="HTTP Caching"
              subtitle="Browser ↔ CDN ↔ Origin — where is the request served from?"
            >
              <StatBadge
                label="Latency"
                value={`${latencyMs}ms`}
                className={`http-caching-latency ${
                  latencyMs <= 10
                    ? "http-caching-latency--fast"
                    : latencyMs <= 50
                      ? "http-caching-latency--medium"
                      : "http-caching-latency--slow"
                }`}
              />
              <StatBadge
                label="Cache Hit"
                value={`${hitRate}%`}
                className={`http-caching-hit ${
                  hitRate >= 60
                    ? "http-caching-hit--good"
                    : hitRate > 0
                      ? "http-caching-hit--partial"
                      : "http-caching-hit--none"
                }`}
              />
              <StatBadge
                label="Policy"
                value={cachePolicy}
                color={policyColor}
                className="http-caching-policy"
              />
              <StatBadge
                label="Origin Reqs"
                value={`${originRequests}/${totalRequests}`}
                className={`http-caching-origin ${
                  originRequests === 0
                    ? "http-caching-origin--none"
                    : "http-caching-origin--some"
                }`}
              />
              {components.browserCache && cachePolicy === "max-age" && (
                <StatBadge
                  label="Cache TTL"
                  value={
                    cacheExpired
                      ? "EXPIRED"
                      : `${Math.max(0, cacheTtlSeconds - cacheAgeSeconds)}s`
                  }
                  color={
                    cacheExpired
                      ? "#ef4444"
                      : cacheAgeSeconds >= cacheTtlSeconds * 0.7
                        ? "#f59e0b"
                        : "#22c55e"
                  }
                  className={`http-caching-ttl ${cacheExpired ? "http-caching-ttl--expired" : ""}`}
                />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            {components.browserCache && (
              <SideCard label="Browser Cache" variant="info">
                <p>
                  Hit rate: <strong>{Math.round(browserHitRate * 100)}%</strong>
                </p>
                <p>Latency: ~5ms (local, no network)</p>
              </SideCard>
            )}
            {components.cdn && (
              <SideCard label="CDN Edge" variant="info">
                <p>
                  Hit rate: <strong>{Math.round(cdnHitRate * 100)}%</strong>
                </p>
                <p>Latency: ~40ms (nearest edge)</p>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default HttpCachingVisualization;
