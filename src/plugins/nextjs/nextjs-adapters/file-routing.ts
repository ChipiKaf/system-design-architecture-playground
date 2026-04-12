import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  url: { x: 100, y: 200 },
  appDir: { x: 330, y: 80 },
  folder: { x: 330, y: 330 },
  pageTsx: { x: 580, y: 200 },
  render: { x: 800, y: 200 },
};

export const fileRoutingAdapter: NextjsAdapter = {
  id: "file-routing",

  profile: {
    label: "File-Based Routing",
    description:
      "The filesystem IS the router. Folders = route segments, page.tsx = destination, layout.tsx = shell. No manual route config needed.",
  },

  colors: { fill: "#14532d", stroke: "#4ade80" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.routeResolved = active;
    state.segmentSwapped = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "url",
        to: "app-dir",
        duration: 500,
        color: "#4ade80",
        explain:
          "User visits /blog/hello-world. Next.js looks at the app/ directory to find a matching folder path.",
      },
      {
        from: "app-dir",
        to: "folder",
        duration: 500,
        color: "#60a5fa",
        explain:
          "app/blog/[slug]/ — the [slug] folder is a dynamic segment. It matches any value in that URL position.",
      },
      {
        from: "folder",
        to: "page-tsx",
        duration: 500,
        color: "#fbbf24",
        explain:
          "Inside that folder, page.tsx is the destination component. Think: folder = branch on a road map, page.tsx = the actual screen.",
      },
      {
        from: "app-dir",
        to: "page-tsx",
        duration: 500,
        color: "#a78bfa",
        explain:
          "layout.tsx, loading.tsx, and error.tsx in the same folder provide shell, placeholder, and fallback behavior.",
      },
      {
        from: "page-tsx",
        to: "render",
        duration: 500,
        color: "#22d3ee",
        explain:
          "The matched page component renders. No createBrowserRouter(), no Route components — the filesystem did it all.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Match URL",
      "Walk Folder Tree",
      "Resolve page.tsx",
      "Direct Resolution",
      "Render Page",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("url")
      .at(POS.url.x, POS.url.y)
      .rect(160, 56, 12)
      .fill(hot("url") ? "#4c1d95" : "#0f172a")
      .stroke(hot("url") ? "#a78bfa" : "#334155", 2)
      .label("/blog/hello-world", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    builder
      .node("app-dir")
      .at(POS.appDir.x, POS.appDir.y)
      .rect(180, 56, 12)
      .fill(hot("app-dir") ? "#14532d" : "#0f172a")
      .stroke(hot("app-dir") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("app/ directory");
          l.newline();
          l.color("filesystem = route config", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("folder")
      .at(POS.folder.x, POS.folder.y)
      .rect(180, 56, 12)
      .fill(hot("folder") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("folder") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("blog/[slug]/");
          l.newline();
          l.color("dynamic route segment", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("page-tsx")
      .at(POS.pageTsx.x, POS.pageTsx.y)
      .rect(170, 56, 12)
      .fill(hot("page-tsx") ? "#78350f" : "#0f172a")
      .stroke(hot("page-tsx") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("page.tsx");
          l.newline();
          l.color("destination component", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("render")
      .at(POS.render.x, POS.render.y)
      .rect(140, 56, 12)
      .fill(hot("render") ? "#164e63" : "#0f172a")
      .stroke(hot("render") ? "#22d3ee" : "#334155", 2)
      .label("Rendered Page", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    builder.edge("url", "app-dir", "e-url-app").stroke("#4ade80", 1.4);
    builder.edge("app-dir", "folder", "e-app-folder").stroke("#60a5fa", 1.4);
    builder.edge("folder", "page-tsx", "e-folder-page").stroke("#fbbf24", 1.4);
    builder
      .edge("app-dir", "page-tsx", "e-app-page")
      .stroke("#a78bfa", 1.2)
      .dashed();
    builder.edge("page-tsx", "render", "e-page-render").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Pattern", value: "File-Based", color: "#4ade80" },
      {
        label: "Route",
        value: state.routeResolved ? "Matched" : "—",
        color: "#60a5fa",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.routeResolved = false;
    state.segmentSwapped = false;
  },
};
