import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "event-loop"
  | "call-stack"
  | "web-apis"
  | "microtasks"
  | "tasks"
  | "render";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "event-loop": {
    title: "JavaScript Event Loop",
    subtitle: "How JavaScript decides what runs next",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Kid Version",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Imagine JavaScript has <strong>one worker</strong> and one desk.
              That desk is the call stack. The worker can only do one thing at a
              time.
            </p>
            <p>
              If extra jobs arrive while the desk is busy, they wait in line
              until the event loop brings them back.
            </p>
          </>
        ),
      },
      {
        title: "The Order Rule",
        accent: "#d97706",
        content: (
          <ol>
            <li>Finish the current call stack.</li>
            <li>Drain every microtask.</li>
            <li>The browser may render.</li>
            <li>Run one task from the task queue.</li>
          </ol>
        ),
      },
      {
        title: "Why People Get Confused",
        accent: "#b45309",
        content: (
          <>
            <p>
              A timer with <code>0</code> milliseconds does not mean "run now".
              It means "be ready as soon as possible and wait in the task
              queue."
            </p>
            <p>
              Promise callbacks and <code>queueMicrotask()</code> still get to
              run first.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Demo Output</h4>
        <p>A, B, promise, microtask, timeout</p>
      </>
    ),
  },
  "call-stack": {
    title: "Call Stack",
    subtitle: "The one place JavaScript is actively executing right now",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What It Is",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              The call stack holds the function or script that is running right
              now. New calls get pushed on top. When they finish, they pop off.
            </p>
          </>
        ),
      },
      {
        title: "Important Detail",
        accent: "#0ea5e9",
        content: (
          <p>
            Nothing from the queues can run until the stack is empty. That is
            why synchronous code like <code>console.log("B")</code> runs before
            queued callbacks.
          </p>
        ),
      },
    ],
    aside: (
      <>
        <h4>Remember</h4>
        <p>One thread. One active stack.</p>
      </>
    ),
  },
  "web-apis": {
    title: "Web APIs / Host APIs",
    subtitle: "Work that waits outside the JavaScript stack",
    accentColor: "#f97316",
    sections: [
      {
        title: "What Lives Here",
        accent: "#f97316",
        content: (
          <>
            <p>
              Timers, DOM events, network callbacks, and other host features
              wait outside the JS call stack. JavaScript asks the host to manage
              them.
            </p>
          </>
        ),
      },
      {
        title: "Why It Matters",
        accent: "#ea580c",
        content: (
          <p>
            <code>setTimeout</code> does not pause JavaScript. It registers work
            with the host. When the timer expires, the callback gets queued as a
            task.
          </p>
        ),
      },
    ],
    aside: (
      <>
        <h4>Not The Same As JS</h4>
        <p>
          These APIs belong to the environment, like the browser or Node.js.
        </p>
      </>
    ),
  },
  microtasks: {
    title: "Microtask Queue",
    subtitle: "High-priority callbacks that run right after the stack clears",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What Goes Here",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              <code>Promise.then()</code> callbacks
            </li>
            <li>
              <code>queueMicrotask()</code> callbacks
            </li>
            <li>Some mutation observer callbacks</li>
          </ul>
        ),
      },
      {
        title: "The Big Rule",
        accent: "#7c3aed",
        content: (
          <>
            <p>
              After the stack empties, the event loop drains the microtask queue
              <strong> all the way down</strong> before it runs a normal task.
            </p>
            <p>
              That is why the Promise callback and the nested microtask both
              beat the timer.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Shortcut</h4>
        <p>Microtasks are the "before anything else" queue.</p>
      </>
    ),
  },
  tasks: {
    title: "Task Queue",
    subtitle: "Normal callbacks that run one turn at a time",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What Goes Here",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <code>setTimeout</code> and <code>setInterval</code> callbacks
            </li>
            <li>Message events</li>
            <li>Many UI and I/O callbacks</li>
          </ul>
        ),
      },
      {
        title: "How It Runs",
        accent: "#16a34a",
        content: (
          <p>
            The event loop usually takes <strong>one task</strong>, runs it,
            then checks microtasks again before taking another task.
          </p>
        ),
      },
    ],
    aside: (
      <>
        <h4>Why Timeout Is Last</h4>
        <p>It waited in the task queue while microtasks drained first.</p>
      </>
    ),
  },
  render: {
    title: "Render Opportunity",
    subtitle: "When the browser may paint updates to the screen",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What This Means",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Once the stack is empty and microtasks are drained, the browser
              may use that quiet moment to paint the next frame.
            </p>
          </>
        ),
      },
      {
        title: "Subtle But Important",
        accent: "#0f766e",
        content: (
          <p>
            Rendering is not another task sitting in the queue the same way
            timers are. It is an opportunity for the browser to update the
            screen between turns.
          </p>
        ),
      },
    ],
    aside: (
      <>
        <h4>Common Effect</h4>
        <p>
          If microtasks keep filling themselves forever, rendering can get
          starved.
        </p>
      </>
    ),
  },
};
