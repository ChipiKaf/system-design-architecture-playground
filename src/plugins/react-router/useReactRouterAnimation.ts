import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./reactRouterSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useReactRouterAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.reactRouter);
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(undefined!);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const persistedRef = useRef<Signal[]>([]);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    persistedRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => resolve(), ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const finish = useCallback(() => {
    onCompleteRef.current?.();
  }, []);

  /* ── Signal helpers ──────────────────────────────────── */
  const animateSignal = useCallback(
    (
      from: string,
      to: string,
      duration: number,
      color: string,
      onDone: () => void,
    ) => {
      const sigId = `sig-${from}-${to}-${Date.now()}`;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persistedRef.current,
          { id: sigId, from, to, progress: p, color, magnitude: 1 },
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const resting: Signal = {
            id: sigId,
            from,
            to,
            progress: 1,
            color,
            magnitude: 1,
          };
          persistedRef.current.push(resting);
          setSignals([...persistedRef.current]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  const animateParallel = useCallback(
    (
      pairs: { from: string; to: string; color: string }[],
      duration: number,
      onDone: () => void,
    ) => {
      const start = performance.now();
      const sigs = pairs.map((p, i) => ({
        id: `par-${i}-${Date.now()}`,
        from: p.from,
        to: p.to,
        color: p.color,
        progress: 0,
        magnitude: 1,
      }));
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persistedRef.current,
          ...sigs.map((s) => ({ ...s, progress: p })),
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          for (const s of sigs) {
            persistedRef.current.push({ ...s, progress: 1 });
          }
          setSignals([...persistedRef.current]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  /* ── Step orchestration ─────────────────────────────── */
  useEffect(() => {
    cleanup();

    const run = async () => {
      switch (currentStep) {
        /* Step 0 — What Is Dynamic Routing? */
        case 0:
          dispatch(reset());
          dispatch(
            patchState({
              phase: "overview",
              explanation:
                '"Dynamic routing" sounds fancy. It just means: your app looks at the URL and instantly shows the right page — without asking the server.\n\nOn old websites, every click = full page reload. White flash. Everything rebuilt from scratch. Even the header and sidebar that look exactly the same.\n\nReact Router fixes that. Let\'s see how.',
              hotZones: ["browser", "server"],
              showFullReload: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 1 — Watch the Full Reload */
        case 1:
          dispatch(
            patchState({
              phase: "full-reload",
              explanation:
                "Watch what happens with a normal link:\n\n1. You click <a href='/about'>\n2. Browser asks the server for a new page\n3. Server sends back fresh HTML\n4. Browser DESTROYS the current page\n5. Browser rebuilds everything from scratch\n\nHeader? Rebuilt. Sidebar? Rebuilt. Footer? Rebuilt. Even though they're identical.\n\nThat's like demolishing your house to change a lightbulb.",
              hotZones: ["browser", "server", "old-page"],
              showFullReload: true,
            }),
          );
          animateSignal("browser", "server", 600, "#f87171", () => {
            animateSignal("server", "browser", 600, "#f87171", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* Step 2 — The SPA Idea */
        case 2:
          dispatch(
            patchState({
              phase: "spa-concept",
              explanation:
                "What if the page loaded once… and never reloaded again?\n\nThat's a Single-Page App (SPA).\n\nThe HTML loads once. When you click a link, JavaScript swaps JUST the content area. Header stays. Sidebar stays. No white flash.\n\nThink of it like a TV — you don't buy a new TV to change the channel. You just switch channels.\n\nReact Router is what makes React apps work this way.",
              hotZones: ["browser", "app-shell"],
              showFullReload: false,
              showSpaSwap: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 3 — BrowserRouter: The Wrapper */
        case 3:
          dispatch(
            patchState({
              phase: "browser-router",
              explanation:
                "First step: wrap your app in <BrowserRouter>.\n\nIt doesn't show anything on screen. Its only job is to WATCH the URL bar.\n\nWhen the URL changes, it says: 'Hey, we moved! Which page should we show now?'\n\nThink of it as a GPS — it doesn't drive the car, but it always knows what road you're on.",
              hotZones: ["app-shell", "browser-router"],
              showSpaSwap: true,
              showBrowserRouter: true,
            }),
          );
          animateSignal(
            "app-shell",
            "browser-router",
            600,
            "#f59e0b",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 4 — Routes: The Directory */
        case 4:
          dispatch(
            patchState({
              phase: "routes-config",
              explanation:
                "Now you set up the lookup table.\n\n<Routes> holds a list of <Route> entries. Each entry is simple:\n\n  /         → show <Home />\n  /about    → show <About />\n  /contact  → show <Contact />\n\nURL on the left. Component on the right.\n\nReact Router checks the current URL, finds the match, and shows that one component. Nothing else changes.",
              hotZones: [
                "browser-router",
                "routes",
                "route-home",
                "route-about",
                "route-contact",
              ],
              showBrowserRouter: true,
              showRoutes: true,
            }),
          );
          animateSignal(
            "browser-router",
            "routes",
            600,
            "#06b6d4",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 5 — Link: Navigate Without Reloading */
        case 5:
          dispatch(
            patchState({
              phase: "link-component",
              explanation:
                "Normal <a> links reload the whole page. Don't use them in React.\n\nUse <Link to='/about'> instead. It LOOKS like a regular link to the user, but behind the scenes it just changes the URL bar — no server request.\n\nReact Router sees the new URL → finds the matching Route → swaps in that component. Instant.\n\nIt's like taking an elevator inside a building instead of walking to a different building.",
              hotZones: ["link", "browser-router", "routes"],
              showBrowserRouter: true,
              showRoutes: true,
              showLink: true,
            }),
          );
          animateSignal("link", "browser-router", 600, "#34d399", () => {
            animateSignal(
              "browser-router",
              "routes",
              400,
              "#34d399",
              async () => {
                await sleep(80);
                finish();
              },
            );
          });
          break;

        /* Step 6 — One Route, Infinite Pages */
        case 6:
          dispatch(
            patchState({
              phase: "dynamic-segments",
              explanation:
                "THIS is where 'dynamic' routing really clicks.\n\nImagine your site has user profiles: /users/1, /users/42, /users/999. Do you write 999 routes? No!\n\nYou write ONE route with a blank to fill in:\n  <Route path='/users/:id' />\n\nThe :id is a placeholder. Visit /users/42 → the :id becomes '42'.\n\nInside the component, useParams() reads the value. ONE route template. Infinite pages. That's dynamic routing.",
              hotZones: ["routes", "dynamic-route", "use-params"],
              showRoutes: true,
              showDynamic: true,
            }),
          );
          animateSignal("routes", "dynamic-route", 600, "#a78bfa", () => {
            animateSignal(
              "dynamic-route",
              "use-params",
              500,
              "#a78bfa",
              async () => {
                await sleep(80);
                finish();
              },
            );
          });
          break;

        /* Step 7 — Nested Routes: Pages Inside Pages */
        case 7:
          dispatch(
            patchState({
              phase: "nested-routes",
              explanation:
                "Some pages share a layout. A dashboard has a sidebar that stays, and only the main area changes.\n\nNested routes handle this. The parent route (Dashboard) renders its layout + an <Outlet />.\n\n<Outlet /> is a placeholder: 'put the child page HERE.'\n\n/dashboard/stats → Stats fills the Outlet\n/dashboard/settings → Settings fills it\n\nThe sidebar never disappears. Like a picture frame — the frame stays, you just swap the photo.",
              hotZones: ["routes", "layout", "outlet", "child-page"],
              showRoutes: true,
              showNested: true,
            }),
          );
          animateSignal("routes", "layout", 500, "#f472b6", () => {
            animateSignal("layout", "outlet", 500, "#f472b6", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* Step 8 — useNavigate: Moving from Code */
        case 8:
          dispatch(
            patchState({
              phase: "use-navigate",
              explanation:
                "Sometimes the user doesn't click a link — but you still need to move them somewhere.\n\nAfter a form submission. After login. After a timer.\n\nuseNavigate() gives you a function:\n  const navigate = useNavigate()\n  navigate('/dashboard')  → user moves there\n  navigate(-1)            → same as pressing Back\n\nNo click needed. The app moves the user.",
              hotZones: ["use-navigate-hook", "browser-router"],
              showNavigate: true,
              showBrowserRouter: true,
            }),
          );
          animateSignal(
            "use-navigate-hook",
            "browser-router",
            600,
            "#fb923c",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 9 — Search Params: ?key=value */
        case 9:
          dispatch(
            patchState({
              phase: "search-params",
              explanation:
                "Look at this URL: /products?sort=price&page=2\n\nTwo parts:\n• The path (/products) → picks which Route to show\n• The ? part (?sort=price) → extra info, like filters\n\nSearch params are sticky notes on a door. The door (path) tells you which room. The sticky notes add details.\n\nuseSearchParams() lets you read and change them. The URL updates, the page re-renders — but you stay on the same route.",
              hotZones: ["search-params-node", "routes"],
              showSearchParams: true,
              showRoutes: true,
            }),
          );
          animateSignal(
            "search-params-node",
            "routes",
            600,
            "#06b6d4",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 10 — Catch-All: 404 Pages */
        case 10:
          dispatch(
            patchState({
              phase: "catch-all",
              explanation:
                "What if someone visits /asdfgh? No route matches that.\n\nAdd this as the LAST route:\n  <Route path='*' element={<NotFound />} />\n\nThe * means 'match anything that nothing else matched.'\n\nIt's your 404 page — the receptionist saying 'Sorry, that room doesn't exist.'\n\nPut it last because React Router checks top-to-bottom.",
              hotZones: ["routes", "catch-all-route"],
              showRoutes: true,
              showCatchAll: true,
            }),
          );
          animateSignal(
            "routes",
            "catch-all-route",
            600,
            "#f87171",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 11 — Summary */
        case 11:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Your dynamic routing toolkit:\n\n① BrowserRouter → watches the URL\n② Routes + Route → the lookup table\n③ <Link> → navigate without reloading\n④ :id → one route, infinite pages\n⑤ Nested routes → shared layouts with <Outlet>\n⑥ useNavigate() → move users from code\n⑦ useSearchParams() → read ?key=value\n⑧ path='*' → catch 404s\n\nThat's dynamic routing: the app reads the URL and instantly shows the right page. All in the browser. No reload.",
              hotZones: [
                "browser-router",
                "routes",
                "link",
                "dynamic-route",
                "layout",
                "outlet",
                "use-navigate-hook",
                "search-params-node",
                "catch-all-route",
              ],
              showBrowserRouter: true,
              showRoutes: true,
              showLink: true,
              showDynamic: true,
              showNested: true,
              showNavigate: true,
              showSearchParams: true,
              showCatchAll: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        default:
          finish();
      }
    };

    run();
    return cleanup;
  }, [currentStep]);

  return {
    runtime,
    currentStep,
    signals,
    phase: runtime.phase,
  };
};
