import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "state-graph"
  | "nodes"
  | "edges"
  | "state-annotation"
  | "channels"
  | "send"
  | "interrupt";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "state-graph": {
    title: "StateGraph",
    subtitle: "The orchestration backbone of LangGraph",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What is a StateGraph?",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              A <strong>StateGraph</strong> is a directed graph where each node
              is a <strong>function</strong> and the edges define the execution
              order. A single <strong>state object</strong> is passed through
              every node — each node reads from the state, does work (often an
              LLM call), and returns updates that get merged back.
            </p>
            <p>
              Think of it as a pipeline where the data is always in one place —
              the state — and each node transforms a piece of it.
            </p>
          </>
        ),
      },
      {
        title: "Why a Graph?",
        accent: "#7c3aed",
        content: (
          <ul>
            <li>
              <strong>Conditional branching</strong> — a router node can inspect
              the state and decide which node to run next (unlike a linear
              chain).
            </li>
            <li>
              <strong>Parallel fan-out</strong> — one node can spawn multiple
              concurrent branches that merge back.
            </li>
            <li>
              <strong>Loops</strong> — edges can point backward, enabling retry
              / self-correction patterns.
            </li>
            <li>
              <strong>Human-in-the-loop</strong> — the graph can pause
              (interrupt) and wait for human approval before continuing.
            </li>
          </ul>
        ),
      },
      {
        title: "Graph Lifecycle",
        accent: "#6d28d9",
        content: (
          <>
            <p>
              <strong>1. Define</strong> — create nodes (functions) and wire
              edges. <br />
              <strong>2. Compile</strong> — call <code>graph.compile()</code> to
              validate and freeze the topology. <br />
              <strong>3. Invoke / Stream</strong> — pass an initial state and
              run. Updates stream back as each node completes.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Quick Ref</h4>
        <p>
          <strong>Library:</strong> <code>@langchain/langgraph</code>
        </p>
        <p>
          <strong>Entry:</strong> <code>new StateGraph(annotation)</code>
        </p>
        <p>
          <strong>Compile:</strong>{" "}
          <code>
            .compile({"{"} checkpointer {"}"})
          </code>
        </p>
      </>
    ),
  },

  nodes: {
    title: "Nodes",
    subtitle: "The processing units — functions that transform state",
    accentColor: "#6366f1",
    sections: [
      {
        title: "What is a Node?",
        accent: "#6366f1",
        content: (
          <>
            <p>
              A <strong>node</strong> is just a function:{" "}
              <code>(state) =&gt; Partial&lt;State&gt;</code>. It receives the
              current graph state, does some work, and returns the fields it
              wants to update.
            </p>
            <p>
              Most nodes call an <strong>LLM</strong> — they assemble a prompt
              from the state, call the model, and write the response back. But a
              node can do <em>anything</em>: call an API, run a tool, query a
              database, or just apply a simple transformation.
            </p>
          </>
        ),
      },
      {
        title: "Nodes + LLMs",
        accent: "#818cf8",
        content: (
          <>
            <p>A typical LLM node follows this pattern:</p>
            <ol>
              <li>
                <strong>Read context</strong> from <code>state</code> — e.g. the
                user input, previous results, file contents.
              </li>
              <li>
                <strong>Build a prompt</strong> — assemble a{" "}
                <code>ChatPromptTemplate</code> with system instructions and the
                context.
              </li>
              <li>
                <strong>Call the model</strong> —{" "}
                <code>model.invoke(prompt)</code>.
              </li>
              <li>
                <strong>Return state updates</strong> — e.g.{" "}
                <code>
                  {"{"} classification: response.content {"}"}
                </code>
                .
              </li>
            </ol>
          </>
        ),
      },
      {
        title: "Node Types in Practice",
        accent: "#4f46e5",
        content: (
          <ul>
            <li>
              <strong>LLM Node</strong> — calls a language model (most common).
            </li>
            <li>
              <strong>Tool Node</strong> — executes tools the LLM requested
              (function calling / tool use).
            </li>
            <li>
              <strong>Router Node</strong> — reads state and returns the name of
              the next node (conditional edge).
            </li>
            <li>
              <strong>Delegator Node</strong> — examines state, decides which
              items are ready, and issues <code>Send()</code> for parallel
              processing.
            </li>
          </ul>
        ),
      },
    ],
    aside: (
      <>
        <h4>Key Point</h4>
        <p>
          A node doesn't <em>have to</em> call an LLM. It's just a function. The
          graph doesn't care what happens inside — only what state updates come
          out.
        </p>
      </>
    ),
  },

  edges: {
    title: "Edges & Routing",
    subtitle: "How nodes connect — direct, conditional, and dynamic",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Direct Edges",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              A <strong>direct edge</strong> unconditionally connects node A to
              node B. After A finishes, B always runs next.
            </p>
            <p>
              <code>graph.addEdge("analyze", "planner")</code>
            </p>
          </>
        ),
      },
      {
        title: "Conditional Edges",
        accent: "#d97706",
        content: (
          <>
            <p>
              A <strong>conditional edge</strong> uses a function to decide the
              next node at runtime based on the current state:
            </p>
            <p>
              <code>
                graph.addConditionalEdges("router", routingFn, {"{"} simple:
                "quick_reply", complex: "deep_analysis" {"}"})
              </code>
            </p>
            <p>
              The <code>routingFn</code> receives the state and returns a key
              (e.g. <code>"complex"</code>). The graph looks up that key in the
              map and routes there.
            </p>
          </>
        ),
      },
      {
        title: "Dynamic Edges with Send()",
        accent: "#b45309",
        content: (
          <>
            <p>
              <code>Send()</code> lets a conditional edge create{" "}
              <strong>multiple parallel branches</strong> at runtime. Instead of
              returning a single node name, the routing function returns an
              array of <code>Send</code> objects — each one spawns an
              independent execution of the target node with its own state slice.
            </p>
            <p>
              This is how LangGraph handles fan-out: e.g. "generate specs for
              all 5 tasks simultaneously."
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Rule of Thumb</h4>
        <p>
          Use <strong>direct edges</strong> for fixed sequences. Use{" "}
          <strong>conditional edges</strong> for decisions. Use{" "}
          <strong>Send()</strong> for parallel processing of a dynamic list.
        </p>
      </>
    ),
  },

  "state-annotation": {
    title: "State & Annotations",
    subtitle: "How data is carried, updated, and merged across nodes",
    accentColor: "#10b981",
    sections: [
      {
        title: "The State Object",
        accent: "#10b981",
        content: (
          <>
            <p>
              The state is a <strong>typed object</strong> defined via{" "}
              <code>Annotation.Root()</code>. Every field has a name, type, and
              a <strong>reducer</strong> that determines how updates from nodes
              are merged into the existing state.
            </p>
            <p>
              This is the single source of truth throughout the entire graph
              execution. Every node reads from it and writes back to it.
            </p>
          </>
        ),
      },
      {
        title: "Reducers — Replace vs Merge",
        accent: "#059669",
        content: (
          <>
            <p>
              Each field in the state annotation has a <strong>reducer</strong>:
            </p>
            <ul>
              <li>
                <strong>Replace (default)</strong> — last-write-wins. If a node
                returns{" "}
                <code>
                  {"{"} classification: "complex" {"}"}
                </code>
                , it overwrites the previous value.
              </li>
              <li>
                <strong>Merge</strong> — shallow-merge for objects. If node A
                writes{" "}
                <code>
                  {"{"} results: {"{"} schema: "..." {"}"} {"}"}
                </code>{" "}
                and node B writes{" "}
                <code>
                  {"{"} results: {"{"} api: "..." {"}"} {"}"}
                </code>
                , the final state has both. This is how parallel results combine
                cleanly.
              </li>
              <li>
                <strong>Append</strong> — for arrays like message histories.
                Each node's return is appended to the existing array.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Why This Matters",
        accent: "#047857",
        content: (
          <>
            <p>
              Merge reducers are what make <strong>parallel fan-out</strong>{" "}
              work. Without them, parallel nodes would overwrite each other's
              results. With merge reducers, each parallel branch only writes its
              own slice and they all combine non-destructively.
            </p>
            <p>
              In this demo, the <code>results</code> field uses a merge reducer
              — watch how each parallel task's result appears independently in
              the state panel.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Annotation Example</h4>
        <p>
          <code>classification: Annotation&lt;string&gt;</code> — replace
          reducer
        </p>
        <p>
          <code>results: Annotation&lt;Record&gt;</code> — merge reducer
        </p>
        <p>
          <code>messages: Annotation&lt;Message[]&gt;</code> — append reducer
        </p>
      </>
    ),
  },

  channels: {
    title: "Channels & Reducers",
    subtitle:
      "How state fields merge updates from nodes — the rules that make parallelism safe",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "The Problem Channels Solve",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Every node returns a <strong>partial update</strong> (a patch).
              But when a node returns{" "}
              <code>
                {"{"} results: {"{"} "api": "..." {"}"} {"}"}
              </code>
              , should it <strong>replace</strong> the entire{" "}
              <code>results</code> object, or <strong>merge</strong> into it?
            </p>
            <p>
              Without a clear strategy, parallel nodes would{" "}
              <strong>overwrite each other's data</strong>. Channels define the
              merge strategy for each field.
            </p>
          </>
        ),
      },
      {
        title: "Replace Channel — Last Write Wins",
        accent: "#0d9488",
        content: (
          <>
            <p>
              <code>replaceChannel(defaultValue)</code> — the new value
              overwrites the old. If the new value is <code>undefined</code>,
              the old value is kept (safety net).
            </p>
            <p>
              Used for <strong>identity fields</strong> like{" "}
              <code>classification</code>, <code>route</code>,{" "}
              <code>input</code> — fields where only one node writes the
              definitive value.
            </p>
            <pre
              style={{
                background: "#0f172a",
                padding: "0.5rem",
                borderRadius: 6,
                fontSize: "0.72rem",
                color: "#94a3b8",
                margin: "0.5rem 0",
                overflow: "auto",
              }}
            >
              {`value: (prev, next) =>
  next === undefined ? prev : next`}
            </pre>
          </>
        ),
      },
      {
        title: "Merge Channel — Shallow Merge Objects",
        accent: "#0f766e",
        content: (
          <>
            <p>
              <code>mergeRecordChannel()</code> — uses{" "}
              <code>{"{ ...prev, ...next }"}</code> to combine objects. Each
              node only writes its own keys; existing keys are preserved.
            </p>
            <p>
              This is<strong> critical for parallel fan-out</strong>. Three task
              nodes each return{" "}
              <code>
                {"{"} results: {"{"} [myKey]: "..." {"}"} {"}"}
              </code>{" "}
              — the merge reducer combines all three non-destructively.
            </p>
            <pre
              style={{
                background: "#0f172a",
                padding: "0.5rem",
                borderRadius: 6,
                fontSize: "0.72rem",
                color: "#94a3b8",
                margin: "0.5rem 0",
                overflow: "auto",
              }}
            >
              {`value: (prev, next) =>
  next ? { ...prev, ...next } : prev`}
            </pre>
            <p
              style={{ color: "#f97316", fontWeight: 600, fontSize: "0.82rem" }}
            >
              ⚠ Try the toggle in the Channel Inspector — switch to "replace"
              and see what happens when parallel results collide!
            </p>
          </>
        ),
      },
      {
        title: "Optional Replace — Starts as undefined",
        accent: "#115e59",
        content: (
          <>
            <p>
              Same as replace, but the default value is <code>undefined</code>{" "}
              instead of an empty string. Used for fields that don't exist at
              startup — like <code>phase</code>, <code>title</code>, or{" "}
              <code>error</code>.
            </p>
            <p>
              This is a semantic distinction: "not set yet" (
              <code>undefined</code>) vs "set to empty" (<code>""</code>).
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Why Not Just Replace?</h4>
        <p>
          If <code>results</code> used a replace reducer, three parallel nodes
          running simultaneously would each overwrite the previous result —{" "}
          <strong>only the last one to finish would survive</strong>. That's
          silent data loss.
        </p>
        <p>
          Merge reducers are the mechanism that makes <code>Send()</code>{" "}
          fan-out safe.
        </p>
      </>
    ),
  },

  send: {
    title: "Parallel Fan-Out with Send()",
    subtitle: "Run multiple nodes concurrently from a single decision point",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The Problem",
        accent: "#06b6d4",
        content: (
          <>
            <p>
              You have a task list with N items, and each item needs its own LLM
              call. Running them sequentially is slow. You want{" "}
              <strong>concurrent execution</strong>.
            </p>
          </>
        ),
      },
      {
        title: "How Send() Works",
        accent: "#0891b2",
        content: (
          <>
            <p>
              A conditional edge's routing function can return an array of{" "}
              <code>Send(nodeName, stateSlice)</code> objects. Each{" "}
              <code>Send</code> creates an independent branch:
            </p>
            <ol>
              <li>
                The branch gets its own copy of the state (with any overrides
                from the <code>Send</code>).
              </li>
              <li>The target node runs in that branch.</li>
              <li>
                When it returns, its state updates are <strong>merged</strong>{" "}
                back into the main state via the reducers.
              </li>
            </ol>
            <p>
              All branches run <strong>concurrently</strong>. The graph waits
              for all to finish before moving to the next edge.
            </p>
          </>
        ),
      },
      {
        title: "The Delegator Pattern",
        accent: "#0e7490",
        content: (
          <>
            <p>
              A common pattern: a <strong>delegator node</strong> examines the
              task list, finds items whose dependencies are met, and creates a{" "}
              <code>Send()</code> for each. After all branches complete, the
              delegator runs again to check for newly-unblocked items. This loop
              continues until all items are processed.
            </p>
            <p>
              In this demo, the planner creates 3 tasks, and the fan-out step
              sends all 3 to parallel nodes simultaneously.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Key Insight</h4>
        <p>
          <strong>Send()</strong> + <strong>merge reducers</strong> = safe
          parallelism. Each branch writes its own result; the merge reducer
          combines them without conflicts.
        </p>
      </>
    ),
  },

  interrupt: {
    title: "Interrupts — Human-in-the-Loop",
    subtitle: "Pausing the graph for human review or approval",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What is an Interrupt?",
        accent: "#ef4444",
        content: (
          <>
            <p>
              An <strong>interrupt</strong> pauses graph execution at a specific
              point. The current state is saved to a{" "}
              <strong>checkpointer</strong> (like a database), and execution
              stops. A human (or external system) can review the state, make
              edits, and then <strong>resume</strong> the graph.
            </p>
          </>
        ),
      },
      {
        title: "How It Works",
        accent: "#dc2626",
        content: (
          <>
            <p>Inside a node, you call:</p>
            <p>
              <code>
                interrupt({"{"} instruction: "Please review", state {"}"})
              </code>
            </p>
            <p>
              This yields a special <code>__interrupt__</code> event to the
              stream consumer. The graph freezes. To continue:
            </p>
            <p>
              <code>
                graph.invoke(new Command({"{"} resume: true {"}"}), config)
              </code>
            </p>
          </>
        ),
      },
      {
        title: "Use Cases",
        accent: "#b91c1c",
        content: (
          <ul>
            <li>
              <strong>Review & approve</strong> — human checks LLM output before
              proceeding.
            </li>
            <li>
              <strong>Edit state</strong> — human modifies the state (e.g. fixes
              a task list) and resumes with corrections.
            </li>
            <li>
              <strong>Confirmation gates</strong> — critical operations (like
              deploying code) require explicit approval.
            </li>
            <li>
              <strong>Multi-turn collaboration</strong> — the graph pauses after
              each AI response to wait for the next human message.
            </li>
          </ul>
        ),
      },
    ],
    aside: (
      <>
        <h4>Requires</h4>
        <p>
          A <strong>checkpointer</strong> (e.g. <code>MemorySaver</code> or a
          database-backed saver) to persist the frozen state across the
          pause/resume boundary.
        </p>
      </>
    ),
  },
};
