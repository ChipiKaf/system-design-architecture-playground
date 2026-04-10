import type { StructuresState } from "../structuresSlice";
import type {
  StructuresAdapter,
  StructureNotes,
  SidebarTable,
  TableRow,
} from "./types";

/* ══════════════════════════════════════════════════════════
   GiST Structure — Evolution Adapter

   Visualises a GiST (Generalized Search Tree) growing
   from empty as rows with spatial/geometric data are
   inserted.  Shows how bounding boxes nest, overlap, and
   drive the tree structure for spatial queries.

   Key insight:  B-tree  = key → sorted position
                 GIN     = value → posting list of rows
                 GiST    = bounding box → subtree of entries
                           that fit inside that box
   ══════════════════════════════════════════════════════════ */

const accent = "#e879f9"; // fuchsia for GiST
const muted = "#475569";
const amber = "#f59e0b";
const teal = "#14b8a6";
const purple = "#a78bfa";

/* ──────────────────────────────────────────────────────── */
/* Drawing helpers                                         */
/* ──────────────────────────────────────────────────────── */

function drawBox(
  builder: any,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  header: string,
  body: string,
  footer: string,
  active: boolean,
  highlight: string,
  opts?: { dimmed?: boolean; highlight?: boolean },
) {
  builder
    .node(id)
    .at(x, y)
    .rect(w, h, 10)
    .fill(
      opts?.dimmed
        ? "rgba(15, 23, 42, 0.45)"
        : opts?.highlight
          ? "rgba(88, 28, 135, 0.35)"
          : "rgba(46, 16, 80, 0.92)",
    )
    .stroke(
      opts?.dimmed ? muted : active ? highlight : muted,
      opts?.dimmed ? 1.5 : 2,
    )
    .richLabel(
      (label: any) => {
        label.color(
          header,
          opts?.dimmed ? "#64748b" : active ? "#f0abfc" : "#94a3b8",
          { fontSize: 8, fontWeight: "bold" },
        );
        label.newline();
        label.color(
          body,
          opts?.dimmed
            ? "#64748b"
            : opts?.highlight
              ? "#fde68a"
              : active
                ? "#f5d0fe"
                : "#94a3b8",
          { fontSize: 10 },
        );
        if (footer) {
          label.newline();
          label.color(
            footer,
            opts?.dimmed ? "#475569" : active ? "#d946ef" : "#475569",
            { fontSize: 7.5 },
          );
        }
      },
      { fill: "#fff", fontSize: 10, dy: footer ? -10 : -4, lineHeight: 1.3 },
    );
}

/* ──────────────────────────────────────────────────────── */
/* Main topology builder                                   */
/* ──────────────────────────────────────────────────────── */

