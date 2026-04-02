import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import InfoModal from "../../components/InfoModal/InfoModal";
import { concepts, type ConceptKey } from "./concepts";
import {
  useEcsAutoscalingAnimation,
  type Signal,
} from "./useEcsAutoscalingAnimation";
import {
  adjustClients,
  setDatabase,
  setCiCd,
  setOrchestration,
  type DatabaseChoice,
  type CiCdChoice,
  type OrchestrationChoice,
} from "./ecsAutoscalingSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 940;
const H = 620;

/* ── Node layout ─────────────────────────────────────────
 *
 *  [Clients]  ──►  [ALB]  ──►  ┌─── ECS Service ───────┐
 *                               │ [Task 1] [Task 2] ... │
 *                               └───────────────────────┘
 *                                        │
 *                                   [Database]
 *
 *     [CloudWatch]  ◄── metrics ── tasks
 *          │
 *     [Scaling Policy]  ──► [ECS Service]
 *
 *     [ECR]  ──► (image pull to new tasks)
 * ──────────────────────────────────────────────────────── */

const EcsAutoscalingVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { runtime, currentStep, signals, phase } =
    useEcsAutoscalingAnimation(onAnimationComplete);
  const [activeConcept, setActiveConcept] = useState<ConceptKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);

  const openConcept = useCallback(
    (key: ConceptKey) => setActiveConcept(key),
    [],
  );
  const closeConcept = useCallback(() => setActiveConcept(null), []);

  const {
    tasks,
    avgCpu,
    targetCpu,
    requestsPerSecond,
    responseTimeMs,
    clientCount,
    alarmFiring,
    scalingCooldown,
    desiredCount,
    database,
    cicd,
    orchestration,
    explanation,
    hotZones,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const runningTasks = tasks.filter((t) => t.status === "running");
  const provisioningTasks = tasks.filter((t) => t.status === "provisioning");

  // ── Build VizCraft scene ──────────────────────────────
  const scene = (() => {
    const b = viz().view(W, H);

    // ── Clients ─────────────────────────────────────────
    b.node("clients")
      .at(30, 100)
      .rect(120, 60, 12)
      .fill(hot("clients") ? "#1e40af" : "#0f172a")
      .stroke(hot("clients") ? "#60a5fa" : "#334155", 2)
      .label(`${clientCount} Clients`, {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -8,
      })
      .badge(`${requestsPerSecond} rps`, {
        position: "bottom-right",
        fill: "#fff",
        background: "#2563eb",
        fontSize: 8,
      })
      .tooltip({
        title: "Clients",
        sections: [
          { label: "Count", value: String(clientCount) },
          { label: "Requests/sec", value: String(requestsPerSecond) },
        ],
      });

    // ── ALB ─────────────────────────────────────────────
    b.node("alb")
      .at(210, 90)
      .rect(140, 80, 14)
      .fill(hot("alb") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("alb") ? "#3b82f6" : "#1e3a8a", 2.4)
      .label("Application", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -14,
      })
      .onClick(() => openConcept("alb"))
      .tooltip({
        title: "Application Load Balancer",
        sections: [
          {
            label: "Role",
            value: "Distributes HTTP traffic across healthy ECS tasks",
          },
          { label: "Targets", value: `${runningTasks.length} healthy` },
        ],
      });
    b.node("alb").label("Load Balancer", {
      fill: "#93c5fd",
      fontSize: 11,
      dy: 4,
    });
    b.node("alb").badge("ALB", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });

    // ── ECS Service boundary (overlay rect) ─────────────
    b.overlay((o) => {
      const svcX = 355;
      const svcY = 25;
      const svcW = 320;
      const svcH = 190;

      o.add(
        "rect",
        {
          x: svcX,
          y: svcY,
          w: svcW,
          h: svcH,
          rx: 18,
          ry: 18,
          fill: "rgba(15, 23, 42, 0.0)",
          stroke: hot("ecs-service") ? "#f97316" : "#475569",
          strokeWidth: hot("ecs-service") ? 2.4 : 1.4,
          strokeDasharray: "8 5",
          opacity: 0.7,
        },
        { key: "ecs-boundary" },
      );
      o.add(
        "text",
        {
          x: svcX + 12,
          y: svcY - 6,
          text:
            orchestration === "ecs"
              ? `ECS Service  (desired: ${desiredCount})`
              : `EKS Deployment  (desired: ${desiredCount})`,
          fill: "#fdba74",
          fontSize: 11,
          fontWeight: 700,
        },
        { key: "ecs-boundary-label" },
      );
    });

    // ── ECS Service anchor (invisible, for edges) ───────
    b.node("ecs-service")
      .at(550, 24)
      .rect(1, 1, 0)
      .fill("transparent")
      .stroke("transparent", 0);

    // ── Tasks ───────────────────────────────────────────
    const taskPositions = [
      { x: 430, y: 70 },
      { x: 590, y: 70 },
      { x: 430, y: 160 },
      { x: 590, y: 160 },
    ];

    tasks.forEach((task, i) => {
      const pos = taskPositions[i] ?? {
        x: 430 + (i % 2) * 160,
        y: 70 + Math.floor(i / 2) * 90,
      };
      const isRunning = task.status === "running";
      const isProvisioning = task.status === "provisioning";
      const isDraining = task.status === "draining";

      const fillColor = isProvisioning
        ? "#422006"
        : isDraining
          ? "#1c1917"
          : hot(task.id)
            ? task.cpuPercent > 70
              ? "#7f1d1d"
              : "#052e16"
            : "#0f172a";

      const strokeColor = isProvisioning
        ? "#f97316"
        : isDraining
          ? "#78716c"
          : task.cpuPercent > 70
            ? "#ef4444"
            : "#22c55e";

      b.node(task.id)
        .at(pos.x, pos.y)
        .rect(120, 60, 10)
        .fill(fillColor)
        .stroke(strokeColor, isProvisioning || isDraining ? 1.6 : 2)
        .label(task.id.replace("task-", "Task "), {
          fill: "#fff",
          fontSize: 12,
          fontWeight: "bold",
          dy: -10,
        })
        .onClick(() => openConcept("docker"))
        .tooltip({
          title: task.id.replace("task-", "Task "),
          sections: [
            { label: "CPU", value: `${task.cpuPercent}%` },
            { label: "Status", value: task.status },
          ],
        });

      // CPU sub-label
      b.node(task.id).label(
        isProvisioning
          ? "provisioning..."
          : isDraining
            ? "draining..."
            : `CPU ${task.cpuPercent}%`,
        {
          fill: isProvisioning
            ? "#fdba74"
            : isDraining
              ? "#a8a29e"
              : task.cpuPercent > 70
                ? "#fca5a5"
                : "#86efac",
          fontSize: 9,
          dy: 8,
        },
      );

      if (isProvisioning) {
        b.node(task.id).badge("NEW", {
          position: "top-right",
          fill: "#fff",
          background: "#f97316",
          fontSize: 8,
        });
      }
    });

    // ── Database ────────────────────────────────────────
    b.node("database")
      .at(500, 290)
      .rect(140, 56, 12)
      .fill(hot("database") ? "#14532d" : "#0f172a")
      .stroke(hot("database") ? "#22c55e" : "#166534", 2)
      .label(database === "postgresql" ? "PostgreSQL" : "MongoDB", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .onClick(() => openConcept("database"))
      .tooltip({
        title: "Database",
        sections: [
          { label: "Engine", value: database },
          {
            label: "Latency effect",
            value: database === "mongodb" ? "+15% base latency" : "baseline",
          },
        ],
      });
    b.node("database").label(
      database === "postgresql" ? "RDS / Aurora" : "DocumentDB",
      {
        fill: "#86efac",
        fontSize: 9,
        dy: 10,
      },
    );

    // ── CloudWatch ──────────────────────────────────────
    b.node("cloudwatch")
      .at(100, 340)
      .rect(150, 60, 12)
      .fill(alarmFiring ? "#881337" : hot("cloudwatch") ? "#4c0519" : "#0f172a")
      .stroke(
        alarmFiring ? "#f43f5e" : hot("cloudwatch") ? "#e11d48" : "#881337",
        2,
      )
      .label("CloudWatch", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -8,
      })
      .onClick(() => openConcept("cloudwatch"))
      .tooltip({
        title: "CloudWatch",
        sections: [
          { label: "Avg CPU", value: `${avgCpu}%` },
          { label: "Target", value: `${targetCpu}%` },
          { label: "Alarm", value: alarmFiring ? "ALARM" : "OK" },
        ],
      });
    b.node("cloudwatch").label(alarmFiring ? "ALARM" : "OK", {
      fill: alarmFiring ? "#fda4af" : "#6b7280",
      fontSize: 10,
      fontWeight: "bold",
      dy: 8,
    });
    if (alarmFiring) {
      b.node("cloudwatch").badge("!", {
        position: "top-right",
        fill: "#fff",
        background: "#ef4444",
        fontSize: 10,
      });
    }

    // ── Scaling Policy ──────────────────────────────────
    b.node("scaling-policy")
      .at(350, 400)
      .rect(160, 56, 12)
      .fill(hot("scaling-policy") ? "#3b0764" : "#0f172a")
      .stroke(hot("scaling-policy") ? "#a855f7" : "#581c87", 2)
      .label("Scaling Policy", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .onClick(() => openConcept("scaling-policy"))
      .tooltip({
        title: "Auto Scaling Policy",
        sections: [
          { label: "Type", value: "Target Tracking" },
          { label: "Target CPU", value: `${targetCpu}%` },
          { label: "Desired", value: String(desiredCount) },
          {
            label: "Cooldown",
            value: scalingCooldown ? "Active" : "Ready",
          },
        ],
      });
    b.node("scaling-policy").label(
      scalingCooldown ? "cooldown active" : `target: ${targetCpu}% CPU`,
      {
        fill: scalingCooldown ? "#c084fc" : "#a78bfa",
        fontSize: 9,
        dy: 10,
      },
    );

    // ── ECR ─────────────────────────────────────────────
    b.node("ecr")
      .at(620, 400)
      .rect(130, 56, 12)
      .fill(hot("ecr") ? "#431407" : "#0f172a")
      .stroke(hot("ecr") ? "#fb923c" : "#78350f", 2)
      .label("ECR", {
        fill: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        dy: -6,
      })
      .onClick(() => openConcept("ecr"))
      .tooltip({
        title: "Elastic Container Registry",
        sections: [
          {
            label: "Role",
            value: "Stores Docker images. New tasks pull from here.",
          },
        ],
      });
    b.node("ecr").label("Docker images", {
      fill: "#fdba74",
      fontSize: 9,
      dy: 10,
    });

    // ── CI/CD (informational, bottom-left) ──────────────
    b.node("cicd")
      .at(100, 480)
      .rect(130, 48, 10)
      .fill("#0f172a")
      .stroke("#7c3aed", 1.4)
      .label(cicd === "codepipeline" ? "CodePipeline" : "Jenkins", {
        fill: "#c4b5fd",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("cicd"))
      .tooltip({
        title: "CI/CD Pipeline",
        sections: [
          {
            label: "Tool",
            value:
              cicd === "codepipeline"
                ? "AWS CodePipeline + CodeBuild"
                : "Jenkins",
          },
          {
            label: "Role",
            value: "Builds Docker image and pushes to ECR",
          },
        ],
      });
    b.node("cicd").label("build → push", {
      fill: "#a78bfa",
      fontSize: 8,
      dy: 12,
    });

    // ═══════════════════════════════════════════════════
    // EDGES
    // ═══════════════════════════════════════════════════

    // Clients → ALB
    const eClientAlb = b
      .edge("clients", "alb", "e-client-alb")
      .arrow(true)
      .stroke(
        hot("clients") ? "#60a5fa" : "#334155",
        hot("clients") ? 2.4 : 1.2,
      )
      .label("HTTP", { fill: "#93c5fd", fontSize: 8 });
    if (hot("clients") && hot("alb"))
      eClientAlb.animate("flow", { duration: "0.8s" });

    // ALB → Tasks
    tasks.forEach((task) => {
      if (task.status === "draining") return;
      const active = hot("alb") && hot(task.id);
      const e = b
        .edge("alb", task.id, `e-alb-${task.id}`)
        .arrow(true)
        .stroke(active ? "#3b82f6" : "#1e3a8a", active ? 2 : 1);
      if (active) e.animate("flow", { duration: "0.7s" });
    });

    // Tasks → Database
    tasks.forEach((task) => {
      if (task.status !== "running") return;
      const active = hot(task.id) && hot("database");
      const e = b
        .edge(task.id, "database", `e-${task.id}-db`)
        .arrow(true)
        .stroke(active ? "#22c55e" : "#1a2e05", active ? 1.6 : 0.8)
        .dashed();
      if (active) e.animate("flow", { duration: "0.9s" });
    });

    // Tasks → CloudWatch (metrics)
    tasks.forEach((task) => {
      if (task.status !== "running") return;
      const active = hot(task.id) && hot("cloudwatch");
      b.edge(task.id, "cloudwatch", `e-${task.id}-cw`)
        .arrow(true)
        .stroke(active ? "#f43f5e" : "#262626", active ? 1.4 : 0.6)
        .dashed()
        .label("metrics", { fill: "#fda4af", fontSize: 7 });
    });

    // CloudWatch → Scaling Policy
    const cwToSp = alarmFiring || (hot("cloudwatch") && hot("scaling-policy"));
    const eCwSp = b
      .edge("cloudwatch", "scaling-policy", "e-cw-sp")
      .arrow(true)
      .stroke(cwToSp ? "#f43f5e" : "#334155", cwToSp ? 2.4 : 1)
      .label(alarmFiring ? "ALARM!" : "notify", {
        fill: alarmFiring ? "#fda4af" : "#6b7280",
        fontSize: 8,
        fontWeight: alarmFiring ? "bold" : "normal",
      });
    if (cwToSp) eCwSp.animate("flow", { duration: "0.8s" });

    // Scaling Policy → ECS Service
    const spToEcs = hot("scaling-policy") && hot("ecs-service");
    const eSpEcs = b
      .edge("scaling-policy", "ecs-service", "e-sp-ecs")
      .arrow(true)
      .stroke(spToEcs ? "#a855f7" : "#334155", spToEcs ? 2.2 : 1)
      .label("set desired", { fill: "#c4b5fd", fontSize: 8 });
    if (spToEcs) eSpEcs.animate("flow", { duration: "0.8s" });

    // ECR → provisioning tasks
    provisioningTasks.forEach((task) => {
      const e = b
        .edge("ecr", task.id, `e-ecr-${task.id}`)
        .arrow(true)
        .stroke("#fb923c", 2)
        .label("pull image", { fill: "#fdba74", fontSize: 8 });
      e.animate("flow", { duration: "0.7s" });
    });

    // CI/CD → ECR
    b.edge("cicd", "ecr", "e-cicd-ecr")
      .arrow(true)
      .stroke("#7c3aed", 1)
      .dashed()
      .label("push image", { fill: "#a78bfa", fontSize: 7 });

    // ── Signal overlays ─────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  })();

  // ── Mount / destroy scene ─────────────────────────────
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

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  // ── CPU gauge helper ──────────────────────────────────
  const cpuColor =
    avgCpu > 80 ? "#ef4444" : avgCpu > 60 ? "#f59e0b" : "#22c55e";
  const cpuPct = Math.min(avgCpu, 100);

  return (
    <div className="ecs-root">
      {/* ── Concept pills ────────────────────────────── */}
      <div className="ecs-pills">
        {(
          [
            ["ecs", "ECS", "--ecs"],
            ["alb", "ALB", "--alb"],
            ["cloudwatch", "CloudWatch", "--cw"],
            ["scaling-policy", "Scaling", "--sp"],
            ["ecr", "ECR", "--ecr"],
            ["docker", "Docker", "--docker"],
            ["database", "Database", "--db"],
            ["cicd", "CI/CD", "--cicd"],
          ] as [ConceptKey, string, string][]
        ).map(([key, label, cls]) => (
          <button
            key={key}
            className={`ecs-pill ecs-pill${cls}`}
            onClick={() => openConcept(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ecs-body">
        {/* ── Canvas ─────────────────────────────────── */}
        <div className="ecs-stage">
          <div className="ecs-stage__head">
            <div>
              <h2>ECS Autoscaling</h2>
              <p>
                Watch how AWS scales containers in response to traffic changes
              </p>
            </div>
            <div className="ecs-stage__stats">
              <div className={`ecs-phase ecs-phase--${phase}`}>
                <span className="ecs-phase__label">Phase</span>
                <span className="ecs-phase__value">
                  {phase.replace(/-/g, " ")}
                </span>
              </div>
              <div className="ecs-stat">
                <span className="ecs-stat__label">Tasks</span>
                <span className="ecs-stat__value">
                  {runningTasks.length}/{desiredCount}
                </span>
              </div>
            </div>
          </div>

          <div className="ecs-stage__canvas-wrap">
            <div className="ecs-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ────────────────────────────────── */}
        <aside className="ecs-sidebar">
          {/* Explanation card */}
          <div className="ecs-card ecs-card--explanation">
            <div className="ecs-card__label">What's happening</div>
            <p>{explanation}</p>
          </div>

          {/* Client load control */}
          <div className="ecs-card ecs-card--clients">
            <div className="ecs-card__head">
              <h3>Client Load</h3>
              <span className="ecs-card__sub">simulate traffic</span>
            </div>
            <div className="ecs-client-control">
              <button
                className="ecs-client-btn"
                onClick={() => dispatch(adjustClients(-1))}
                disabled={clientCount <= 1}
              >
                −
              </button>
              <div className="ecs-client-display">
                <span className="ecs-client-count">{clientCount}</span>
                <span className="ecs-client-label">clients</span>
              </div>
              <button
                className="ecs-client-btn"
                onClick={() => dispatch(adjustClients(1))}
                disabled={clientCount >= 20}
              >
                +
              </button>
            </div>
            <div className="ecs-client-hint">
              {requestsPerSecond} req/s &middot;{" "}
              {avgCpu > targetCpu ? "⚠ above target" : "within target"}
            </div>
          </div>

          {/* Metrics card */}
          <div className="ecs-card ecs-card--metrics">
            <div className="ecs-card__head">
              <h3>Live Metrics</h3>
              <span className="ecs-card__sub">CloudWatch</span>
            </div>

            {/* CPU gauge */}
            <div className="ecs-gauge">
              <div className="ecs-gauge__label">
                <span>Avg CPU</span>
                <span style={{ color: cpuColor, fontWeight: 700 }}>
                  {avgCpu}%
                </span>
              </div>
              <div className="ecs-gauge__bar">
                <div
                  className="ecs-gauge__fill"
                  style={{
                    width: `${cpuPct}%`,
                    background: cpuColor,
                  }}
                />
                <div
                  className="ecs-gauge__target"
                  style={{ left: `${targetCpu}%` }}
                  title={`Target: ${targetCpu}%`}
                />
              </div>
            </div>

            <div className="ecs-metrics-grid">
              <div className="ecs-metric">
                <span className="ecs-metric__label">Requests/sec</span>
                <span className="ecs-metric__value">{requestsPerSecond}</span>
              </div>
              <div className="ecs-metric">
                <span className="ecs-metric__label">Response time</span>
                <span className="ecs-metric__value">{responseTimeMs}ms</span>
              </div>
              <div className="ecs-metric">
                <span className="ecs-metric__label">Alarm</span>
                <span
                  className={`ecs-metric__value ${alarmFiring ? "ecs-metric__value--alarm" : ""}`}
                >
                  {alarmFiring ? "ALARM" : "OK"}
                </span>
              </div>
              <div className="ecs-metric">
                <span className="ecs-metric__label">Cooldown</span>
                <span className="ecs-metric__value">
                  {scalingCooldown ? "Active" : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Task inspector */}
          <div className="ecs-card ecs-card--tasks">
            <div className="ecs-card__head">
              <h3>Task Inspector</h3>
              <span className="ecs-card__sub">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="ecs-task-list">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`ecs-task-chip ecs-task-chip--${task.status}`}
                >
                  <span className="ecs-task-chip__name">
                    {task.id.replace("task-", "T")}
                  </span>
                  <span className="ecs-task-chip__cpu">
                    {task.status === "provisioning"
                      ? "..."
                      : task.status === "draining"
                        ? "drain"
                        : `${task.cpuPercent}%`}
                  </span>
                  <span
                    className={`ecs-task-chip__dot ecs-task-chip__dot--${task.status}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure toggles */}
          <div className="ecs-card ecs-card--infra">
            <div className="ecs-card__head">
              <h3>Infrastructure</h3>
              <span className="ecs-card__sub">swap components</span>
            </div>
            <div className="ecs-infra-grid">
              <div className="ecs-control-group">
                <label htmlFor="ecs-db-select">Database</label>
                <select
                  id="ecs-db-select"
                  value={database}
                  onChange={(e) =>
                    dispatch(setDatabase(e.target.value as DatabaseChoice))
                  }
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mongodb">MongoDB</option>
                </select>
              </div>
              <div className="ecs-control-group">
                <label htmlFor="ecs-cicd-select">CI/CD</label>
                <select
                  id="ecs-cicd-select"
                  value={cicd}
                  onChange={(e) =>
                    dispatch(setCiCd(e.target.value as CiCdChoice))
                  }
                >
                  <option value="codepipeline">CodePipeline</option>
                  <option value="jenkins">Jenkins</option>
                </select>
              </div>
              <div className="ecs-control-group">
                <label htmlFor="ecs-orch-select">Orchestration</label>
                <select
                  id="ecs-orch-select"
                  value={orchestration}
                  onChange={(e) =>
                    dispatch(
                      setOrchestration(e.target.value as OrchestrationChoice),
                    )
                  }
                >
                  <option value="ecs">ECS (Fargate)</option>
                  <option value="eks">EKS (Kubernetes)</option>
                </select>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {activeConcept && (
        <InfoModal
          isOpen
          onClose={closeConcept}
          title={concepts[activeConcept].title}
          subtitle={concepts[activeConcept].subtitle}
          accentColor={concepts[activeConcept].accentColor}
          sections={concepts[activeConcept].sections}
          aside={concepts[activeConcept].aside}
        />
      )}
    </div>
  );
};

export default EcsAutoscalingVisualization;
