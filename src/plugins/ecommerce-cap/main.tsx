import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  CanvasStage,
  ConceptPills,
  PluginLayout,
  SideCard,
  SidePanel,
  StageHeader,
  StatBadge,
} from "../../components/plugin-kit";
import { getAdapter } from "./ecommerce-cap-adapters";
import { concepts, type ConceptKey } from "./concepts";
import { type EcommerceCapState } from "./ecommerceCapSlice";
import {
  useEcommerceCapAnimation,
  type Signal,
} from "./useEcommerceCapAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 980;
const H = 660;

const EcommerceCapVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } = useEcommerceCapAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as EcommerceCapState;
  const { explanation, hotZones, phase, serviceType } = st;
  const adapter = getAdapter(serviceType);
  const hot = (zone: string) => hotZones.includes(zone);

  const scene = (() => {
    const b = viz().view(W, H);

    adapter.buildTopology(b, st, { hot, phase });

    if (signals.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      b.overlay((o: any) => {
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
    const unsub = pzRef.current?.onChange((next) => {
      viewportRef.current = next;
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

  const pills = [
    {
      key: "cap" as ConceptKey,
      label: "CAP",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "ap-vs-cp" as ConceptKey,
      label: "AP vs CP",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "service-split" as ConceptKey,
      label: "Service Split",
      color: "#fdba74",
      borderColor: "#f97316",
    },
    {
      key: "reads-vs-writes" as ConceptKey,
      label: "Reads vs Writes",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
  ];

  const badges = adapter.getStatBadges(st);

  return (
    <div className={`ecommerce-cap-root ecommerce-cap-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="ecommerce-cap-stage">
            <StageHeader
              title="CAP in E-Commerce"
              subtitle={`${adapter.profile.label} service`}
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

            <SideCard label="CAP stance" variant="info">
              <div className="ecommerce-cap-capmode">
                <span
                  className="ecommerce-cap-capmode__pill"
                  style={{
                    color: adapter.colors.stroke,
                    borderColor: adapter.colors.stroke,
                  }}
                >
                  {st.capMode}
                </span>
                <strong>{adapter.profile.shortLabel}</strong>
              </div>
              <p>{adapter.profile.description}</p>
              <p className="ecommerce-cap-muted">{st.businessPriority}</p>
            </SideCard>

            <SideCard label="Read vs Write">
              <div className="ecommerce-cap-scorecard">
                <div className="ecommerce-cap-scorecard__row">
                  <span>Read path</span>
                  <strong>{st.readPolicy}</strong>
                </div>
                <div className="ecommerce-cap-scorecard__row">
                  <span>Write path</span>
                  <strong>{st.writePolicy}</strong>
                </div>
              </div>
            </SideCard>

            <SideCard label="Partition response">
              <p>{st.partitionPolicy}</p>
              <p className="ecommerce-cap-muted">{st.acceptedRisk}</p>
            </SideCard>

            <SideCard label="Trade-off scorecard">
              <div className="ecommerce-cap-scorecard">
                <div className="ecommerce-cap-scorecard__row">
                  <span>Availability bias</span>
                  <strong>{st.availabilityBias}/100</strong>
                </div>
                <div className="ecommerce-cap-scorecard__row">
                  <span>Consistency bias</span>
                  <strong>{st.consistencyBias}/100</strong>
                </div>
                <div className="ecommerce-cap-scorecard__row">
                  <span>Stale budget</span>
                  <strong>{st.staleBudget}</strong>
                </div>
                <div className="ecommerce-cap-scorecard__row">
                  <span>Customer impact</span>
                  <strong>{st.customerImpact}</strong>
                </div>
              </div>
            </SideCard>

            <SideCard label="Common patterns">
              <ul className="ecommerce-cap-list">
                {adapter.profile.patterns.map((pattern) => (
                  <li key={pattern}>{pattern}</li>
                ))}
              </ul>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default EcommerceCapVisualization;