function buildGistTopology(
  builder: any,
  state: StructuresState,
  helpers: any,
) {
  const hot = (z: string) => helpers.hot(z);

  /* ── Step markers ───────────────────────────────── */
  const showEmpty = hot("gist-empty");
  const showFirstRow = hot("gist-first-row");
  const showSecondRow = hot("gist-second-row");
  const showThirdRow = hot("gist-third-row");
  const showManyRows = hot("gist-many-rows");
  const showOverlap = hot("gist-overlap-query");
  const showKnn = hot("gist-knn");
  const showPenalty = hot("gist-penalty-split");
  const showSummary = hot("gist-summary");

  /* ── Canvas constants ───────────────────────────── */
  const CX = 700;

  /* ── Header overlay ─────────────────────────────── */
  builder.overlay((overlay: any) => {
    overlay.add(
      "text",
      {
        x: CX,
        y: 46,
        text: "GiST Evolution: watch a spatial index grow as geometric rows are inserted",
        fill: "#cbd5e1",
        fontSize: 14,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "header-note" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: 70,
        text: "Bounding-box model: each internal entry = MBR covering its children  ·  boxes CAN overlap",
        fill: "#94a3b8",
        fontSize: 10,
        fontWeight: "500",
        textAnchor: "middle",
      },
      { key: "subheader-note" },
    );

    /* ── Info box (bottom) ────────────────────────── */
    const infoText = showSummary
      ? "GiST = bounding box tree → overlap-aware  ·  B-tree = sorted keys  ·  GIN = inverted posting lists"
      : showPenalty
        ? "Penalty function: choose subtree with LEAST bounding-box enlargement  ·  Split when page full"
        : showKnn
          ? "KNN: ORDER BY <-> distance  ·  GiST walks the tree, pruning subtrees whose boxes are too far away"
          : showOverlap
            ? "Overlap query: && finds all boxes intersecting the query window — may descend MULTIPLE subtrees"
            : showManyRows
              ? "10 points across 2D space: the internal bounding boxes nest over clusters of nearby points"
              : showThirdRow
                ? "Point (7,2) is far from the first two — the root's MBR must ENLARGE to cover all three"
                : showSecondRow
                  ? "Two points now: the root entry's MBR is the smallest box covering both (1,5) and (4,3)"
                  : showFirstRow
                    ? "One row = one leaf entry: the point (1,5) is stored directly. The root MBR = the point itself"
                    : "An empty GiST index: no entries, no bounding boxes — waiting for geometric data";

    overlay.add(
      "rect",
      {
        x: CX - 340,
        y: 590,
        w: 680,
        h: 34,
        rx: 12,
        fill: "rgba(15, 23, 42, 0.5)",
        stroke: showOverlap || showKnn ? amber : accent,
        strokeWidth: 1.2,
        strokeDasharray: "6 4",
      },
      { key: "info-box" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: 612,
        text: infoText,
        fill: showOverlap || showKnn ? "#fcd34d" : "#f0abfc",
        fontSize: 10,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "info-text" },
    );
  });

  /* ════════════════════════════════════════════════════
     STEP 1: Empty GiST
     ════════════════════════════════════════════════════ */
  if (showEmpty) {
    drawBox(
      builder,
      "gist-index",
      CX,
      300,
      380,
      60,
      "GiST INDEX  (bounding-box tree)",
      "(empty — no entries, no bounding boxes)",
      "",
      true,
      accent,
    );
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 2: Insert row 1 — point (1,5)
     Single leaf entry, root MBR = the point itself
     ════════════════════════════════════════════════════ */
  if (showFirstRow) {
    drawBox(
      builder,
      "src-row",
      CX,
      130,
      380,
      48,
      "📦 HEAP ROW 1",
      "id=1  name='Park'  location=POINT(1,5)",
      "one point → one GiST leaf entry with key = the point geometry",
      true,
      teal,
    );

    drawBox(
      builder,
      "root",
      CX,
      290,
      380,
      60,
      "🗂️ ROOT PAGE  ·  MBR = BOX((1,5),(1,5))",
      "Leaf entry: POINT(1,5) → TID (100,1)",
      "MBR of a single point = the point itself",
      true,
      accent,
    );

    builder.edge("src-row", "root", "e-src-root").stroke(accent, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 390,
          text: "B-tree stores: key → TID   ·   GiST stores: geometry → TID, root MBR = bounding envelope",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "contrast-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 3: Insert row 2 — point (4,3)
     Root MBR grows to cover both points
     ════════════════════════════════════════════════════ */
  if (showSecondRow) {
    /* Previous row dimmed */
    drawBox(
      builder,
      "src-row1",
      CX - 220,
      100,
      310,
      38,
      "📦 ROW 1",
      "location=POINT(1,5)",
      "",
      false,
      muted,
      { dimmed: true },
    );

    /* New row */
    drawBox(
      builder,
      "src-row2",
      CX + 180,
      100,
      310,
      38,
      "📦 HEAP ROW 2  ★ NEW",
      "id=2  name='Library'  location=POINT(4,3)",
      "",
      true,
      teal,
    );

    drawBox(
      builder,
      "root",
      CX,
      270,
      440,
      70,
      "🗂️ ROOT PAGE  ·  MBR = BOX((1,3),(4,5))  ← ENLARGED",
      "POINT(1,5) → (100,1)    POINT(4,3) → (100,2)",
      "MBR is the smallest rectangle covering BOTH points",
      true,
      accent,
      { highlight: true },
    );

    builder.edge("src-row1", "root", "e-r1-root").stroke(muted, 1.2).dashed();
    builder.edge("src-row2", "root", "e-r2-root").stroke(accent, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 384,
          text: "Each insert may ENLARGE the root's MBR — the bounding box grows to fit all children",
          fill: "#f0abfc",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "mbr-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 4: Insert row 3 — point (7,2)
     MBR enlarges further, shows penalty concept
     ════════════════════════════════════════════════════ */
  if (showThirdRow) {
    /* Previous rows dimmed */
    drawBox(
      builder,
      "src-row1",
      CX - 320,
      100,
      240,
      34,
      "📦 ROW 1",
      "POINT(1,5)",
      "",
      false,
      muted,
      { dimmed: true },
    );
    drawBox(
      builder,
      "src-row2",
      CX,
      100,
      250,
      34,
      "📦 ROW 2",
      "POINT(4,3)",
      "",
      false,
      muted,
      { dimmed: true },
    );

    /* New row */
    drawBox(
      builder,
      "src-row3",
      CX + 320,
      100,
      260,
      34,
      "📦 ROW 3  ★ NEW",
      "POINT(7,2)",
      "",
      true,
      teal,
    );

    drawBox(
      builder,
      "root",
      CX,
      260,
      460,
      74,
      "🗂️ ROOT PAGE  ·  MBR = BOX((1,2),(7,5))  ← ENLARGED AGAIN",
      "POINT(1,5)→(100,1)  POINT(4,3)→(100,2)  POINT(7,2)→(100,3)",
      "MBR expanded from (1,3)–(4,5) to (1,2)–(7,5) to cover the new point",
      true,
      accent,
      { highlight: true },
    );

    builder.edge("src-row1", "root", "e-r1-root").stroke(muted, 1.2).dashed();
    builder.edge("src-row2", "root", "e-r2-root").stroke(muted, 1.2).dashed();
    builder.edge("src-row3", "root", "e-r3-root").stroke(accent, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 378,
          text: "Penalty: how much does the MBR area grow? (1,3)–(4,5) = 6 sq → (1,2)–(7,5) = 18 sq  ·  3× larger",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "penalty-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 5: Many rows — 10 points, tree has split
     into internal + 2–3 leaf pages with MBRs
     ════════════════════════════════════════════════════ */
  if (showManyRows) {
    drawBox(
      builder,
      "heap",
      CX,
      100,
      480,
      44,
      "📦 HEAP TABLE  ·  10 rows with POINT geometry column",
      "Points span (0,0)–(9,9) in 2D space  ·  Two natural clusters",
      "",
      true,
      teal,
    );

    /* Internal root — holds two MBR entries pointing to children */
    drawBox(
      builder,
      "int-root",
      CX,
      210,
      500,
      60,
      "🧭 INTERNAL PAGE  (root)  ·  2 MBR entries → 2 children",
      "MBR-A: BOX((0,3),(4,9)) → Leaf 1   |   MBR-B: BOX((5,0),(9,6)) → Leaf 2",
      "each MBR covers all points in its child leaf — boxes may OVERLAP",
      true,
      accent,
    );

    /* Leaf 1 — left cluster */
    drawBox(
      builder,
      "leaf-1",
      CX - 260,
      370,
      340,
      74,
      "📦 LEAF PAGE 1  ·  5 points in left cluster",
      "(1,5)→(100,1)  (2,8)→(100,4)  (3,4)→(101,1)\n(0,7)→(102,1)  (4,9)→(102,3)",
      "all inside MBR-A: BOX((0,3),(4,9))",
      true,
      accent,
    );

    /* Leaf 2 — right cluster */
    drawBox(
      builder,
      "leaf-2",
      CX + 260,
      370,
      340,
      74,
      "📦 LEAF PAGE 2  ·  5 points in right cluster",
      "(7,2)→(100,3)  (8,5)→(101,2)  (6,1)→(101,3)\n(9,4)→(102,2)  (5,6)→(103,1)",
      "all inside MBR-B: BOX((5,0),(9,6))",
      true,
      purple,
    );

    builder.edge("heap", "int-root", "e-heap-root").stroke(teal, 1.5);
    builder.edge("int-root", "leaf-1", "e-root-l1").stroke(accent, 2);
    builder.edge("int-root", "leaf-2", "e-root-l2").stroke(purple, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 480,
          text: "Unlike B-tree (no overlap), GiST MBRs CAN overlap — a query window may need to check BOTH subtrees",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "overlap-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 6: Overlap query — && (bounding box intersects)
     Show which subtrees must be visited
     ════════════════════════════════════════════════════ */
  if (showOverlap) {
    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 260,
          y: 92,
          w: 520,
          h: 30,
          rx: 10,
          fill: "rgba(120, 53, 15, 0.3)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "query-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 112,
          text: "SELECT * FROM places WHERE location && BOX((3,2),(6,6))",
          fill: "#fde68a",
          fontSize: 11,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "query-text" },
      );
    });

    /* Internal root */
    drawBox(
      builder,
      "int-root",
      CX,
      200,
      500,
      56,
      "🧭 ROOT  ·  MBR-A: (0,3)–(4,9)  |  MBR-B: (5,0)–(9,6)",
      "Query BOX((3,2),(6,6)) overlaps BOTH MBRs → must check BOTH subtrees",
      "B-tree follows ONE path — GiST may follow MULTIPLE",
      true,
      amber,
      { highlight: true },
    );

    /* Leaf 1 — overlap check */
    drawBox(
      builder,
      "leaf-1",
      CX - 240,
      340,
      310,
      60,
      "📦 LEAF 1  ·  MBR-A overlaps query",
      "(3,4) ✓  (4,9) ✗  (1,5) ✗  (2,8) ✗  (0,7) ✗",
      "only (3,4) is inside query box → 1 match",
      true,
      accent,
    );

    /* Leaf 2 — overlap check */
    drawBox(
      builder,
      "leaf-2",
      CX + 240,
      340,
      310,
      60,
      "📦 LEAF 2  ·  MBR-B overlaps query",
      "(5,6) ✓  (6,1) ✗  (7,2) ✗  (8,5) ✗  (9,4) ✗",
      "only (5,6) is inside query box → 1 match",
      true,
      purple,
    );

    /* Result */
    drawBox(
      builder,
      "result",
      CX,
      470,
      340,
      44,
      "✅ RESULT: 2 rows matched",
      "(3,4) → Row 6  ·  (5,6) → Row 10",
      "",
      true,
      amber,
      { highlight: true },
    );

    builder.edge("int-root", "leaf-1", "e-rt-l1").stroke(accent, 2);
    builder.edge("int-root", "leaf-2", "e-rt-l2").stroke(purple, 2);
    builder.edge("leaf-1", "result", "e-l1-res").stroke(amber, 1.5);
    builder.edge("leaf-2", "result", "e-l2-res").stroke(amber, 1.5);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 546,
          text: "🔍 1. Check root MBRs against query  →  2. Descend overlapping children  →  3. Filter leaf entries",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "lookup-path" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 7: KNN — ORDER BY <-> distance
     GiST finds nearest neighbour by pruning
     ════════════════════════════════════════════════════ */
  if (showKnn) {
    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 260,
          y: 92,
          w: 520,
          h: 30,
          rx: 10,
          fill: "rgba(120, 53, 15, 0.3)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "query-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 112,
          text: "SELECT * FROM places ORDER BY location <-> POINT(5,5) LIMIT 3",
          fill: "#fde68a",
          fontSize: 11,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "query-text" },
      );
    });

    /* Root with distance annotations for each MBR */
    drawBox(
      builder,
      "int-root",
      CX,
      200,
      540,
      56,
      "🧭 ROOT  ·  query point = (5,5)",
      "dist(MBR-A, (5,5)) = 1.0  ·  dist(MBR-B, (5,5)) = 0.0  ← closer, visit FIRST",
      "GiST checks nearest MBR first — prunes subtrees that can't beat current best",
      true,
      amber,
      { highlight: true },
    );

    /* Leaf 2 visited first (closer) */
    drawBox(
      builder,
      "leaf-2",
      CX + 200,
      330,
      310,
      66,
      "📦 LEAF 2  (visited FIRST — MBR-B is closer)",
      "(5,6) d=1.0 ★  (8,5) d=3.0  (9,4) d=4.1\n(7,2) d=3.6  (6,1) d=4.1",
      "best so far: (5,6) d=1.0",
      true,
      purple,
      { highlight: true },
    );

    /* Leaf 1 visited second (prune?) */
    drawBox(
      builder,
      "leaf-1",
      CX - 200,
      330,
      310,
      66,
      "📦 LEAF 1  (MBR-A dist=1.0 — can't prune, may have closer)",
      "(4,9) d=4.1  (3,4) d=2.2  (1,5) d=4.0\n(2,8) d=4.2  (0,7) d=5.4",
      "no points closer than (5,6) d=1.0",
      true,
      accent,
    );

    /* Result */
    drawBox(
      builder,
      "result",
      CX,
      470,
      400,
      44,
      "✅ 3-NN RESULT  (ORDER BY <-> LIMIT 3)",
      "(5,6) d=1.0  ·  (3,4) d=2.2  ·  (8,5) d=3.0",
      "",
      true,
      amber,
      { highlight: true },
    );

    builder.edge("int-root", "leaf-2", "e-rt-l2").stroke(amber, 2);
    builder.edge("int-root", "leaf-1", "e-rt-l1").stroke(accent, 1.5).dashed();
    builder.edge("leaf-2", "result", "e-l2-res").stroke(amber, 1.5);
    builder.edge("leaf-1", "result", "e-l1-res").stroke(accent, 1.2).dashed();

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 546,
          text: "🔍 KNN: visit closest MBR first → update best distance → prune far MBRs  ·  B-tree can't do this",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "knn-path" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 8: Penalty & Split — how GiST decides
     where to insert and when to split
     ════════════════════════════════════════════════════ */
  if (showPenalty) {
    /* Show a new point arriving and penalty calculation */
    drawBox(
      builder,
      "new-point",
      CX,
      100,
      300,
      38,
      "📦 NEW ROW  ★  POINT(4,6)",
      "Where does it go? Penalty = MBR area increase",
      "",
      true,
      teal,
    );

    /* Option A: Leaf 1 */
    drawBox(
      builder,
      "leaf-1",
      CX - 240,
      230,
      330,
      64,
      "📦 LEAF 1  ·  MBR-A: (0,3)–(4,9)",
      "penalty((4,6)) = 0  ← point already inside MBR!",
      "no enlargement needed — this subtree is the best fit",
      true,
      accent,
      { highlight: true },
    );

    /* Option B: Leaf 2 */
    drawBox(
      builder,
      "leaf-2",
      CX + 240,
      230,
      330,
      64,
      "📦 LEAF 2  ·  MBR-B: (5,0)–(9,6)",
      "penalty((4,6)) = 6  ← must enlarge MBR to (4,0)–(9,6)",
      "adds 6 sq units of dead space — worse fit",
      true,
      muted,
      { dimmed: true },
    );

    builder.edge("new-point", "leaf-1", "e-new-l1").stroke(accent, 2);
    builder.edge("new-point", "leaf-2", "e-new-l2").stroke(muted, 1.2).dashed();

    /* Split scenario */
    drawBox(
      builder,
      "split-before",
      CX - 200,
      400,
      280,
      56,
      "BEFORE SPLIT: Leaf 1 full (6/6 entries)",
      "Adding POINT(4,6) would overflow the page",
      "must split the page into two new leaves",
      true,
      amber,
    );

    drawBox(
      builder,
      "split-a",
      CX + 100,
      380,
      220,
      40,
      "📦 LEAF 1a  ·  3 entries",
      "left-cluster points: (0,7) (1,5) (2,8)",
      "",
      true,
      accent,
    );

    drawBox(
      builder,
      "split-b",
      CX + 100,
      440,
      220,
      40,
      "📦 LEAF 1b  ·  4 entries",
      "right-cluster: (3,4) (4,6) (4,9) ★ new",
      "",
      true,
      purple,
    );

    builder.edge("split-before", "split-a", "e-sp-a").stroke(accent, 1.5);
    builder.edge("split-before", "split-b", "e-sp-b").stroke(purple, 1.5);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 516,
          text: "Penalty picks the subtree  ·  Picksplit divides entries to minimise total MBR area of the two new pages",
          fill: "#f0abfc",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "penalty-split-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 9: Summary — B-tree vs GIN vs GiST
     ════════════════════════════════════════════════════ */
  if (showSummary) {
    drawBox(
      builder,
      "btree-model",
      CX - 360,
      170,
      280,
      74,
      "B-tree  ·  sorted keys",
      "key → TID\nrange: follow sorted leaf chain\nno overlap, one path",
      "=, <, >, BETWEEN, ORDER BY",
      true,
      "#3b82f6",
    );

    drawBox(
      builder,
      "gin-model",
      CX,
      170,
      280,
      74,
      "GIN  ·  inverted index",
      "value → posting list [TIDs]\nlookup: find entry → read list\nAND = intersect lists",
      "@>, ?, @@, array contains",
      true,
      "#22c55e",
    );

    drawBox(
      builder,
      "gist-model",
      CX + 360,
      170,
      280,
      74,
      "GiST  ·  bounding-box tree",
      "MBR → subtree of geometries\noverlap: may descend multiple\nKNN: prune by distance",
      "&&, <->, @>, range overlap",
      true,
      accent,
      { highlight: true },
    );

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 130,
          text: "Three fundamentally different indexing models:",
          fill: "#cbd5e1",
          fontSize: 12,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "title" },
      );

      const tableY = 300;
      const rows = [
        ["", "B-tree", "GIN", "GiST"],
        ["Model", "sorted keys", "inverted lists", "bounding boxes"],
        ["Entry", "key + TID", "value + posting list", "MBR + child ptr"],
        ["Overlap?", "never", "N/A (flat lists)", "yes — boxes can overlap"],
        ["Query path", "always 1 path", "1 entry → list scan", "may scan MULTIPLE subtrees"],
        ["KNN?", "no native support", "no native support", "yes — ORDER BY <->"],
        ["Best for", "scalar =, <, >, range", "multi-value contains", "spatial, range, FTS"],
      ];

      rows.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          overlay.add(
            "text",
            {
              x: CX - 360 + ci * 240,
              y: tableY + ri * 22,
              text: cell,
              fill:
                ri === 0
                  ? "#f0abfc"
                  : ci === 0
                    ? "#94a3b8"
                    : "#e2e8f0",
              fontSize: ri === 0 ? 10 : 9,
              fontWeight: ri === 0 || ci === 0 ? "700" : "500",
              textAnchor: ci === 0 ? "end" : "middle",
            },
            { key: `table-${ri}-${ci}` },
          );
        });
      });
    });
    return;
  }
}

