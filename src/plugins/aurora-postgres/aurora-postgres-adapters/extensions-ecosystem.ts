import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Extensions Ecosystem — PostgreSQL's killer advantage

   Insurance-specific extensions: PostGIS for property,
   pg_partman for time-series, pg_cron for scheduled jobs.

   Row 1: PostGIS → pg_partman → pg_cron
   Row 2: pg_stat → Application
   ══════════════════════════════════════════════════════════ */

const POS = {
  postgis: { x: 60, y: 80 },
  partman: { x: 310, y: 80 },
  pgcron: { x: 560, y: 80 },
  pgstat: { x: 120, y: 240 },
  app: { x: 420, y: 240 },
};

export const extensionsEcosystemAdapter: AuroraPostgresAdapter = {
  id: "extensions-ecosystem",

  profile: {
    label: "Extensions Ecosystem",
    description:
      "PostgreSQL extensions add entire capabilities without leaving the database: geospatial (PostGIS), partitioning (pg_partman), scheduling (pg_cron), monitoring (pg_stat_statements).",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.extensionsActive = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "postgis",
        to: "partman",
        duration: 550,
        color: "#4ade80",
        explain:
          "PostGIS: Property insurance needs geospatial queries. 'Find all home policies within 5 miles of a flood zone.' ST_DWithin(policy.location, flood_zone.geom, 8046) — runs inside the DB, indexed with GiST. No external service needed.",
      },
      {
        from: "partman",
        to: "pgcron",
        duration: 550,
        color: "#f59e0b",
        explain:
          "pg_partman: Claims data grows forever. Partition by month: claims_2024_01, claims_2024_02. Old partitions → cold storage. Queries on recent claims only scan recent partitions. 10x faster than scanning the whole table.",
      },
      {
        from: "pgcron",
        to: "pgstat",
        duration: 500,
        color: "#a78bfa",
        explain:
          "pg_cron: Schedule database-side jobs. Every night at 2am: refresh materialized views for the dashboard, archive claims older than 7 years, run ANALYZE on hot tables. No Lambda, no cron server — it runs in PostgreSQL itself.",
      },
      {
        from: "pgstat",
        to: "app",
        duration: 500,
        color: "#60a5fa",
        explain:
          "pg_stat_statements: Top 10 slowest queries, execution count, mean time. In production, this tells you which claims query is killing your P99 latency — without APM tools. Aurora also adds Performance Insights on top.",
      },
      {
        from: "app",
        to: "postgis",
        duration: 450,
        color: "#22d3ee",
        explain:
          "The application benefits from all extensions transparently — they're just SQL. CREATE EXTENSION postgis; — one command, zero code changes. MySQL has nothing comparable. Oracle charges extra. PostgreSQL includes them free.",
      },
    ];
  },

  getStepLabels() {
    return [
      "PostGIS: Geospatial",
      "pg_partman: Partitioning",
      "pg_cron: Scheduled Jobs",
      "pg_stat: Monitoring",
      "Zero Code Changes",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("postgis")
      .at(POS.postgis.x, POS.postgis.y)
      .rect(180, 54, 12)
      .fill(hot("postgis") ? "#14532d" : "#0f172a")
      .stroke(hot("postgis") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("PostGIS");
          l.newline();
          l.color("flood zones, proximity", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("partman")
      .at(POS.partman.x, POS.partman.y)
      .rect(180, 54, 12)
      .fill(hot("partman") ? "#78350f" : "#0f172a")
      .stroke(hot("partman") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("pg_partman");
          l.newline();
          l.color("monthly claim partitions", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("pgcron")
      .at(POS.pgcron.x, POS.pgcron.y)
      .rect(180, 54, 12)
      .fill(hot("pgcron") ? "#312e81" : "#0f172a")
      .stroke(hot("pgcron") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("pg_cron");
          l.newline();
          l.color("nightly jobs in-DB", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("pgstat")
      .at(POS.pgstat.x, POS.pgstat.y)
      .rect(180, 54, 12)
      .fill(hot("pgstat") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("pgstat") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("pg_stat_statements");
          l.newline();
          l.color("query performance", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("app")
      .at(POS.app.x, POS.app.y)
      .rect(180, 54, 12)
      .fill(hot("app") ? "#164e63" : "#0f172a")
      .stroke(hot("app") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Application");
          l.newline();
          l.color("CREATE EXTENSION — done", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("postgis", "partman", "e-gis-part").stroke("#f59e0b", 1.4);
    builder.edge("partman", "pgcron", "e-part-cron").stroke("#a78bfa", 1.4);
    builder.edge("pgcron", "pgstat", "e-cron-stat").stroke("#60a5fa", 1.4);
    builder.edge("pgstat", "app", "e-stat-app").stroke("#22d3ee", 1.4);
    builder.edge("app", "postgis", "e-app-gis").stroke("#22d3ee", 1.2).dashed();
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Extensions",
        value: state.extensionsActive ? "4 Active" : "—",
        color: "#f59e0b",
      },
      {
        label: "Geospatial",
        value: state.extensionsActive ? "PostGIS" : "—",
        color: "#4ade80",
      },
      {
        label: "Cost",
        value: state.extensionsActive ? "Free" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.extensionsActive = false;
  },
};
