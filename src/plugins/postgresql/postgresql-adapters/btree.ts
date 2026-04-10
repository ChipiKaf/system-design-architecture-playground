import { createIndexStrategyAdapter } from "./shared";

function renderBtreeInset(builder: any, _state: any, helpers: any) {
  const active =
    helpers.phase === "comparison" ||
    helpers.phase === "summary" ||
    helpers.hot("index");
  const stroke = active ? "#60a5fa" : "#334155";
  const text = active ? "#dbeafe" : "#94a3b8";
  const accent = "#3b82f6";
  const muted = "#475569";
  const amber = "#f59e0b";

  /* ── Step detection ──────────────────────────────── */
  const isReading = helpers.hot("btree-reading");
  const isWriting = helpers.hot("btree-writing");
  const pathColor = isWriting ? amber : accent;

  /* ── Layout constants (centred in wider inset) ───── */
  const BOX = { x: 1220, y: 100, w: 480, h: 490 };
  const CX = BOX.x + BOX.w / 2; // 1460

  const captionText = isWriting
    ? "Each page = 8 kB disk block with sorted entries"
    : isReading
      ? "Traverse root → internal → leaf  (2 page reads)"
      : "Real B-tree pages: wide, disk-based, many keys each";

  /* ── Inset container ─────────────────────────────── */
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
      { key: "btree-inset-box" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 30,
        text: "B-tree (page view)",
        fill: isWriting ? amber : accent,
        fontSize: 13,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "btree-inset-title" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 48,
        text: "each node = 8 kB page with many sorted keys",
        fill: text,
        fontSize: 9,
        fontWeight: "500",
        textAnchor: "start",
      },
      { key: "btree-inset-subtitle" },
    );

    /* ── Page type legend ─────────────────────────── */
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 66,
        text: "internal page = keys + child pointers",
        fill: "#94a3b8",
        fontSize: 8,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "btree-legend-internal" },
    );
    overlay.add(
      "text",
      {
        x: BOX.x + 20,
        y: BOX.y + 80,
        text: "leaf page = keys + row pointers (TIDs)",
        fill: "#94a3b8",
        fontSize: 8,
        fontWeight: "600",
        textAnchor: "start",
      },
      { key: "btree-legend-leaf" },
    );

    /* ── Caption at bottom ────────────────────────── */
    overlay.add(
      "text",
      {
        x: CX,
        y: BOX.y + BOX.h - 16,
        text: captionText,
        fill: isWriting ? "#fcd34d" : isReading ? "#bfdbfe" : "#94a3b8",
        fontSize: 9,
        fontWeight: "500",
        textAnchor: "middle",
      },
      { key: "btree-inset-caption" },
    );

    /* ── Write step indicators ─────────────────────── */
    if (helpers.hot("btree-leaf-paid") && isWriting) {
      overlay.add(
        "rect",
        {
          x: CX - 120,
          y: BOX.y + BOX.h - 62,
          w: 100,
          h: 28,
          rx: 8,
          fill: "rgba(120, 53, 15, 0.45)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "btree-wal-box" },
      );
      overlay.add(
        "text",
        {
          x: CX - 70,
          y: BOX.y + BOX.h - 45,
          text: "WAL write",
          fill: "#fcd34d",
          fontSize: 9.5,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "btree-wal-label" },
      );
      overlay.add(
        "rect",
        {
          x: CX + 20,
          y: BOX.y + BOX.h - 62,
          w: 110,
          h: 28,
          rx: 8,
          fill: "rgba(120, 53, 15, 0.35)",
          stroke: amber,
          strokeWidth: 1,
          opacity: 0.8,
        },
        { key: "btree-vacuum-box" },
      );
      overlay.add(
        "text",
        {
          x: CX + 75,
          y: BOX.y + BOX.h - 45,
          text: "vacuum later",
          fill: "#fbbf24",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "btree-vacuum-label" },
      );
    }

    /* ── Read step: result indicator ───────────────── */
    if (helpers.hot("btree-leaf-paid") && isReading) {
      overlay.add(
        "rect",
        {
          x: CX - 60,
          y: BOX.y + BOX.h - 62,
          w: 120,
          h: 28,
          rx: 8,
          fill: "rgba(23, 37, 84, 0.6)",
          stroke: accent,
          strokeWidth: 1.5,
        },
        { key: "btree-result-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: BOX.y + BOX.h - 45,
          text: "2 page reads \u2713",
          fill: "#93c5fd",
          fontSize: 10,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "btree-result-label" },
      );
    }
  });

  /* ═══ Root page ══════════════════════════════════════ */
  const rootHighlight = helpers.hot("btree-root") || isReading || isWriting;
  builder
    .node("btree-root")
    .at(CX, 230)
    .rect(340, 50, 10)
    .fill("rgba(23, 37, 84, 0.92)")
    .stroke(rootHighlight ? pathColor : muted, 2)
    .richLabel(
      (label: any) => {
        label.color("ROOT PAGE", rootHighlight ? "#93c5fd" : "#94a3b8", {
          fontSize: 8,
          fontWeight: "bold",
        });
        label.newline();
        label.color(
          "  5   |   10   |   15   |   20   |   \u2026",
          rootHighlight ? "#dbeafe" : "#94a3b8",
          { fontSize: 10 },
        );
        label.newline();
        label.color(
          "\u2193        \u2193        \u2193        \u2193        \u2193",
          rootHighlight ? "#60a5fa" : "#475569",
          { fontSize: 8 },
        );
      },
      { fill: "#fff", fontSize: 10, dy: -10, lineHeight: 1.3 },
    );

  /* ═══ Internal page (account 10) ════════════════════ */
  const intLeftHighlight =
    helpers.hot("btree-branch-left") || isReading || isWriting;
  builder
    .node("btree-branch-left")
    .at(CX - 80, 340)
    .rect(230, 56, 10)
    .fill("rgba(30, 41, 59, 0.95)")
    .stroke(intLeftHighlight ? pathColor : muted, 2)
    .richLabel(
      (label: any) => {
        label.color(
          "INTERNAL PAGE  acct 10",
          intLeftHighlight ? "#93c5fd" : "#94a3b8",
          { fontSize: 8, fontWeight: "bold" },
        );
        label.newline();
        label.color(
          isWriting
            ? "  open  |  paid  |  \u2605 new"
            : "  open  |  paid  |  void",
          isWriting ? "#fcd34d" : intLeftHighlight ? "#dbeafe" : "#94a3b8",
          { fontSize: 9.5 },
        );
        label.newline();
        label.color(
          "   \u2193         \u2193         \u2193   child ptrs",
          intLeftHighlight ? "#60a5fa" : "#475569",
          { fontSize: 7.5 },
        );
      },
      { fill: "#fff", fontSize: 9, dy: -10, lineHeight: 1.35 },
    );

  /* ═══ Internal page (account 11+) dimmed ════════════ */
  builder
    .node("btree-branch-right")
    .at(CX + 160, 340)
    .rect(90, 56, 10)
    .fill("rgba(30, 41, 59, 0.5)")
    .stroke(muted, 1.5)
    .richLabel(
      (label: any) => {
        label.color("acct", "#64748b", { fontSize: 7, fontWeight: "bold" });
        label.newline();
        label.color("11+", "#64748b", { fontSize: 10 });
        label.newline();
        label.color("\u2026", "#475569", { fontSize: 8 });
      },
      { fill: "#64748b", fontSize: 9, dy: -10, lineHeight: 1.35 },
    );

  /* ═══ Leaf page: paid ═══════════════════════════════ */
  if (isWriting && helpers.hot("btree-leaf-paid")) {
    builder
      .node("btree-leaf-paid")
      .at(CX - 80, 448)
      .rect(260, 50, 8)
      .fill("rgba(120, 53, 15, 0.25)")
      .stroke(amber, 2)
      .richLabel(
        (label: any) => {
          label.color("LEAF PAGE  status=paid", "#fcd34d", {
            fontSize: 8,
            fontWeight: "bold",
          });
          label.newline();
          label.color(
            "\u2605 Apr 13  |  Apr 12  |  Apr 11  |  \u2026",
            "#fde68a",
            { fontSize: 9.5 },
          );
          label.newline();
          label.color("  TID(0,7)  |  TID(0,6)  |  TID(0,5)", "#fbbf24", {
            fontSize: 8,
          });
        },
        { fill: "#fff", fontSize: 9, dy: -8, lineHeight: 1.3 },
      );
  } else {
    const leafHighlight = helpers.hot("btree-leaf-paid") && isReading;
    builder
      .node("btree-leaf-paid")
      .at(CX - 80, 448)
      .rect(260, 50, 8)
      .fill("rgba(15, 23, 42, 0.95)")
      .stroke(leafHighlight ? accent : muted, 2)
      .richLabel(
        (label: any) => {
          label.color(
            "LEAF PAGE  status=paid",
            leafHighlight ? "#93c5fd" : "#94a3b8",
            { fontSize: 8, fontWeight: "bold" },
          );
          label.newline();
          label.color(
            "  Apr 13  |  Apr 12  |  Apr 11  |  \u2026",
            leafHighlight ? "#dbeafe" : "#94a3b8",
            { fontSize: 9.5 },
          );
          label.newline();
          label.color(
            "  TID(0,7)  |  TID(0,6)  |  TID(0,5)",
            leafHighlight ? "#60a5fa" : "#475569",
            { fontSize: 8 },
          );
        },
        { fill: "#fff", fontSize: 9, dy: -8, lineHeight: 1.3 },
      );
  }

  /* ═══ Leaf page: open (dimmed) ═══════════════════════ */
  builder
    .node("btree-leaf-open")
    .at(CX + 160, 448)
    .rect(90, 50, 8)
    .fill("rgba(15, 23, 42, 0.5)")
    .stroke(muted, 1.5)
    .richLabel(
      (label: any) => {
        label.color("LEAF", "#64748b", { fontSize: 7, fontWeight: "bold" });
        label.newline();
        label.color("open", "#64748b", { fontSize: 9 });
        label.newline();
        label.color("\u2026", "#475569", { fontSize: 7 });
      },
      { fill: "#64748b", fontSize: 8, dy: -8, lineHeight: 1.3 },
    );

  /* ═══ Edges ═════════════════════════════════════════ */
  builder
    .edge("btree-root", "btree-branch-left", "btree-edge-left")
    .stroke(rootHighlight ? pathColor : muted, 2);

  builder
    .edge("btree-root", "btree-branch-right", "btree-edge-right")
    .stroke(muted, 1.5);

  builder
    .edge("btree-branch-left", "btree-leaf-paid", "btree-edge-paid")
    .stroke(intLeftHighlight ? pathColor : muted, 2);

  builder
    .edge("btree-branch-left", "btree-leaf-open", "btree-edge-open")
    .stroke(muted, 1.5);
}