/* ──────────────────────────────────────────────────────── */
/* Notes                                                   */
/* ──────────────────────────────────────────────────────── */

const notes: StructureNotes = {
  summary:
    "GiST organises data by nesting bounding boxes. Internal entries hold an MBR covering all children. Unlike B-tree (no overlap, single path), GiST boxes CAN overlap, so queries may descend multiple subtrees. Penalty and picksplit functions control where inserts land and how pages split.",
  keyRule:
    "MBR → subtree. Internal entries: bounding box + child page pointer. Leaf entries: geometry + TID. Penalty = how much the box must enlarge to fit the new entry.",
};

/* ── Sidebar table data ──────────────────────────────── */

const GIST_COLUMNS = ["id", "name", "location"];

interface GistRow extends TableRow {
  gistStep: number;
}

const ALL_GIST_ROWS: GistRow[] = [
  { gistStep: 1, cells: ["1", "Park", "POINT(1,5)"] },
  { gistStep: 2, cells: ["2", "Library", "POINT(4,3)"] },
  { gistStep: 3, cells: ["3", "School", "POINT(7,2)"] },
  { gistStep: 4, cells: ["4", "Café", "POINT(2,8)"] },
  { gistStep: 4, cells: ["5", "Museum", "POINT(8,5)"] },
  { gistStep: 4, cells: ["6", "Mall", "POINT(3,4)"] },
  { gistStep: 4, cells: ["7", "Station", "POINT(6,1)"] },
  { gistStep: 4, cells: ["8", "Gym", "POINT(0,7)"] },
  { gistStep: 4, cells: ["9", "Pool", "POINT(9,4)"] },
  { gistStep: 4, cells: ["10", "Plaza", "POINT(5,6)"] },
];

