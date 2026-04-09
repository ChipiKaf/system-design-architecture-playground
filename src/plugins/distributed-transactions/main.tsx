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
import { useDistributedTransactionsAnimation, type Signal } from "./useDistributedTransactionsAnimation";
import { type DistributedTransactionsState } from "./distributedTransactionsSlice";
import { getAdapter } from "./distributed-transactions-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1120;
const H = 680;

const DistributedTransactionsVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } =
    useDistributedTransactionsAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as DistributedTransactionsState;
  const { explanation, hotZones, phase, pattern } = st;
  const adapter = getAdapter(pattern);
  const hot = (zone: string) => hotZones.includes(zone);

  const scene = (() => {
    const b = viz().view(W, H);
    adapter.buildTopology(b, st, { hot, phase });

    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add(
            "signal",
            params as SignalOverlayParams,
            { key: id, className: colorClass },
          );
        });
      });
    }

    return b;
  })();

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
    return () => { unsub?.(); };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  const pills =
    pattern === "saga"
      ? [
          {
            key: "distributed-transactions" as ConceptKey,
            label: "Dist Tx",
            color: "#bfdbfe",
            borderColor: "#60a5fa",
          },
          {
            key: "saga" as ConceptKey,
            label: "Saga",
            color: "#bfdbfe",
            borderColor: "#60a5fa",
          },
          {
            key: "local-transaction" as ConceptKey,
            label: "Local Tx",
            color: "#c4b5fd",
            borderColor: "#a78bfa",
          },
          {
            key: "compensation" as ConceptKey,
            label: "Compensation",
            color: "#fdba74",
            borderColor: "#f59e0b",
          },
          {
            key: "eventual-consistency" as ConceptKey,
            label: "Consistency",
            color: "#86efac",
            borderColor: "#22c55e",
          },
        ]
      : [
          {
            key: "distributed-transactions" as ConceptKey,
            label: "Dist Tx",
            color: "#bfdbfe",
            borderColor: "#60a5fa",
          },
          {
            key: "outbox" as ConceptKey,
            label: "Outbox",
            color: "#86efac",
            borderColor: "#22c55e",
          },
          {
            key: "dual-write" as ConceptKey,
            label: "Dual Write",
            color: "#fdba74",
            borderColor: "#f59e0b",
          },
          {
            key: "relay" as ConceptKey,
            label: "Relay",
            color: "#c4b5fd",
            borderColor: "#a78bfa",
          },
          {
            key: "idempotency" as ConceptKey,
            label: "Idempotency",
            color: "#fca5a5",
            borderColor: "#fb7185",
          },
        ];

  const badges = adapter.getStatBadges(st);

  return (
    <div className={`distributed-transactions-root distributed-transactions-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="distributed-transactions-stage">
            <StageHeader
              title="Distributed Transactions Lab"
              subtitle={`${adapter.profile.label} template | ${st.atomicBoundary}`}
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

            <SideCard label="Pattern context" variant="info">
              <div
                className="distributed-transactions-pattern-pill"
                style={{ color: adapter.colors.stroke, borderColor: adapter.colors.stroke }}
              >
                {adapter.profile.shortLabel}
              </div>
              <p>{adapter.profile.description}</p>
              <p className="distributed-transactions-muted">
                {adapter.profile.context}
              </p>
            </SideCard>

            <SideCard label="Transaction language">
              <dl className="distributed-transactions-facts">
                <div className="distributed-transactions-facts__item">
                  <dt>Coordination</dt>
                  <dd>{st.coordinationModel}</dd>
                </div>
                <div className="distributed-transactions-facts__item">
                  <dt>Atomic boundary</dt>
                  <dd>{st.atomicBoundary}</dd>
                </div>
                <div className="distributed-transactions-facts__item">
                  <dt>Delivery</dt>
                  <dd>{st.deliverySemantics}</dd>
                </div>
                <div className="distributed-transactions-facts__item">
                  <dt>Failure strategy</dt>
                  <dd>{st.failureStrategy}</dd>
                </div>
                <div className="distributed-transactions-facts__item">
                  <dt>Consistency</dt>
                  <dd>{st.consistencyStory}</dd>
                </div>
              </dl>
            </SideCard>

            <SideCard label="Terminology">
              <ul className="distributed-transactions-term-list">
                {adapter.profile.terms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </SideCard>

            <SideCard label="Trade-off">
              <p>{adapter.profile.tradeoff}</p>
              <p className="distributed-transactions-note">
                This pass wires the language, context, and step structure only.
                Pattern-specific branching, retries, and compensation execution can be added adapter by adapter next.
              </p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default DistributedTransactionsVisualization;
