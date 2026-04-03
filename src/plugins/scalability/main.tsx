import React, { useLayoutEffect, useRef } from "react";
import { viz, type PanZoomController } from "vizcraft";
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
import { useScalabilityAnimation } from "./useScalabilityAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 940;
const H = 580;

/* ── Dynamic node positions ──────────────────────────────
 *
 *  Layout adapts based on which components are active:
 *
 *  [Clients row]
 *       ↓
 *  [Internet / Cloud]
 *       ↓
 *  [Load Balancer]?          ← only if LB active
 *       ↓
 *  [Server-0] [Server-1]... ← extra servers if LB active
 *       ↓
 *  [Cache]?                  ← only if cache active
 *       ↓
 *  [Database]?               ← only if DB active
 * ──────────────────────────────────────────────────────── */

const ScalabilityVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useScalabilityAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);

  const {
    components,
    clients,
    requestsPerSecond,
    // throughput,
    droppedRequests,
    responseTimeMs,
    serverCpuPercent,
    serverHealthy,
    maxCapacity,
    explanation,
    hotZones,
    phase,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const totalServers = 1 + components.extraServers;

  // ── Build VizCraft scene ──────────────────────────────
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Y-coordinate tracker for vertical stacking ──── */
    let nextY = 40;

    /* ── Clients row ─────────────────────────────────── */
    const clientRowWidth = (clients.length - 1) * 72 + 56; // total width from left edge of first to right edge of last
    const clientStartX = Math.max(80, W / 2 - clientRowWidth / 2);
    clients.forEach((client, i) => {
      const x = clientStartX + i * 72;
      b.node(client.id)
        .at(x, nextY)
        .rect(56, 40, 8)
        .fill(hot("clients") ? "#1e3a8a" : "#0f172a")
        .stroke(hot("clients") ? "#60a5fa" : "#334155", 1.4)
        .image(
          client.type === "mobile" ? "/mobile.svg" : "/mobile.svg",
          20,
          20,
          { dy: -5, position: "center" },
        )
        .tooltip({
          title: `Client ${i + 1}`,
          sections: [
            { label: "Type", value: client.type },
            { label: "Requests", value: "10 rps" },
          ],
        });
      b.node(client.id).label(`${i + 1}`, {
        fill: "#94a3b8",
        fontSize: 8,
        dy: 13,
      });
    });
    nextY += 75;

    /* ── Internet / Cloud ────────────────────────────── */
    b.node("cloud")
      .at(W / 2 - 70, nextY)
      .rect(140, 55, 14)
      .fill(hot("cloud") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("cloud") ? "#60a5fa" : "#334155", 2)
      .label("☁ Internet", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: 0,
      });
    nextY += 80;

    // Edges: clients → cloud
    clients.forEach((client) => {
      const active = hot("clients") && hot("cloud");
      const e = b
        .edge(client.id, "cloud", `e-${client.id}-cloud`)
        .arrow(true)
        .stroke(active ? "#60a5fa" : "#1e3a8a", active ? 1.6 : 0.7);
      if (active) e.animate("flow", { duration: "0.5s" });
    });

    /* ── Load Balancer (optional) ────────────────────── */
    // const firstServerTarget = components.loadBalancer ? "lb" : "server-0";
    if (components.loadBalancer) {
      b.node("lb")
        .at(W / 2 - 80, nextY)
        .rect(160, 52, 12)
        .fill(hot("lb") ? "#2e1065" : "#0f172a")
        .stroke(hot("lb") ? "#a855f7" : "#581c87", 2)
        .label("Load Balancer", {
          fill: "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dy: 0,
        })
        .onClick(() => openConcept("horizontal-scaling"))
        .tooltip({
          title: "Load Balancer",
          sections: [
            { label: "Strategy", value: "Round-robin" },
            { label: "Servers", value: String(totalServers) },
          ],
        });
      nextY += 75;

      // Edge: cloud → LB
      const lbActive = hot("cloud") && hot("lb");
      const eLb = b
        .edge("cloud", "lb", "e-cloud-lb")
        .arrow(true)
        .stroke(lbActive ? "#a855f7" : "#334155", lbActive ? 2 : 1.2);
      if (lbActive) eLb.animate("flow", { duration: "0.6s" });
    }

    /* ── Servers ─────────────────────────────────────── */
    const serverStartX =
      totalServers === 1 ? W / 2 - 75 : W / 2 - (totalServers * 170) / 2 + 10;

    for (let i = 0; i < totalServers; i++) {
      const sid = `server-${i}`;
      const x = serverStartX + i * 170;
      const isOverloaded = !serverHealthy && i === 0;

      b.node(sid)
        .at(x, nextY)
        .rect(150, 68, 12)
        .fill(isOverloaded ? "#7f1d1d" : hot(sid) ? "#1e3a8a" : "#0f172a")
        .stroke(isOverloaded ? "#ef4444" : hot(sid) ? "#60a5fa" : "#334155", 2)
        .image("/server2.svg", 20, 20, { dy: -8, position: "center" })
        .label(i === 0 ? "HTTP Server" : `Server ${i + 1}`, {
          fill: "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dy: 10,
        })
        .onClick(() =>
          openConcept(
            components.loadBalancer && !components.database
              ? "stateless-servers"
              : components.database
                ? "separation-of-concerns"
                : "single-point-of-failure",
          ),
        )
        .tooltip({
          title: i === 0 ? "Primary Server" : `Server ${i + 1}`,
          sections: [
            { label: "CPU", value: `${serverCpuPercent}%` },
            {
              label: "Status",
              value: serverHealthy ? "Healthy" : "Overloaded",
            },
          ],
        });

      b.node(sid).label(`CPU ${serverCpuPercent}%`, {
        fill: serverCpuPercent > 80 ? "#fca5a5" : "#86efac",
        fontSize: 9,
        dy: 22,
      });

      // Edge: LB → server  OR  cloud → server (if no LB)
      if (components.loadBalancer) {
        const active = hot("lb") && hot(sid);
        const e = b
          .edge("lb", sid, `e-lb-${sid}`)
          .arrow(true)
          .stroke(active ? "#a855f7" : "#581c87", active ? 2 : 1);
        if (active) e.animate("flow", { duration: "0.6s" });
      } else if (i === 0) {
        const active = hot("cloud") && hot(sid);
        const e = b
          .edge("cloud", sid, "e-cloud-server")
          .arrow(true)
          .stroke(active ? "#60a5fa" : "#334155", active ? 2 : 1.2);
        if (active) e.animate("flow", { duration: "0.6s" });
      }
    }
    nextY += 80;

    /* ── Cache (optional) ────────────────────────────── */
    if (components.cache) {
      b.node("cache")
        .at(W / 2 - 65, nextY)
        .rect(130, 48, 12)
        .fill(hot("cache") ? "#431407" : "#0f172a")
        .stroke(hot("cache") ? "#fb923c" : "#78350f", 2)
        .label("Cache", {
          fill: "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dy: -4,
        })
        .onClick(() => openConcept("throughput"))
        .tooltip({
          title: "Cache Layer",
          sections: [
            { label: "Effect", value: "+30% throughput" },
            { label: "Role", value: "Reduces DB reads" },
          ],
        });
      b.node("cache").label("Redis / Memcached", {
        fill: "#fdba74",
        fontSize: 8,
        dy: 12,
      });

      // Edges: servers → cache (all servers, not just primary)
      for (let i = 0; i < totalServers; i++) {
        const sid = `server-${i}`;
        const cacheActive = hot("cache") || hot(sid);
        const eC = b
          .edge(sid, "cache", `e-${sid}-cache`)
          .arrow(true)
          .stroke(cacheActive ? "#fb923c" : "#78350f", cacheActive ? 1.8 : 1);
        if (cacheActive) eC.animate("flow", { duration: "0.5s" });
      }

      nextY += 70;
    }

    /* ── Database (optional) ─────────────────────────── */
    if (components.database) {
      b.node("database")
        .at(W / 2 - 70, nextY)
        .rect(140, 52, 12)
        .fill(hot("database") ? "#14532d" : "#0f172a")
        .stroke(hot("database") ? "#22c55e" : "#166534", 2)
        .image("/db.svg", 20, 20, { dx: -42, dy: 0, position: "center" })
        .label("Database", {
          fill: "#fff",
          fontSize: 13,
          fontWeight: "bold",
          dx: 8,
          dy: 0,
        })
        .onClick(() => openConcept("separation-of-concerns"))
        .tooltip({
          title: "Database",
          sections: [
            { label: "Role", value: "Handles data persistence" },
            { label: "Capacity gained", value: "+40 rps base" },
          ],
        });

      // Edge: all servers → database (via cache if present)
      const dbSource = components.cache ? "cache" : null;
      if (dbSource) {
        // cache → DB (single edge since cache is shared)
        const dbActive = hot("database") || hot("cache");
        const eDb = b
          .edge("cache", "database", "e-cache-db")
          .arrow(true)
          .stroke(dbActive ? "#22c55e" : "#166534", dbActive ? 2 : 1);
        if (dbActive) eDb.animate("flow", { duration: "0.7s" });
      } else {
        // each server → DB directly
        for (let i = 0; i < totalServers; i++) {
          const sid = `server-${i}`;
          const dbActive = hot("database") || hot(sid);
          const eDb = b
            .edge(sid, "database", `e-${sid}-db`)
            .arrow(true)
            .stroke(dbActive ? "#22c55e" : "#166534", dbActive ? 2 : 1);
          if (dbActive) eDb.animate("flow", { duration: "0.7s" });
        }
      }
    }

    /* ── SPOF overlay (only when monolith + phase indicates) ── */
    if (
      !components.database &&
      (phase === "overloaded" || phase === "summary") &&
      droppedRequests > 0
    ) {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2 + 120,
            y: nextY - 30,
            text: "Single point of failure!",
            fill: "#ef4444",
            fontSize: 14,
            fontWeight: 700,
          },
          { key: "spof-label" },
        );
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
            },
            { key: sig.id },
          );
        });
      });
    }

    return b;
  })();

  // ── Mount scene ───────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? null;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
  }, [scene]);

  React.useEffect(() => {
    return () => {
      builderRef.current?.destroy();
    };
  }, []);

  // ── Pills ─────────────────────────────────────────────
  const pills = [
    {
      key: "scalability" as ConceptKey,
      label: "Scalability",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "single-point-of-failure" as ConceptKey,
      label: "SPOF",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "throughput" as ConceptKey,
      label: "Throughput",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "separation-of-concerns" as ConceptKey,
      label: "Separation",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "horizontal-scaling" as ConceptKey,
      label: "Horizontal Scaling",
      color: "#5eead4",
      borderColor: "#14b8a6",
    },
    {
      key: "autoscaling-metrics" as ConceptKey,
      label: "Autoscaling Metrics",
      color: "#fcd34d",
      borderColor: "#f59e0b",
    },
    {
      key: "bandwidth-vs-throughput" as ConceptKey,
      label: "BW vs Throughput",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "cpu-as-signal" as ConceptKey,
      label: "CPU Signal",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "stateless-servers" as ConceptKey,
      label: "Stateless Servers",
      color: "#c4b5fd",
      borderColor: "#a78bfa",
    },
  ];

  // ── Describe architecture for sidebar ─────────────────
  const archParts: string[] = ["HTTP Server"];
  if (components.database) archParts.push("Database");
  if (components.loadBalancer) archParts.push("Load Balancer");
  if (components.extraServers > 0)
    archParts.push(`+${components.extraServers} server(s)`);
  if (components.cache) archParts.push("Cache");

  return (
    <div className="scalability-root">
      <PluginLayout
        toolbar={
          <ConceptPills
            pills={pills}
            onOpen={(key) => openConcept(key as ConceptKey)}
          />
        }
        canvas={
          <div className="scalability-stage">
            <StageHeader
              title="Scalability"
              subtitle="Build the architecture — see how throughput changes"
            >
              <StatBadge
                label="Clients"
                value={clients.length}
                color="#93c5fd"
              />
              <StatBadge
                label="Throughput"
                value={`${requestsPerSecond}/${maxCapacity}`}
                color={droppedRequests > 0 ? "#fca5a5" : "#86efac"}
              />
              <StatBadge
                label="CPU"
                value={`${serverCpuPercent}%`}
                color={serverCpuPercent > 80 ? "#fca5a5" : "#86efac"}
              />
              <StatBadge
                label="Response"
                value={`${responseTimeMs}ms`}
                color={responseTimeMs > 200 ? "#fca5a5" : "#86efac"}
              />
              {droppedRequests > 0 && (
                <StatBadge
                  label="Dropped"
                  value={droppedRequests}
                  color="#ef4444"
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
            <SideCard label="Architecture" variant="info">
              <p>{archParts.join(" → ")}</p>
              <p>
                <strong>Max capacity:</strong> ~{maxCapacity} rps
              </p>
              <p>
                <strong>Servers:</strong> {totalServers}
              </p>
            </SideCard>
            {droppedRequests > 0 && (
              <SideCard label="Warning" variant="warning">
                <p>
                  {droppedRequests} requests dropped! Try adding a database,
                  load balancer, or more servers.
                </p>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default ScalabilityVisualization;
