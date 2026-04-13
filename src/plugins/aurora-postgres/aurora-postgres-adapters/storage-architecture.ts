import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Aurora Storage Architecture — How Aurora differs from RDS

   Aurora separates compute from storage. The storage layer
   is a distributed, shared-disk system with 6-way replication
   across 3 AZs. Writes go to the log — not data pages.

   Row 1: Writer → Log Records → Protection Group (6 copies)
   Row 2: Quorum (4/6) → S3 Continuous Backup → Storage Node
   ══════════════════════════════════════════════════════════ */

const POS = {
  writer: { x: 60, y: 80 },
  logRecords: { x: 280, y: 80 },
  pg1: { x: 500, y: 40 },
  pg2: { x: 500, y: 120 },
  pg3: { x: 700, y: 40 },
  pg4: { x: 700, y: 120 },
  quorum: { x: 60, y: 260 },
  s3Backup: { x: 310, y: 260 },
  storageNode: { x: 570, y: 260 },
};

export const storageArchitectureAdapter: AuroraPostgresAdapter = {
  id: "storage-architecture",

  profile: {
    label: "Storage Architecture",
    description:
      "Aurora doesn't use traditional EBS volumes. It has a purpose-built distributed storage layer: 6 copies of your data across 3 AZs, quorum writes (4/6), and continuous backup to S3.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.storageReplication = active ? "quorum" : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "writer",
        to: "log-records",
        duration: 500,
        color: "#f59e0b",
        explain:
          "The Aurora writer instance sends redo log records — not full data pages. This is the key insight: Aurora only ships the log. The storage layer replays it to reconstruct pages. Way less network traffic than RDS.",
      },
      {
        from: "log-records",
        to: "pg1",
        duration: 400,
        color: "#f59e0b",
        explain:
          "Log records fan out to Protection Groups. Each 10GB chunk of your database is a Protection Group with 6 copies spread across 3 Availability Zones (2 per AZ).",
      },
      {
        from: "log-records",
        to: "pg2",
        duration: 400,
        color: "#f59e0b",
        explain:
          "Copy 2 in AZ-1. Aurora writes in parallel to all 6 storage nodes simultaneously — it doesn't wait for one before starting the next.",
      },
      {
        from: "pg1",
        to: "pg3",
        duration: 400,
        color: "#4ade80",
        explain:
          "Copies in AZ-2. That's 4 nodes acknowledging so far. Aurora uses a quorum protocol: writes succeed when 4 of 6 copies acknowledge. This means it can lose an entire AZ and a second node and still commit writes.",
      },
      {
        from: "pg2",
        to: "pg4",
        duration: 400,
        color: "#4ade80",
        explain:
          "Copies in AZ-3. The key trade-off vs RDS: RDS PostgreSQL replicates full data pages to a standby in one AZ. Aurora replicates tiny log records to 6 nodes across 3 AZs. More durable, less I/O, faster recovery.",
      },
      {
        from: "pg3",
        to: "quorum",
        duration: 500,
        color: "#22d3ee",
        explain:
          "4/6 quorum achieved — the write is committed. The writer can move on. Remaining nodes catch up asynchronously. Read quorum only needs 3/6, so reads stay fast even during repairs.",
      },
      {
        from: "quorum",
        to: "s3-backup",
        duration: 500,
        color: "#a78bfa",
        explain:
          "Continuously, Aurora streams redo logs to S3. Point-in-time recovery to any second in your retention window (up to 35 days). No backup windows, no snapshot downtime. It's always backing up.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Ship Log Records",
      "Protection Group AZ-1a",
      "Protection Group AZ-1b",
      "Replicate to AZ-2",
      "Replicate to AZ-3",
      "Quorum: 4/6 Commit",
      "Continuous S3 Backup",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("writer")
      .at(POS.writer.x, POS.writer.y)
      .rect(170, 54, 12)
      .fill(hot("writer") ? "#78350f" : "#0f172a")
      .stroke(hot("writer") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Aurora Writer");
          l.newline();
          l.color("compute instance", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("log-records")
      .at(POS.logRecords.x, POS.logRecords.y)
      .rect(170, 54, 12)
      .fill(hot("log-records") ? "#78350f" : "#0f172a")
      .stroke(hot("log-records") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Redo Log Records");
          l.newline();
          l.color("not data pages!", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("pg1")
      .at(POS.pg1.x, POS.pg1.y)
      .rect(150, 44, 10)
      .fill(hot("pg1") ? "#14532d" : "#0f172a")
      .stroke(hot("pg1") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AZ-1  Copy A");
          l.newline();
          l.color("10GB segment", "#86efac", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 10, dy: -3, lineHeight: 1.5 },
      );

    builder
      .node("pg2")
      .at(POS.pg2.x, POS.pg2.y)
      .rect(150, 44, 10)
      .fill(hot("pg2") ? "#14532d" : "#0f172a")
      .stroke(hot("pg2") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AZ-1  Copy B");
          l.newline();
          l.color("10GB segment", "#86efac", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 10, dy: -3, lineHeight: 1.5 },
      );

    builder
      .node("pg3")
      .at(POS.pg3.x, POS.pg3.y)
      .rect(150, 44, 10)
      .fill(hot("pg3") ? "#14532d" : "#0f172a")
      .stroke(hot("pg3") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AZ-2  Copy");
          l.newline();
          l.color("10GB segment", "#86efac", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 10, dy: -3, lineHeight: 1.5 },
      );

    builder
      .node("pg4")
      .at(POS.pg4.x, POS.pg4.y)
      .rect(150, 44, 10)
      .fill(hot("pg4") ? "#14532d" : "#0f172a")
      .stroke(hot("pg4") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AZ-3  Copy");
          l.newline();
          l.color("10GB segment", "#86efac", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 10, dy: -3, lineHeight: 1.5 },
      );

    builder
      .node("quorum")
      .at(POS.quorum.x, POS.quorum.y)
      .rect(180, 54, 12)
      .fill(hot("quorum") ? "#164e63" : "#0f172a")
      .stroke(hot("quorum") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Quorum 4/6");
          l.newline();
          l.color("write committed", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("s3-backup")
      .at(POS.s3Backup.x, POS.s3Backup.y)
      .rect(180, 54, 12)
      .fill(hot("s3-backup") ? "#312e81" : "#0f172a")
      .stroke(hot("s3-backup") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("S3 Continuous");
          l.newline();
          l.color("point-in-time recovery", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("writer", "log-records", "e-w-log").stroke("#f59e0b", 1.4);
    builder.edge("log-records", "pg1", "e-log-pg1").stroke("#f59e0b", 1.2);
    builder.edge("log-records", "pg2", "e-log-pg2").stroke("#f59e0b", 1.2);
    builder.edge("pg1", "pg3", "e-pg1-pg3").stroke("#4ade80", 1.2);
    builder.edge("pg2", "pg4", "e-pg2-pg4").stroke("#4ade80", 1.2);
    builder.edge("pg3", "quorum", "e-pg3-q").stroke("#22d3ee", 1.2).dashed();
    builder.edge("pg4", "quorum", "e-pg4-q").stroke("#22d3ee", 1.2).dashed();
    builder.edge("quorum", "s3-backup", "e-q-s3").stroke("#a78bfa", 1.4);
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Replication",
        value: state.storageReplication === "quorum" ? "6-way" : "—",
        color: "#f59e0b",
      },
      {
        label: "Quorum",
        value: state.storageReplication === "quorum" ? "4/6 Write" : "—",
        color: "#22d3ee",
      },
      {
        label: "AZs",
        value: state.storageReplication === "quorum" ? "3" : "—",
        color: "#4ade80",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.storageReplication = "none";
  },
};
