import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "dynamic-routing"
  | "spa"
  | "browser-router"
  | "route-matching"
  | "link-component"
  | "dynamic-segments"
  | "nested-routes"
  | "use-navigate"
  | "url-search-params"
  | "catch-all";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "dynamic-routing": {
    title: "Dynamic Routing",
    subtitle: "What it actually means in plain English",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The Simplest Explanation",
        accent: "#a78bfa",
        content: (
          <p>
            <strong>Routing</strong> = deciding what to show based on the URL.
            <strong> Dynamic</strong> = it happens right now, in the browser,
            without asking the server. Put them together:{" "}
            <strong>
              the app reads the URL and instantly picks the right content to
              display
            </strong>
            . No page reload. No server round-trip. Just JavaScript swapping
            components.
          </p>
        ),
      },
      {
        title: 'Why "Dynamic"?',
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              On old websites, routing was <strong>static</strong> — the server
              decided which HTML to send. You clicked a link, the browser asked
              the server, and the server sent back a whole new page.
            </p>
            <p>
              With dynamic routing, the app already has all the pages loaded (as
              React components). It just swaps them in and out based on the URL
              — like flipping channels on a TV instead of buying a new TV for
              each channel.
            </p>
          </>
        ),
      },
      {
        title: "On Your CV",
        accent: "#a78bfa",
        content: (
          <p>
            When your CV says \"Improved user experience with dynamic routing,\"
            it means you made the app feel fast and seamless by using React
            Router to navigate between pages <em>without full reloads</em>.
            Users click around and the content changes instantly — that's the
            improved experience.
          </p>
        ),
      },
    ],
  },

  spa: {
    title: "Single-Page App (SPA)",
    subtitle: "One HTML page, many 'screens'",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "The Analogy",
        accent: "#60a5fa",
        content: (
          <p>
            Traditional websites are like a <strong>flipbook</strong> — each
            page is a separate piece of paper, and turning the page means
            re-drawing everything from scratch. An SPA is like a{" "}
            <strong>magic whiteboard</strong> — the board stays, but you erase
            one section and draw something new. The frame, header, and sidebar
            never disappear.
          </p>
        ),
      },
      {
        title: "Why It Matters",
        accent: "#3b82f6",
        content: (
          <p>
            Because only the changed part gets swapped, the page feels instant.
            No white flash, no re-downloading CSS/JS, no spinner. React Router
            makes React apps behave this way — it swaps components without a
            full reload.
          </p>
        ),
      },
    ],
  },

  "browser-router": {
    title: "BrowserRouter",
    subtitle: "The invisible wrapper that watches the URL",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Analogy",
        accent: "#f59e0b",
        content: (
          <p>
            Think of <code>&lt;BrowserRouter&gt;</code> as a{" "}
            <strong>GPS unit mounted on your dashboard</strong>. It doesn't
            drive the car, but it always knows what road you're on. Whenever you
            turn (the URL changes), the GPS tells the rest of the car
            (your&nbsp;app) where you are now.
          </p>
        ),
      },
      {
        title: "What It Does",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              It wraps your entire app and uses the browser's{" "}
              <strong>History API</strong> (pushState/popState) to change the
              URL <em>without</em> sending a new request to the server.
            </p>
            <p>
              Without it, none of the routing components (<code>Routes</code>,{" "}
              <code>Route</code>, <code>Link</code>) will work.
            </p>
          </>
        ),
      },
    ],
  },

  "route-matching": {
    title: "Route Matching",
    subtitle: "URL → Component lookup table",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The Analogy",
        accent: "#06b6d4",
        content: (
          <p>
            Imagine a <strong>receptionist with a directory board</strong>. A
            visitor says "I'm looking for Room 204." The receptionist checks the
            board: "Room 204 → Sales Department." They point you to Sales. Route
            matching works the same way: <code>/about</code> →{" "}
            <code>&lt;About /&gt;</code>.
          </p>
        ),
      },
      {
        title: "How It Works",
        accent: "#22d3ee",
        content: (
          <>
            <p>
              You define rules inside <code>&lt;Routes&gt;</code>. Each{" "}
              <code>&lt;Route path="..." element=&#123;...&#125; /&gt;</code> is
              one entry in the directory. React Router reads the current URL,
              walks through the routes top-to-bottom, and renders the first
              matching component.
            </p>
          </>
        ),
      },
    ],
  },

  "link-component": {
    title: "<Link> Component",
    subtitle: "Navigate without reloading",
    accentColor: "#34d399",
    sections: [
      {
        title: "The Analogy",
        accent: "#34d399",
        content: (
          <p>
            A normal <code>&lt;a href&gt;</code> is like{" "}
            <strong>leaving a building and walking to a new one</strong>. A{" "}
            <code>&lt;Link&gt;</code> is like{" "}
            <strong>taking an elevator inside the same building</strong> — you
            arrive at a new floor (URL), but you never left the building (the
            app).
          </p>
        ),
      },
      {
        title: "Under the Hood",
        accent: "#10b981",
        content: (
          <p>
            <code>&lt;Link to="/about"&gt;</code> renders an{" "}
            <code>&lt;a&gt;</code> tag, but intercepts the click. Instead of
            letting the browser fetch a new HTML page, it calls{" "}
            <code>history.pushState()</code> to change the URL, then React
            Router re-renders the matching Route — all in JavaScript,
            zero&nbsp;network&nbsp;requests.
          </p>
        ),
      },
    ],
  },

  "dynamic-segments": {
    title: "Dynamic Segments",
    subtitle: "URLs with blanks to fill in: /users/:id",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The Analogy",
        accent: "#a78bfa",
        content: (
          <p>
            A dynamic route is like a <strong>form letter</strong>: "Dear _____,
            your order #_____ is ready." The blanks change, but the template is
            the same. <code>/users/:id</code> is the template;{" "}
            <code>/users/42</code> fills in the blank.
          </p>
        ),
      },
      {
        title: "useParams()",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Inside the component, call <code>useParams()</code> to read the
              filled-in value. If the URL is <code>/users/42</code>, then{" "}
              <code>params.id</code> is <code>"42"</code>. Use it to fetch that
              user's data.
            </p>
          </>
        ),
      },
    ],
  },

  "nested-routes": {
    title: "Nested Routes",
    subtitle: "Pages inside pages — shared layouts",
    accentColor: "#f472b6",
    sections: [
      {
        title: "The Analogy",
        accent: "#f472b6",
        content: (
          <p>
            Think of a <strong>Russian nesting doll</strong>. The outer doll is
            the Dashboard layout (sidebar + header). Inside it, a smaller doll
            appears for <code>/dashboard/stats</code> or{" "}
            <code>/dashboard/settings</code>. The outer shell stays — only the
            inner content swaps.
          </p>
        ),
      },
      {
        title: "<Outlet />",
        accent: "#ec4899",
        content: (
          <p>
            The parent route renders an <code>&lt;Outlet /&gt;</code> — a
            placeholder that says "put the child route's component here." It's
            like a <strong>picture frame on the wall</strong>: the frame stays
            mounted; you just slide in a new photo (child page).
          </p>
        ),
      },
    ],
  },

  "use-navigate": {
    title: "useNavigate()",
    subtitle: "Navigate from code instead of a click",
    accentColor: "#fb923c",
    sections: [
      {
        title: "The Analogy",
        accent: "#fb923c",
        content: (
          <p>
            <code>&lt;Link&gt;</code> is like a <strong>door</strong> the user
            opens. <code>useNavigate()</code> is like a{" "}
            <strong>trap door</strong> that the app opens for you — after
            submitting a form, after logging in, after a timer expires. The user
            didn't click a link, but the app moved them anyway.
          </p>
        ),
      },
      {
        title: "Usage",
        accent: "#f97316",
        content: (
          <>
            <p>
              <code>const navigate = useNavigate();</code> — then call{" "}
              <code>navigate("/dashboard")</code> to redirect. You can also go
              back: <code>navigate(-1)</code> is the browser's Back button in
              code.
            </p>
          </>
        ),
      },
    ],
  },

  "url-search-params": {
    title: "URL Search Params",
    subtitle: "The ?key=value part of the URL",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The Analogy",
        accent: "#06b6d4",
        content: (
          <p>
            Search params are like <strong>sticky notes on a door</strong>. The
            door (path) tells you which room you're in. The sticky note (
            <code>?sort=price&amp;page=2</code>) adds extra context without
            changing the room. Anyone with the link sees the same sticky notes.
          </p>
        ),
      },
      {
        title: "useSearchParams()",
        accent: "#22d3ee",
        content: (
          <p>
            <code>
              const [searchParams, setSearchParams] = useSearchParams();
            </code>{" "}
            Read a param: <code>searchParams.get("sort")</code>. Update it:{" "}
            <code>setSearchParams(&#123; sort: "price" &#125;)</code>. The URL
            updates, React re-renders, no page reload.
          </p>
        ),
      },
    ],
  },

  "catch-all": {
    title: "Catch-All Route (404)",
    subtitle: "What happens when no route matches",
    accentColor: "#f87171",
    sections: [
      {
        title: "The Analogy",
        accent: "#f87171",
        content: (
          <p>
            In a hotel, if you ask for "Room 999" and it doesn't exist, the
            receptionist says "Sorry, that room doesn't exist." A catch-all
            route (<code>path="*"</code>) is that receptionist — it matches
            every URL that nothing else matched, and shows a friendly
            "Page&nbsp;Not&nbsp;Found" message.
          </p>
        ),
      },
      {
        title: "Placement",
        accent: "#ef4444",
        content: (
          <p>
            Put{" "}
            <code>
              &lt;Route path="*" element=&#123;&lt;NotFound /&gt;&#125; /&gt;
            </code>{" "}
            as the <strong>last</strong> child inside{" "}
            <code>&lt;Routes&gt;</code>. React Router checks routes in order;{" "}
            <code>*</code> matches anything, so it only catches what's left.
          </p>
        ),
      },
    ],
  },
};
