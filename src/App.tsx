import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import "./App.scss";
import Shell from "./components/Shell";
import LoadBalancerPlugin from "./plugins/load-balancer";
import EventStreamingPlugin from "./plugins/event-streaming";

function PluginSwitcher() {
  const navigate = useNavigate();
  const currentPath =
    window.location.pathname.replace("/", "") || "load-balancer";

  return (
    <div
      className="plugin-switcher"
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 1000,
        background: "white",
        padding: "0.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      <select
        value={currentPath}
        onChange={(e) => navigate(`/${e.target.value}`)}
        style={{
          padding: "0.5rem",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
        }}
      >
        <option value="load-balancer">Load Balancer</option>
        <option value="event-streaming">Event Streaming</option>
      </select>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PluginSwitcher />
      <Routes>
        <Route path="/" element={<Navigate to="/load-balancer" replace />} />
        <Route
          path="/load-balancer"
          element={<Shell plugin={LoadBalancerPlugin} />}
        />
        <Route
          path="/event-streaming"
          element={<Shell plugin={EventStreamingPlugin} />}
        />
        <Route path="*" element={<Navigate to="/load-balancer" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