/* rows that appear in overlap query result */
const OVERLAP_IDS = new Set(["6", "10"]); // (3,4) and (5,6) inside BOX((3,2),(6,6))
/* rows that appear in KNN top-3 */
const KNN_IDS = new Set(["10", "6", "5"]); // (5,6) d=1, (3,4) d=2.2, (8,5) d=3

function gistStepNum(state: StructuresState): number {
  const hz = state.hotZones;
  if (hz.includes("gist-summary")) return 99;
  if (hz.includes("gist-penalty-split")) return 8;
  if (hz.includes("gist-knn")) return 7;
  if (hz.includes("gist-overlap-query")) return 6;
  if (hz.includes("gist-many-rows")) return 4;
  if (hz.includes("gist-third-row")) return 3;
  if (hz.includes("gist-second-row")) return 2;
  if (hz.includes("gist-first-row")) return 1;
  return -1;
}

function getGistTableData(state: StructuresState): SidebarTable | null {
  const step = gistStepNum(state);
  if (step < 0) return null;

  let highlightSet: Set<string> | null = null;
  if (step === 6) highlightSet = OVERLAP_IDS;
  if (step === 7) highlightSet = KNN_IDS;

  const maxStep = step >= 99 ? 8 : step;
  const visible = ALL_GIST_ROWS.filter((r) => r.gistStep <= maxStep);
  const rows: TableRow[] = visible.map((r) => ({
    cells: r.cells,
    isNew: r.gistStep === step,
    isHighlight: highlightSet ? highlightSet.has(r.cells[0]) : false,
  }));
  return { columns: GIST_COLUMNS, rows };
}

