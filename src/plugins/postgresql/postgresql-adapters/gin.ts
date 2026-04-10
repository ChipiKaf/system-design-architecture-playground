import { createIndexStrategyAdapter } from "./shared";

function renderGinInset(builder: any, _state: any, helpers: any) {
  const active =
    helpers.phase === "comparison" ||
    helpers.phase === "summary" ||
    helpers.hot("index");
  const stroke = active ? "#4ade80" : "#334155";
  const text = active ? "#dcfce7" : "#94a3b8";
  const accent = "#22c55e";
  const accentSoft = "#86efac";
  const amber = "#f59e0b";
  const muted = "#475569";

  const isReadStep = helpers.hot("gin-reading");
  const isWriteStep = helpers.hot("gin-writing");
  const isContrastStep = helpers.hot("gin-contrast");
  const pathColor = isWriteStep ? amber : accent;

  /* ── Layout constants (wider inset) ──────────────── */
  const BOX = { x: 1220, y: 100, w: 480, h: 490 };
  const CX = BOX.x + BOX.w / 2; // 1460

  const sourceTitle = isWriteStep
    ? "new row 31 contains"
    : isReadStep
      ? "query asks for"
      : isContrastStep
        ? "1 row packs many values"
        : "row 18 contains";
  const sourceLine1 = isContrastStep
    ? '{"channel":"mobile", \u2026}'
    : "channel=mobile";
  const sourceLine2 = isContrastStep
    ? '["priority","vip", \u2026]'
    : isReadStep
      ? "AND tag=priority"
      : "tag=priority";
  const mobileRows = isWriteStep ? "12 | 18 | 27 | 31" : "12 | 18 | 27";
  const priorityRows = isWriteStep ? "7 | 18 | 31" : "7 | 18";
  const footer = isWriteStep
    ? "One row can update many term lists"
    : isReadStep
      ? "Read = value lookup -> posting lists -> intersect -> fetch"
      : isContrastStep
        ? "Search inside a structure \u2192 GIN  |  Single value \u2192 B-tree"
        : "GIN flips row values into value -> matching rows";

  builder.overlay((overlay: any) => {
    overlay.add(
      "rect",
      {
        x: BOX.x,
        y: BOX.y,
        w: BOX.w,
        h: BOX.h,
        rx: 18,
        fill: "rgba(15, 23, 42, 0.32)",
        stroke,
        strokeWidth: 1.2,
        strokeDasharray: "6 4",
        opacity: 0.95,
      },
      { key: "gin-inset-box" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 42,
        text: "Mini GIN",
        fill: isWriteStep ? amber : accent,
        fontSize: 13,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "gin-inset-title" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 60,
        text: "search inside JSONB / arrays \u2192 B-tree can't, GIN can",
        fill: text,
        fontSize: 9,
        fontWeight: "500",
        textAnchor: "start",
      },
      { key: "gin-inset-subtitle" },
    );
    /* B-tree blind spot: shows why B-tree can't handle @> on JSONB */
    overlay.add(
      "rect",
      {
        x: BOX.x + 16,
        y: BOX.y + 72,
        w: BOX.w - 32,
        h: 26,
        rx: 8,
        fill: isContrastStep
          ? "rgba(127, 29, 29, 0.22)"
          : "rgba(15, 23, 42, 0.35)",
        stroke: isContrastStep ? "#f87171" : muted,
        strokeWidth: isContrastStep ? 1.5 : 0.8,
      },
      { key: "gin-btree-blob-box" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: BOX.y + 88,
        text: "B-tree: {\u2026} = 1 sorted blob \u2192 can't answer @>",
        fill: isContrastStep ? "#fca5a5" : "#94a3b8",
        fontSize: 8.5,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "gin-btree-blob-text" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: BOX.y + 106,
        text: isContrastStep
          ? "GIN decomposes \u2192 value \u2192 rows \u2192 fast @> \u2713"
          : "GIN: value \u2192 rows",
        fill: isContrastStep ? "#bbf7d0" : accentSoft,
        fontSize: 8.5,
        fontWeight: "700",
        textAnchor: "middle",
      },
      { key: "gin-decompose-label" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: 290,
        text: isContrastStep
          ? "1. one row packs many searchable values"
          : "1. look up each value (not a tree walk)",
        fill: text,
        fontSize: 8.5,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "gin-step-label-values" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: 378,
        text: "2. each value has a posting list of row ids",
        fill: text,
        fontSize: 8.5,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "gin-step-label-rows" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: 468,
        text: isWriteStep
          ? "3. one write adds row id to multiple lists"
          : "3. intersect lists, then fetch matched rows",
        fill: isWriteStep ? "#fcd34d" : text,
        fontSize: 8.5,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "gin-step-label-bottom" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: BOX.y + BOX.h - 16,
        text: footer,
        fill: isWriteStep ? "#fcd34d" : isReadStep ? "#bbf7d0" : "#94a3b8",
        fontSize: 9,
        fontWeight: "500",
        textAnchor: "middle",
      },
      { key: "gin-inset-footer" },
    );

    if (isReadStep) {
      overlay.add(
        "rect",
        {
          x: CX + 40,
          y: 476,
          w: 120,
          h: 28,
          rx: 8,
          fill: "rgba(20, 83, 45, 0.45)",
          stroke: accent,
          strokeWidth: 1.5,
        },
        { key: "gin-read-result-box" },
      );
      overlay.add(
        "text",
        {
          x: CX + 100,
          y: 494,
          text: "fetch row 18",
          fill: "#bbf7d0",
          fontSize: 9.5,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "gin-read-result-label" },
      );
    }

    if (isWriteStep) {
      overlay.add(
        "rect",
        {
          x: CX + 40,
          y: 474,
          w: 120,
          h: 32,
          rx: 8,
          fill: "rgba(120, 53, 15, 0.4)",
          stroke: amber,
          strokeWidth: 1.4,
        },
        { key: "gin-write-effects-box" },
      );
      overlay.add(
        "text",
        {
          x: CX + 100,
          y: 494,
          text: "pending + WAL",
          fill: "#fde68a",
          fontSize: 9,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "gin-write-effects-label" },
      );
    }
  });

  /* ═══ Source row / query ═════════════════════════════ */
  builder
    .node("gin-source")
    .at(CX, 244)
    .rect(260, 48, 12)
    .fill(isWriteStep ? "rgba(120, 53, 15, 0.28)" : "rgba(20, 83, 45, 0.28)")
    .stroke(pathColor, 2)
    .richLabel(
      (label: any) => {
        label.bold(sourceTitle);
        label.newline();
        label.color(sourceLine1, isWriteStep ? "#fde68a" : "#bbf7d0", {
          fontSize: 8.5,
        });
        label.newline();
        label.color(sourceLine2, isWriteStep ? "#fde68a" : "#bbf7d0", {
          fontSize: 8.5,
        });
      },
      { fill: "#fff", fontSize: 10, dy: -8, lineHeight: 1.35 },
    );

  /* ═══ Lookup entries ════════════════════════════════ */
  builder
    .node("gin-term-mobile")
    .at(CX - 90, 330)
    .rect(155, 46, 12)
    .fill("rgba(20, 83, 45, 0.18)")
    .stroke(
      helpers.hot("gin-term-mobile") || isReadStep || isWriteStep
        ? pathColor
        : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold("channel=mobile");
        label.newline();
        label.color("lookup entry", accentSoft, { fontSize: 8 });
      },
      { fill: "#fff", fontSize: 10, dy: -5, lineHeight: 1.35 },
    );

  builder
    .node("gin-term-priority")
    .at(CX + 90, 330)
    .rect(155, 46, 12)
    .fill("rgba(20, 83, 45, 0.18)")
    .stroke(
      helpers.hot("gin-term-priority") || isReadStep || isWriteStep
        ? pathColor
        : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold("tag=priority");
        label.newline();
        label.color("lookup entry", accentSoft, { fontSize: 8 });
      },
      { fill: "#fff", fontSize: 10, dy: -5, lineHeight: 1.35 },
    );

  /* ═══ Posting lists ═════════════════════════════════ */
  builder
    .node("gin-postings-mobile")
    .at(CX - 90, 418)
    .rect(155, 50, 12)
    .fill(isWriteStep ? "rgba(120, 53, 15, 0.2)" : "rgba(15, 23, 42, 0.95)")
    .stroke(
      helpers.hot("gin-postings-mobile") || isReadStep || isWriteStep
        ? pathColor
        : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold("posting list: mobile");
        label.newline();
        label.color(mobileRows, isWriteStep ? "#fde68a" : "#bbf7d0", {
          fontSize: 8,
        });
      },
      { fill: "#fff", fontSize: 10, dy: -6, lineHeight: 1.35 },
    );

  builder
    .node("gin-postings-priority")
    .at(CX + 90, 418)
    .rect(155, 50, 12)
    .fill(isWriteStep ? "rgba(120, 53, 15, 0.2)" : "rgba(15, 23, 42, 0.95)")
    .stroke(
      helpers.hot("gin-postings-priority") || isReadStep || isWriteStep
        ? pathColor
        : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold("posting list: priority");
        label.newline();
        label.color(priorityRows, isWriteStep ? "#fde68a" : "#bbf7d0", {
          fontSize: 8,
        });
      },
      { fill: "#fff", fontSize: 10, dy: -6, lineHeight: 1.35 },
    );

  /* ═══ Intersect / fan-out ═══════════════════════════ */
  builder
    .node("gin-match")
    .at(CX - 90, 506)
    .rect(155, 50, 12)
    .fill(isWriteStep ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.18)")
    .stroke(
      helpers.hot("gin-match") || isReadStep || isWriteStep ? pathColor : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold(isWriteStep ? "fan out write" : "AND intersect");
        label.newline();
        label.color(
          isWriteStep ? "31 updates 2 lists" : "[18]",
          isWriteStep ? "#fde68a" : "#bbf7d0",
          { fontSize: 8 },
        );
      },
      { fill: "#fff", fontSize: 10, dy: -5, lineHeight: 1.35 },
    );

  builder
    .node("gin-output")
    .at(CX + 90, 506)
    .rect(155, 50, 12)
    .fill(isWriteStep ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.18)")
    .stroke(
      helpers.hot("gin-output") || isReadStep || isWriteStep
        ? pathColor
        : muted,
      2,
    )
    .richLabel(
      (label: any) => {
        label.bold(isWriteStep ? "pending + WAL" : "fetch matched row");
        label.newline();
        label.color(
          isWriteStep ? "merge / cleanup later" : "row 18 only",
          isWriteStep ? "#fde68a" : "#bbf7d0",
          { fontSize: 8 },
        );
      },
      { fill: "#fff", fontSize: 9.5, dy: -5, lineHeight: 1.35 },
    );

  builder
    .edge("gin-source", "gin-term-mobile", "gin-edge-source-mobile")
    .stroke(helpers.hot("gin-term-mobile") ? pathColor : muted, 2);

  builder
    .edge("gin-source", "gin-term-priority", "gin-edge-source-priority")
    .stroke(helpers.hot("gin-term-priority") ? pathColor : muted, 2);

  builder
    .edge("gin-term-mobile", "gin-postings-mobile", "gin-edge-mobile-postings")
    .stroke(helpers.hot("gin-postings-mobile") ? pathColor : muted, 2);

  builder
    .edge(
      "gin-term-priority",
      "gin-postings-priority",
      "gin-edge-priority-postings",
    )
    .stroke(helpers.hot("gin-postings-priority") ? pathColor : muted, 2);

  builder
    .edge("gin-postings-mobile", "gin-match", "gin-edge-mobile-match")
    .stroke(helpers.hot("gin-match") ? pathColor : muted, 2);

  builder
    .edge("gin-postings-priority", "gin-match", "gin-edge-priority-match")
    .stroke(helpers.hot("gin-match") ? pathColor : muted, 2);

  builder
    .edge("gin-match", "gin-output", "gin-edge-match-output")
    .stroke(helpers.hot("gin-output") ? pathColor : muted, 2);
}

