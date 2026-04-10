import { createIndexStrategyAdapter } from "./shared";

export const gistAdapter = createIndexStrategyAdapter({
  id: "gist",
  label: "GiST",
  description:
    "Choose when the workload is about overlap, ranges, proximity, or geospatial relationships.",
  colors: {
    fill: "#3b0764",
    stroke: "#a78bfa",
  },
  badgeBestFor: "Spatial and ranges",
  badgeOperators: "&&, <@, nearest",
  maintenanceCost: "Medium",
  tableAffinity: "Specialized domains",
  queryLines: ["ranges overlap", "distance / spatial search"],
  workloadLines: ["specialized operators", "not generic app queries"],
  operatorLines: ["proximity + overlap", "custom operator classes"],
  indexLines: ["generalized tree", "flexible but niche"],
  tradeoffLines: ["high flexibility", "not my first default"],
  compositeLines: ["keep scalar filters", "in companion B-tree indexes"],
  notes: {
    queryPatterns:
      "GiST is the right conversation when the queries are about overlap, containment, nearest-neighbor search, geospatial relationships, or range operators rather than plain scalar equality.",
    operatorFit:
      "I reach for GiST when the operator class is geometric, proximity-based, or overlap-oriented. That shows up with PostGIS geometries, range types, exclusion constraints, and other custom operator families that B-tree does not model well.",
    workloadFit:
      "It is more flexible than B-tree, but that flexibility is for specialized workloads. If the access path is standard business filtering or ordering, GiST is usually the wrong default and adds complexity without giving the planner what it really needs.",
    compositeAdvice:
      "When a query mixes range or spatial logic with simple scalar filters, I usually keep the GiST index focused on the overlap/proximity operator and use separate B-tree indexes for tenant, state, or time columns. That keeps each index aligned with the operator it is actually good at.",
    summary:
      "Use GiST when the semantics are about shape, distance, or overlap. It is flexible and powerful, but it is a specialized tool rather than a default business-query index.",
    exampleSql: `SELECT reservation_id
FROM room_bookings
WHERE booked_during && tsrange($1, $2, '[)');

CREATE INDEX idx_room_bookings_during_gist
  ON room_bookings USING gist (booked_during);`,
  },
});
