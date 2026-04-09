import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  CanvasStage,
  ConceptPills,
  PluginLayout,
  SideCard,
  SidePanel,
  StageHeader,
  StatBadge,
  useConceptModal,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { buildSteps } from "./flow-engine";
import {
  useCommandsQueriesAnimation,
  type Signal,
} from "./useCommandsQueriesAnimation";
import type { CommandsQueriesState } from "./commandsQueriesSlice";
import { getAdapter } from "./pattern-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1160;
const H = 700;

function lagLabel(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${ms}ms`;
}

function schemaLines(state: CommandsQueriesState): string[] {
  if (state.pattern === "event-sourcing") {
    if (state.projectionState === "lagging") {
      return [
        "── Event Store (append-only) ──",
        "SCCreated → ItemAdded → ItemAdded",
        "── Read Model (behind) ──",
        "cart | 2 items | $85.00 stale",
      ];
    }

    return [
      "── Event Store (append-only) ──",
      "SCCreated → ItemAdded → ItemDeleted",
      "── Read Model (current) ──",
      "cart | 1 item | $89.00 | ★ derived",
    ];
  }

  if (state.pattern === "cqrs") {
    if (state.projectionState === "lagging") {
      return [
        "── Write DB (normalized, ACID) ──",
        "product | price: $89.00 | stock: 42",
        "── Read DB (behind) ──",
        "display | $85.00 stale | Electronics",
      ];
    }

    return [
      "── Write DB (normalized, ACID) ──",
      "product | price: $89.00 | stock: 42",
      "── Read DB (denormalized) ──",
      "display | $89.00 | Electronics | ★4.2",
    ];
  }

  if (state.projectionState === "lagging") {
    return [
      "cart_id | items | total | snapshot",
      "c-2048 | 3 | $124.00 | 1.8s behind",
      "camera -> stale price copy",
      "tripod -> previous snapshot",
    ];
  }

  return [
    "cart_id | items | total | snapshot",
    "c-2048 | 3 | $128.00 | current",
    "camera -> $89.00",
    "tripod -> $39.00",
  ];
}

function synchronizationLabel(state: CommandsQueriesState): string {
  if (state.staleRisk) {
    return `Event-driven publish/subscribe, currently ${lagLabel(state.projectionLagMs)} behind.`;
  }

  return `Event-driven publish/subscribe, currently caught up within ${lagLabel(state.projectionLagMs)}.`;
}

const CommandsQueriesVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } = useCommandsQueriesAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);
  const stageScrollRef = useRef({ left: 0, top: 0 });
  const shellScrollRef = useRef({ left: 0, top: 0 });

  const state = runtime as CommandsQueriesState;
  const { explanation, hotZones, pattern, phase } = state;
  const adapter = getAdapter(pattern);
  const profile = adapter.profile;
  const walkthroughSteps = buildSteps(state);
  const badges = adapter.getStatBadges(state);

  const scene = (() => {
    const builder = viz().view(W, H);
    const hot = (zone: string) => hotZones.includes(zone);
    const sceneAdapter = getAdapter(pattern);

    sceneAdapter.buildScene(builder, state, {
      hot,
      openConcept,
      phase,
    });

    if (signals.length > 0) {
      builder.overlay((overlay) => {
        signals.forEach((signal: Signal) => {
          const { id, colorClass, ...params } = signal;
          overlay.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return builder;
  })();

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const stageScroller = containerRef.current.parentElement;
    const shellScroller = containerRef.current.closest(
      ".visualization-container",
    );
    if (!stageScroller) return;

    const saved = pzRef.current?.getState() ?? viewportRef.current;
    stageScrollRef.current = {
      left: stageScroller.scrollLeft,
      top: stageScroller.scrollTop,
    };
    shellScrollRef.current = {
      left: shellScroller?.scrollLeft ?? shellScrollRef.current.left,
      top: shellScroller?.scrollTop ?? shellScrollRef.current.top,
    };

    if (!builderRef.current) {
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      scene.commit(containerRef.current);
      builderRef.current = scene;
      if (saved) {
        pzRef.current?.setZoom(saved.zoom);
        pzRef.current?.setPan(saved.pan);
      }
    }

    const restoreScroll = () => {
      stageScroller.scrollLeft = stageScrollRef.current.left;
      stageScroller.scrollTop = stageScrollRef.current.top;

      if (shellScroller) {
        shellScroller.scrollLeft = shellScrollRef.current.left;
        shellScroller.scrollTop = shellScrollRef.current.top;
      }
    };

    const restoreScrollFrame = requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });

    const unsub = pzRef.current?.onChange((next) => {
      viewportRef.current = next;
    });

    return () => {
      cancelAnimationFrame(restoreScrollFrame);
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

  const pills =
    pattern === "event-sourcing"
      ? [
          {
            key: "event-sourcing",
            label: "Event Sourcing",
            color: "#fda4af",
            borderColor: "#f472b6",
          },
          {
            key: "cqrs",
            label: "CQRS",
            color: "#c4b5fd",
            borderColor: "#818cf8",
          },
          {
            key: "materialized-view",
            label: "Mat View",
            color: "#86efac",
            borderColor: "#22c55e",
          },
          {
            key: "message-broker",
            label: "Event Bus",
            color: "#93c5fd",
            borderColor: "#38bdf8",
          },
          {
            key: "eventual-consistency",
            label: "Consistency",
            color: "#fdba74",
            borderColor: "#f59e0b",
          },
        ]
      : pattern === "cqrs"
        ? [
            {
              key: "cqrs",
              label: "CQRS",
              color: "#c4b5fd",
              borderColor: "#818cf8",
            },
            {
              key: "command-model",
              label: "Command Model",
              color: "#7dd3fc",
              borderColor: "#38bdf8",
            },
            {
              key: "query-model",
              label: "Query Model",
              color: "#86efac",
              borderColor: "#22c55e",
            },
            {
              key: "message-broker",
              label: "Event Bus",
              color: "#93c5fd",
              borderColor: "#38bdf8",
            },
            {
              key: "projection",
              label: "Sync Worker",
              color: "#fdba74",
              borderColor: "#f59e0b",
            },
            {
              key: "eventual-consistency",
              label: "Consistency",
              color: "#fdba74",
              borderColor: "#f59e0b",
            },
          ]
        : [
            {
              key: "materialized-view",
              label: "Mat View",
              color: "#86efac",
              borderColor: "#22c55e",
            },
            {
              key: "command-model",
              label: "Command Model",
              color: "#7dd3fc",
              borderColor: "#38bdf8",
            },
            {
              key: "query-model",
              label: "Query Model",
              color: "#86efac",
              borderColor: "#22c55e",
            },
            {
              key: "projection",
              label: "Projector",
              color: "#fdba74",
              borderColor: "#f59e0b",
            },
            {
              key: "message-broker",
              label: "Broker",
              color: "#93c5fd",
              borderColor: "#38bdf8",
            },
            {
              key: "eventual-consistency",
              label: "Consistency",
              color: "#fdba74",
              borderColor: "#f59e0b",
            },
          ];

  return (
    <div className={`commands-queries-root commands-queries-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="commands-queries-stage">
            <StageHeader
              title="Commands and Queries Lab"
              subtitle={
                pattern === "event-sourcing"
                  ? `${profile.label} | append-only events as source of truth`
                  : pattern === "cqrs"
                    ? `${profile.label} | separate commands from queries, optimize each independently`
                    : `${profile.label} | keep reads local, keep writes authoritative`
              }
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  color={badge.color}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            <SideCard label="Active Pattern" variant="info">
              <div className="commands-queries-profile">
                <p
                  className="commands-queries-profile__title"
                  style={{ color: profile.color }}
                >
                  {profile.label}
                </p>
                <p className="commands-queries-profile__accent">
                  Best for: {profile.bestFor}
                </p>
                <p>{profile.description}</p>
              </div>
            </SideCard>

            <SideCard label="Read / Write Contract" variant="info">
              <dl className="commands-queries-facts">
                <div className="commands-queries-facts__item">
                  <dt>Write path</dt>
                  <dd>{profile.writeStrategy}</dd>
                </div>
                <div className="commands-queries-facts__item">
                  <dt>Read path</dt>
                  <dd>{profile.readStrategy}</dd>
                </div>
                <div className="commands-queries-facts__item">
                  <dt>Consistency</dt>
                  <dd>{state.consistencyModel}</dd>
                </div>
                <div className="commands-queries-facts__item">
                  <dt>Trade-off</dt>
                  <dd>{profile.tradeoff}</dd>
                </div>
              </dl>
            </SideCard>

            <SideCard label="Key Considerations" variant="info">
              <dl className="commands-queries-facts">
                {pattern === "event-sourcing" ? (
                  <>
                    <div className="commands-queries-facts__item">
                      <dt>Immutable event log</dt>
                      <dd>
                        Every state change is an immutable event appended to the
                        Event Store. No updates, no deletes — full history
                        retained.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Source of truth</dt>
                      <dd>
                        The Event Store is the ultimate source of truth. Current
                        state is derived by replaying events, not reading a
                        mutable row.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Temporal queries & audit</dt>
                      <dd>
                        Full audit log inherently. State at any point in time
                        can be reconstructed by replaying events up to that
                        moment.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Eventual consistency</dt>
                      <dd>{synchronizationLabel(state)}</dd>
                    </div>
                  </>
                ) : pattern === "cqrs" ? (
                  <>
                    <div className="commands-queries-facts__item">
                      <dt>Different data models</dt>
                      <dd>
                        Writes need ACID and strong consistency. Reads need low
                        latency and denormalized access. A single model
                        optimized for one is suboptimal for the other.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Independent scaling</dt>
                      <dd>
                        Read and write tiers scale separately based on their
                        different load profiles and performance requirements.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Synchronization</dt>
                      <dd>{synchronizationLabel(state)}</dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Best practices</dt>
                      <dd>
                        Physically separate databases. Optimize read-side
                        schema. Consider different database technologies (e.g.
                        PostgreSQL for writes, Cassandra for reads).
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="commands-queries-facts__item">
                      <dt>Data duplication</dt>
                      <dd>
                        The materialized view is a strategic local copy built
                        for read speed, not a second source of truth.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Ownership</dt>
                      <dd>
                        The write model still owns the authoritative state. The
                        read model only serves denormalized queries.
                      </dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Synchronization</dt>
                      <dd>{synchronizationLabel(state)}</dd>
                    </div>
                    <div className="commands-queries-facts__item">
                      <dt>Other refresh options</dt>
                      <dd>
                        Batch refreshes or triggers are possible, but they
                        usually increase staleness or storage coupling compared
                        with events.
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </SideCard>

            <SideCard label="Metrics" variant="info">
              <div className="commands-queries-metrics">
                <div className="commands-queries-metrics__row">
                  <span>Read latency</span>
                  <strong style={{ color: "#22c55e" }}>
                    {state.readLatencyMs}ms
                  </strong>
                </div>
                <div className="commands-queries-metrics__row">
                  <span>Write latency</span>
                  <strong style={{ color: "#38bdf8" }}>
                    {state.writeLatencyMs}ms
                  </strong>
                </div>
                <div className="commands-queries-metrics__row">
                  <span>
                    {pattern === "materialized-view"
                      ? "Projection lag"
                      : "Sync lag"}
                  </span>
                  <strong
                    style={{ color: state.staleRisk ? "#f59e0b" : "#22c55e" }}
                  >
                    {lagLabel(state.projectionLagMs)}
                  </strong>
                </div>
                <div className="commands-queries-metrics__row">
                  <span>Sync calls avoided</span>
                  <strong style={{ color: "#38bdf8" }}>
                    {state.syncCallsAvoided}
                  </strong>
                </div>
              </div>
            </SideCard>

            <SideCard
              label={
                pattern === "event-sourcing"
                  ? "Event Log vs Read Model"
                  : pattern === "cqrs"
                    ? "Data Model Comparison"
                    : "Read Model Example"
              }
              variant="info"
            >
              <div className="commands-queries-schema">
                {schemaLines(state).map((line) => (
                  <code key={line}>{line}</code>
                ))}
              </div>
            </SideCard>

            <SideCard label="Trade-offs" variant="info">
              <div className="commands-queries-tradeoffs">
                <div className="commands-queries-tradeoffs__section">
                  <p className="commands-queries-tradeoffs__heading">
                    Benefits
                  </p>
                  <ul className="commands-queries-tradeoffs__list">
                    {profile.benefits.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="commands-queries-tradeoffs__section commands-queries-tradeoffs__section--risk">
                  <p className="commands-queries-tradeoffs__heading">Costs</p>
                  <ul className="commands-queries-tradeoffs__list">
                    {profile.drawbacks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </SideCard>

            <SideCard label="Walkthrough">
              <ol className="commands-queries-steps">
                {walkthroughSteps.map((step, index) => (
                  <li key={step.key}>
                    <span className="commands-queries-steps__index">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default CommandsQueriesVisualization;
