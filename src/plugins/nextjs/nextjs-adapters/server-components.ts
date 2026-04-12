import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  request: { x: 100, y: 200 },
  server: { x: 340, y: 80 },
  db: { x: 340, y: 330 },
  rscPayload: { x: 580, y: 80 },
  browser: { x: 580, y: 330 },
  user: { x: 780, y: 200 },
};

export const serverComponentsAdapter: NextjsAdapter = {
  id: "server-components",

  profile: {
    label: "Server Components",
    description:
      "React components that run on the server — they can talk to databases, use secrets, and never ship their code to the browser.",
  },

  colors: { fill: "#1e3a5f", stroke: "#60a5fa" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.componentType = active ? "server" : "none";
    state.bundleSplit = active;
    state.hydrated = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "request",
        to: "server",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Request hits the server. Server Components are the default in App Router — no 'use client' needed.",
      },
      {
        from: "server",
        to: "db",
        duration: 600,
        color: "#f59e0b",
        explain:
          "The component directly calls the database. `const posts = await db.post.findMany()` — this runs on the server only.",
      },
      {
        from: "db",
        to: "server",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Data returns. The component's database logic is never bundled for the browser. Secrets stay safe.",
      },
      {
        from: "server",
        to: "rsc-payload",
        duration: 600,
        color: "#60a5fa",
        explain:
          "The server renders the component tree into an RSC payload — a special format describing the UI structure.",
      },
      {
        from: "rsc-payload",
        to: "browser",
        duration: 500,
        color: "#22d3ee",
        explain:
          "The RSC payload + minimal HTML is sent. Zero JavaScript for server-only components reaches the browser.",
      },
      {
        from: "browser",
        to: "user",
        duration: 400,
        color: "#a78bfa",
        explain:
          "The browser reconstructs the tree. Less JS = faster load. Think: rehearsed backstage, shown to audience.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Incoming Request",
      "Query Database",
      "Return Data",
      "Build RSC Payload",
      "Send to Browser",
      "Page Interactive",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("request")
      .at(POS.request.x, POS.request.y)
      .rect(150, 56, 12)
      .fill(hot("request") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("request") ? "#60a5fa" : "#334155", 2)
      .label("Request", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("server")
      .at(POS.server.x, POS.server.y)
      .rect(180, 56, 12)
      .fill(hot("server") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("server") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Server Component");
          l.newline();
          l.color("async function Page()", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("db")
      .at(POS.db.x, POS.db.y)
      .rect(180, 56, 12)
      .fill(hot("db") ? "#78350f" : "#0f172a")
      .stroke(hot("db") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Database / API");
          l.newline();
          l.color("db.post.findMany()", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("rsc-payload")
      .at(POS.rscPayload.x, POS.rscPayload.y)
      .rect(170, 56, 12)
      .fill(hot("rsc-payload") ? "#14532d" : "#0f172a")
      .stroke(hot("rsc-payload") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("RSC Payload");
          l.newline();
          l.color("serialised component tree", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(170, 56, 12)
      .fill(hot("browser") ? "#164e63" : "#0f172a")
      .stroke(hot("browser") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Browser");
          l.newline();
          l.color("0 KB server component JS", "#67e8f9", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("user")
      .at(POS.user.x, POS.user.y)
      .rect(140, 56, 12)
      .fill(hot("user") ? "#4c1d95" : "#0f172a")
      .stroke(hot("user") ? "#a78bfa" : "#334155", 2)
      .label("User", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder.edge("request", "server", "e-req-srv").stroke("#60a5fa", 1.4);
    builder.edge("server", "db", "e-srv-db").stroke("#f59e0b", 1.4);
    builder.edge("db", "server", "e-db-srv").stroke("#f59e0b", 1.2).dashed();
    builder.edge("server", "rsc-payload", "e-srv-rsc").stroke("#60a5fa", 1.4);
    builder
      .edge("rsc-payload", "browser", "e-rsc-browser")
      .stroke("#22d3ee", 1.4);
    builder.edge("browser", "user", "e-browser-user").stroke("#a78bfa", 1.2);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Type", value: "Server", color: "#60a5fa" },
      {
        label: "Bundle",
        value: state.bundleSplit ? "0 KB" : "—",
        color: "#4ade80",
      },
      {
        label: "Hydrated",
        value: state.hydrated ? "N/A" : "—",
        color: "#94a3b8",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.componentType = "none";
    state.bundleSplit = false;
    state.hydrated = false;
  },
};
