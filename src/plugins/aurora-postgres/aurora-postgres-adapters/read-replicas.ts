import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Read Replicas — Scale reads without impacting writes

   Aurora supports up to 15 read replicas sharing the same
   storage layer. Sub-10ms replication lag. Perfect for
   splitting OLTP writes from analytics/reporting reads.

   Row 1: Writer → Aurora Storage (shared)
   Row 2: Reader 1, Reader 2, Reader N → Reporting/Analytics
   ══════════════════════════════════════════════════════════ */

const POS = {
  writer: { x: 60, y: 80 },
  storage: { x: 350, y: 80 },
  reader1: { x: 60, y: 240 },
  reader2: { x: 280, y: 240 },
  readerN: { x: 500, y: 240 },
  reporting: { x: 720, y: 240 },
};

export const readReplicasAdapter: AuroraPostgresAdapter = {
  id: "read-replicas",

  profile: {
    label: "Read Replicas",
    description:
      "Aurora readers share the same storage layer as the writer — no replication stream needed. Up to 15 replicas with sub-10ms lag. Point reporting queries at replicas, keep OLTP fast.",
  },

  colors: { fill: "#1e3a5f", stroke: "#60a5fa" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.replicaCount = active ? 3 : 0;
    state.storageReplication = active ? "active" : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "writer",
        to: "storage",
        duration: 500,
        color: "#f59e0b",
        explain:
          "The writer instance handles all INSERT/UPDATE/DELETE for claims, policies, premiums. It sends redo log records to the shared Aurora storage layer — the same layer readers access.",
      },
      {
        from: "storage",
        to: "reader1",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Reader 1 reads directly from the shared storage. No replication stream — it sees the same data pages. Aurora invalidates reader caches when the writer commits. Lag is typically < 10ms.",
      },
      {
        from: "storage",
        to: "reader2",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Reader 2 handles a different workload. In practice: Reader 1 for the claims portal (customer-facing), Reader 2 for underwriting dashboards. Each gets dedicated CPU without competing for the writer's resources.",
      },
      {
        from: "storage",
        to: "reader-n",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Up to 15 readers. Contrast with RDS PostgreSQL: each replica needs its own storage copy and a WAL streaming slot. Aurora replicas share storage, so adding one is fast and cheap. Auto-scaling can add/remove based on CPU.",
      },
      {
        from: "reader-n",
        to: "reporting",
        duration: 450,
        color: "#22d3ee",
        explain:
          "Heavy reporting queries (loss ratio analysis, cohort reports, regulatory extracts) run on replica endpoints. The writer never sees these queries. Premium processing and claim settlements stay fast.",
      },
      {
        from: "writer",
        to: "reader1",
        duration: 400,
        color: "#a78bfa",
        explain:
          "Failover: if the writer crashes, Aurora promotes a reader to writer in ~30 seconds (vs minutes for RDS). The shared storage means no data resync needed — the new writer just starts accepting writes.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Writer → Storage",
      "Reader 1: Claims Portal",
      "Reader 2: Underwriting",
      "Reader N: Auto-Scale",
      "Reporting on Replicas",
      "Failover: 30s Promotion",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("writer")
      .at(POS.writer.x, POS.writer.y)
      .rect(180, 54, 12)
      .fill(hot("writer") ? "#78350f" : "#0f172a")
      .stroke(hot("writer") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Writer Instance");
          l.newline();
          l.color("INSERT / UPDATE / DELETE", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("storage")
      .at(POS.storage.x, POS.storage.y)
      .rect(220, 54, 12)
      .fill(hot("storage") ? "#78350f" : "#0f172a")
      .stroke(hot("storage") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Aurora Shared Storage");
          l.newline();
          l.color("6 copies, 3 AZs — single source of truth", "#fde68a", {
            fontSize: 9,
          });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("reader1")
      .at(POS.reader1.x, POS.reader1.y)
      .rect(160, 54, 12)
      .fill(hot("reader1") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("reader1") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Reader 1");
          l.newline();
          l.color("claims portal", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("reader2")
      .at(POS.reader2.x, POS.reader2.y)
      .rect(160, 54, 12)
      .fill(hot("reader2") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("reader2") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Reader 2");
          l.newline();
          l.color("underwriting dash", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("reader-n")
      .at(POS.readerN.x, POS.readerN.y)
      .rect(160, 54, 12)
      .fill(hot("reader-n") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("reader-n") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Reader N");
          l.newline();
          l.color("auto-scaled", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("reporting")
      .at(POS.reporting.x, POS.reporting.y)
      .rect(170, 54, 12)
      .fill(hot("reporting") ? "#164e63" : "#0f172a")
      .stroke(hot("reporting") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Reporting");
          l.newline();
          l.color("analytics, regulatory", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("writer", "storage", "e-w-store").stroke("#f59e0b", 1.4);
    builder.edge("storage", "reader1", "e-store-r1").stroke("#60a5fa", 1.4);
    builder.edge("storage", "reader2", "e-store-r2").stroke("#60a5fa", 1.4);
    builder.edge("storage", "reader-n", "e-store-rn").stroke("#60a5fa", 1.4);
    builder.edge("reader-n", "reporting", "e-rn-report").stroke("#22d3ee", 1.4);
    builder
      .edge("writer", "reader1", "e-w-failover")
      .stroke("#a78bfa", 1.2)
      .dashed();
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Replicas",
        value: state.replicaCount > 0 ? `${state.replicaCount}` : "—",
        color: "#60a5fa",
      },
      {
        label: "Max",
        value: state.replicaCount > 0 ? "15" : "—",
        color: "#f59e0b",
      },
      {
        label: "Lag",
        value: state.replicaCount > 0 ? "< 10ms" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.replicaCount = 0;
    state.storageReplication = "none";
  },
};