export const ginAdapter = createIndexStrategyAdapter({
  id: "gin",
  label: "GIN",
  description:
    "Use for jsonb, arrays, and full-text search when containment or membership queries dominate.",
  colors: {
    fill: "#052e16",
    stroke: "#22c55e",
  },
  badgeBestFor: "JSONB, arrays, FTS",
  badgeOperators: "@>, @@, array ops",
  maintenanceCost: "High",
  tableAffinity: "Read-heavy docs",
  queryLines: ["jsonb @> ...", "tags @> ... / @@"],
  workloadLines: ["read-heavy search", "writes are expensive"],
  operatorLines: ["value membership", "document / text search"],
  indexLines: ["value -> matching rows", "not row order"],
  tradeoffLines: ["strong read win", "heavier write path"],
  compositeLines: ["pair with tenant/time", "via separate B-tree indexes"],
  renderExtra: renderGinInset,
  notes: {
    queryPatterns:
      "GIN becomes interesting when the predicate is really containment, membership, or full-text search: metadata @> '{\"region\":\"eu\"}', tags @> ARRAY['vip'], or search_vector @@ plainto_tsquery(...).",
    operatorFit:
      "GIN is ideal when one row contains many searchable values. Instead of storing rows in sorted order like B-tree, it flips the model and stores each value with the row ids that contain it. That is why it works so well for jsonb, arrays, and full-text search.",
    workloadFit:
      "Choose it when reads are search-like and frequent enough to justify a much heavier write path. One insert can touch several term lists, so GIN is powerful for reads but not a free default for hot update workloads.",
    compositeAdvice:
      "I usually keep the GIN index focused on the document or array predicate and pair it with separate B-tree indexes for tenant_id, status, or created_at when those filters also matter. That is often better than trying to force one index to do everything.",
    summary:
      "Use GIN for document-like or multi-value search patterns. The mental model is simple once you flip it: value -> rows. It buys fast containment and full-text lookups, but only when that read win outweighs the write fan-out.",
    exampleSql: `SELECT id, title
FROM orders
WHERE metadata @> '{"channel":"mobile"}'
  AND tags @> ARRAY['priority'];

CREATE INDEX idx_orders_metadata_gin
  ON orders USING gin (metadata jsonb_path_ops);

CREATE INDEX idx_orders_tags_gin
  ON orders USING gin (tags);`,
    exampleTable: {
      header: ["id", "metadata", "tags"],
      rows: [
        ["7", '{"channel":"web"}', "['priority']"],
        ["12", '{"channel":"mobile"}', "['normal']"],
        ["18", '{"channel":"mobile"}', "['priority','vip']"],
        ["27", '{"channel":"mobile"}', "['normal']"],
      ],
    },
  },
});
