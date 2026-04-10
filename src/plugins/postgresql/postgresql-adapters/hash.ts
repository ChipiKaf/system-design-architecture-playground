import { createIndexStrategyAdapter } from "./shared";

export const hashAdapter = createIndexStrategyAdapter({
  id: "hash",
  label: "Hash",
  description:
    "Valid for equality-only lookups, but usually outclassed by B-tree in real systems.",
  colors: {
    fill: "#4c0519",
    stroke: "#fb7185",
  },
  badgeBestFor: "Exact equality only",
  badgeOperators: "=",
  maintenanceCost: "Medium",
  tableAffinity: "Narrow hot lookups",
  queryLines: ["exact-match filters", "no range or sort support"],
  workloadLines: ["rare specialist case", "B-tree usually wins"],
  operatorLines: ["equality only", "hash buckets"],
  indexLines: ["WAL-logged now", "still niche"],
  tradeoffLines: ["valid but limited", "almost never my default"],
  compositeLines: [
    "prefer B-tree unless",
    "the workload is truly equality-only",
  ],
  notes: {
    queryPatterns:
      "Hash only enters the discussion for exact-match lookup patterns where the access path is strictly equality and there is no need for range scans, ordering, or prefix matching.",
    operatorFit:
      "Modern PostgreSQL hash indexes are WAL-logged and fully valid, but their operator support is intentionally narrow. They solve equality lookup and little else, while B-tree solves equality plus several other common planner needs.",
    workloadFit:
      "That makes hash a niche option. In most workloads, B-tree is more generally useful and easier to justify because the same index can serve equality lookups today and broader predicates tomorrow.",
    compositeAdvice:
      "If I am even thinking about a hash index, I double-check whether a narrow B-tree would give nearly the same equality performance while preserving room for ORDER BY, range filtering, or future query evolution. Most of the time, the answer is yes.",
    summary:
      "Hash is valid, but rarely the best strategic choice. Use it only when the workload is genuinely equality-only and B-tree does not already solve the problem well enough.",
    exampleSql: `SELECT *
FROM sessions
WHERE session_token = $1;

CREATE INDEX idx_sessions_token_hash
  ON sessions USING hash (session_token);`,
  },
});