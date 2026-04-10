import { createIndexStrategyAdapter } from "./shared";

export const brinAdapter = createIndexStrategyAdapter({
  id: "brin",
  label: "BRIN",
  description:
    "Great for huge append-only tables when column values track physical row order closely.",
  colors: {
    fill: "#78350f",
    stroke: "#f59e0b",
  },
  badgeBestFor: "Huge append-only tables",
  badgeOperators: "range pruning",
  maintenanceCost: "Low",
  tableAffinity: "Ordered event data",
  queryLines: ["created_at ranges", "large event or log scans"],
  workloadLines: ["append-only data", "strong physical locality"],
  operatorLines: ["block summaries", "coarse range pruning"],
  indexLines: ["tiny on disk", "cheap to maintain"],
  tradeoffLines: ["excellent locality fit", "weak if data is random"],
  compositeLines: [
    "use on time + tenant",
    "only when locality stays strong",
  ],
  notes: {
    queryPatterns:
      "BRIN is a candidate when the table is very large and the filter columns align with physical row order, such as created_at on append-only events, logs, or time-series data.",
    operatorFit:
      "BRIN does not index every row like B-tree. It stores block summaries and lets PostgreSQL skip large stretches of the heap when the filtered values correlate strongly with storage order.",
    workloadFit:
      "It is tiny and very cheap to maintain, which makes it attractive for massive append-only tables. PostgreSQL 17 improved BRIN further with better update performance and multi-column BRIN support, but locality still determines whether it works well.",
    compositeAdvice:
      "I only consider multi-column BRIN when the columns share the same physical locality pattern. If tenant_id is random but created_at is ordered, a composite BRIN may disappoint and a narrower design is usually safer.",
    summary:
      "Choose BRIN for very large, physically ordered tables where a coarse summary index can prune most of the heap cheaply. If locality is weak, its advantage disappears quickly.",
    exampleSql: `SELECT *
FROM events
WHERE created_at >= now() - interval '1 day';

CREATE INDEX idx_events_created_at_brin
  ON events USING brin (created_at);`,
  },
});