export const btreeAdapter = createIndexStrategyAdapter({
  id: "btree",
  label: "B-tree",
  description:
    "Best default for normal transactional app queries: exact lookups, ranges, sorting, joins, and starts-with text.",
  colors: {
    fill: "#172554",
    stroke: "#3b82f6",
  },
  badgeBestFor: "Equality, range, sort",
  badgeOperators: "=, <, >, BETWEEN",
  maintenanceCost: "Low-Medium",
  tableAffinity: "Transactional apps",
  queryLines: ["=, BETWEEN, ORDER BY", "LIKE 'abc%'"],
  workloadLines: ["lots of small app requests", "get a user / recent orders"],
  operatorLines: ["exact match + range", "sorting and joins"],
  indexLines: ["sorted like a phone book", "great default choice"],
  tradeoffLines: ["easy first choice", "writes must update it too"],
  compositeLines: ["(account_id, status,", " created_at DESC)"],
  renderExtra: renderBtreeInset,
  notes: {
    queryPatterns:
      "If the workload is mostly queries like WHERE user_id = $1, WHERE created_at BETWEEN ..., ORDER BY created_at DESC, or LIKE 'Joh%', B-tree is usually the right first choice.",
    operatorFit:
      "Think of B-tree like a phone book: values stay sorted, so PostgreSQL can jump to the right area and scan from there. That is why it works so well for exact matches, ranges, sorting, joins, and starts-with text.",
    workloadFit:
      "This is the kind of app where the database keeps getting small everyday requests like 'get this user', 'show recent orders', or 'match orders to users'. B-tree is a good fit because those queries are usually exact lookups, ranges, joins, or sorting. It is still not free though, because every insert, delete, or indexed update also has to maintain the B-tree. More indexes means more WAL, more vacuum work, and more write overhead.",
    compositeAdvice:
      "If the hot path is WHERE account_id = $1 AND status = $2 ORDER BY created_at DESC, build a composite B-tree such as (account_id, status, created_at DESC). Put equality columns first, then range or sort keys, and only add INCLUDE columns when index-only scans are worth the extra width.",
    summary:
      "If the query looks like a normal app query, start with B-tree unless the operator semantics clearly point elsewhere.",
    exampleSql: `SELECT *
FROM invoices
WHERE account_id = $1
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 50;

CREATE INDEX idx_invoices_account_status_created_at
  ON invoices (account_id, status, created_at DESC);`,
    exampleTable: {
      header: ["id", "account_id", "status", "created_at"],
      rows: [
        ["1", "10", "paid", "Apr 05"],
        ["2", "11", "open", "Apr 08"],
        ["3", "10", "open", "Apr 09"],
        ["4", "10", "void", "Apr 10"],
        ["5", "11", "paid", "Apr 11"],
        ["6", "10", "open", "Apr 12"],
        ["7", "10", "paid", "Apr 13"],
      ],
    },
  },
});