/* ──────────────────────────────────────────────────────── */
/* Adapter export                                          */
/* ──────────────────────────────────────────────────────── */

export const gistStructAdapter: StructuresAdapter = {
  id: "gist-struct",

  profile: {
    label: "GiST (Spatial)",
    description:
      "Watch a GiST index grow as spatial points are inserted. Bounding boxes nest, overlap, and split — powering overlap queries and nearest-neighbour search.",
  },

  colors: { fill: "#2e1050", stroke: "#e879f9" },

  notes,

  computeMetrics(state: StructuresState) {
    const step = state.hotZones;
    if (step.includes("gist-summary")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "2";
      state.rowCount = "10+";
    } else if (step.includes("gist-penalty-split")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "2";
      state.rowCount = "11";
    } else if (
      step.includes("gist-knn") ||
      step.includes("gist-overlap-query")
    ) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "2";
      state.rowCount = "10";
    } else if (step.includes("gist-many-rows")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "2";
      state.rowCount = "10";
    } else if (step.includes("gist-third-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "1";
      state.rowCount = "3";
    } else if (step.includes("gist-second-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "1";
      state.rowCount = "2";
    } else if (step.includes("gist-first-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "1";
      state.rowCount = "1";
    } else {
      state.pageSize = "8 kB";
      state.entrySize = "~28 B";
      state.treeDepth = "1";
      state.rowCount = "0";
    }
  },

  expandToken() {
    return null;
  },

  getFlowBeats() {
    return [];
  },

  buildTopology: buildGistTopology,

  getStatBadges(state: StructuresState) {
    return [
      { label: "Page Size", value: state.pageSize, color: accent },
      { label: "Entry Size", value: state.entrySize, color: accent },
      { label: "Depth", value: state.treeDepth, color: accent },
      { label: "Row Count", value: state.rowCount, color: accent },
    ];
  },

  getTableData: getGistTableData,

  softReset(state: StructuresState) {
    state.pageSize = "8 kB";
    state.entrySize = "~28 B";
    state.treeDepth = "1";
    state.rowCount = "0";
  },
};
