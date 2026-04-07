import React from "react";
import "./main.scss";
import { useLoadBalancerAnimation } from "./useLoadBalancerAnimation";
import { useDispatch } from "react-redux";
import {
  type LoadBalancerState,
  setStrategy,
  setStickySessions,
  toggleServer,
  type DistributionStrategy,
} from "./loadBalancerSlice";

const STRATEGY_OPTIONS: Array<{
  value: DistributionStrategy;
  label: string;
  summary: string;
}> = [
  {
    value: "round-robin",
    label: "Round Robin",
    summary:
      "Each new request goes to the next healthy server in a fixed rotation.",
  },
  {
    value: "least-connections",
    label: "Least Connections",
    summary:
      "New traffic goes to the server currently carrying the lightest active load.",
  },
  {
    value: "random",
    label: "Random",
    summary:
      "Each request picks a healthy server at random, which is simple but not very predictable.",
  },
  {
    value: "ip-hash",
    label: "IP Hash",
    summary:
      "The client IP is hashed so the same client tends to land on the same server.",
  },
  {
    value: "weighted-round-robin",
    label: "Weighted Round Robin",
    summary:
      "Higher-capacity servers receive more turns without removing smaller instances from the pool.",
  },
];

interface LoadBalancerVisualizationProps {
  onAnimationComplete?: () => void;
}

const LoadBalancerVisualization: React.FC<LoadBalancerVisualizationProps> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { loadBalancer, currentStep } =
    useLoadBalancerAnimation(onAnimationComplete);
  const {
    clients,
    requests,
    servers,
    sessionMap,
    stickySessions,
    strategy,
  }: LoadBalancerState = loadBalancer;

  const strategyDetails =
    STRATEGY_OPTIONS.find((option) => option.value === strategy) ??
    STRATEGY_OPTIONS[0];
  const peakConnections = Math.max(
    1,
    ...servers.map((server) => server.connections),
  );

  const activeRequest = requests[requests.length - 1];
  const activeClientId = activeRequest?.clientId ?? null;
  const activeServerId = activeRequest?.assignedServer ?? null;

  const findServerLabel = (serverId: string | null) =>
    servers.find((server) => server.id === serverId)?.label ?? "No server";

  const stickyCountForServer = (serverId: string) =>
    Object.values(sessionMap).filter((session) => session.serverId === serverId)
      .length;

  const sessionEntries = Object.entries(sessionMap).flatMap(
    ([clientId, assignment]) => {
      const client = clients.find((item) => item.id === clientId);
      const server = servers.find((item) => item.id === assignment.serverId);

      if (!client || !server) {
        return [];
      }

      return [
        {
          clientLabel: client.label,
          sessionId: assignment.sessionId,
          serverLabel: server.label,
        },
      ];
    },
  );

  return (
    <div className="lb-visualization">
      <div className="lb-toolbar">
        <div className="lb-controls">
          <label className="lb-control-label" htmlFor="strategy-select">
            Strategy
          </label>
          <select
            id="strategy-select"
            value={strategy}
            onChange={(e) =>
              dispatch(setStrategy(e.target.value as DistributionStrategy))
            }
            disabled={currentStep > 0}
          >
            {STRATEGY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className={`lb-toggle ${stickySessions ? "enabled" : ""}`}>
            <input
              type="checkbox"
              checked={stickySessions}
              onChange={(e) => dispatch(setStickySessions(e.target.checked))}
              disabled={currentStep > 0}
            />
            <span>Sticky sessions</span>
          </label>
        </div>

        <p className="lb-strategy-copy">
          <strong>{strategyDetails.label}:</strong> {strategyDetails.summary}
        </p>
      </div>

      <div className="lb-diagram">
        <div className="lb-clients">
          {clients.map((client) => {
            const assignment = sessionMap[client.id];
            const assignedServerLabel = assignment
              ? findServerLabel(assignment.serverId)
              : null;

            return (
              <div
                key={client.id}
                className={`lb-client-card ${activeClientId === client.id ? "active" : ""}`}
                style={{
                  borderColor:
                    activeClientId === client.id ? client.color : undefined,
                }}
              >
                <span
                  className="lb-client-dot"
                  style={{ backgroundColor: client.color }}
                />
                <div className="lb-client-copy">
                  <strong>{client.label}</strong>
                  <span>{client.ip}</span>
                  <span className="lb-client-session">
                    {stickySessions
                      ? assignment
                        ? `${assignment.sessionId} -> ${assignedServerLabel}`
                        : "No sticky mapping yet"
                      : "Fresh routing each request"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lb-arrow-col">
          <div className={`lb-arrow ${activeRequest ? "highlighted" : ""}`}>
            ▶
          </div>
        </div>

        <div className="lb-balancer">
          <div
            className={`lb-box balancer-box ${currentStep >= 1 ? "active" : ""}`}
          >
            <span>Load Balancer</span>
            <span className="lb-strategy-badge">{strategyDetails.label}</span>
            {stickySessions && (
              <span className="lb-affinity-badge">Cookie affinity on</span>
            )}
          </div>
          <p className="lb-balancer-copy">
            {activeRequest
              ? activeRequest.routingReason
              : stickySessions
                ? "Sticky sessions pin repeat clients after their first request, which makes affinity visible but can skew load."
                : strategyDetails.summary}
          </p>
        </div>

        <div className="lb-arrow-col multi">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`lb-arrow ${activeServerId === server.id ? "highlighted" : ""} ${!server.isActive ? "muted" : ""}`}
            >
              ▶
            </div>
          ))}
        </div>

        <div className="lb-servers">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`lb-box server-box ${!server.isActive ? "inactive" : ""} ${activeServerId === server.id ? "highlighted" : ""}`}
              onClick={() => dispatch(toggleServer(server.id))}
              title="Click to toggle server on/off"
            >
              <div className="server-head">
                <span className="server-label">{server.label}</span>
                <span className="server-weight">weight {server.weight}</span>
              </div>
              <div className="server-loadbar">
                <span
                  style={{
                    width:
                      server.connections === 0
                        ? "0%"
                        : `${Math.max(18, (server.connections / peakConnections) * 100)}%`,
                  }}
                />
              </div>
              <div className="server-meta">
                <span>{server.connections} active conn</span>
                <span>{stickyCountForServer(server.id)} sticky</span>
              </div>
              <span
                className={`server-status ${server.isActive ? "online" : "offline"}`}
              >
                {server.isActive ? "Online" : "Offline"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="lb-insights">
        <div className="lb-card">
          <h4>Active decision</h4>
          {activeRequest ? (
            <>
              <p>
                <strong>#{activeRequest.sequence}</strong>{" "}
                {activeRequest.clientLabel} ({activeRequest.clientIp}) -&gt;{" "}
                <strong>{findServerLabel(activeRequest.assignedServer)}</strong>
              </p>
              <p>{activeRequest.routingReason}</p>
              {activeRequest.reusedSession && (
                <span className="lb-pill sticky">Sticky hit</span>
              )}
            </>
          ) : (
            <p>
              Pick a routing strategy, optionally enable sticky sessions, then
              send the first request.
            </p>
          )}
        </div>

        <div className="lb-card">
          <h4>Session affinity</h4>
          {stickySessions ? (
            sessionEntries.length > 0 ? (
              <ul className="lb-session-list">
                {sessionEntries.map((entry) => (
                  <li key={entry.sessionId}>
                    <strong>{entry.clientLabel}</strong>
                    <span>
                      {entry.sessionId} -&gt; {entry.serverLabel}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No client has been pinned yet. The first request creates the
                cookie-to-server mapping.
              </p>
            )
          ) : (
            <p>
              Sticky sessions are off. Each request is routed fresh using the
              selected algorithm.
            </p>
          )}
        </div>

        <div className="lb-card">
          <h4>Server mix</h4>
          <p>
            {strategy === "weighted-round-robin"
              ? "Weighted round robin spreads turns in proportion to server capacity instead of treating every instance equally."
              : "Connection count shows current load; sticky count shows how much affinity is anchoring traffic to a server."}
          </p>
          <ul className="lb-server-summary">
            {servers.map((server) => (
              <li key={server.id}>
                <strong>{server.label}</strong>
                <span>
                  {server.isActive
                    ? `${server.connections} conn • weight ${server.weight} • ${stickyCountForServer(server.id)} sticky`
                    : "Offline"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lb-card wide">
          <h4>Request log</h4>
          <p>
            Total requests dispatched: <strong>{requests.length}</strong>
          </p>
          {requests.length > 0 ? (
            <ul className="lb-request-log">
              {[...requests]
                .reverse()
                .slice(0, 10)
                .map((req) => (
                  <li
                    key={req.id}
                    className={req.reusedSession ? "sticky" : ""}
                  >
                    <div className="lb-request-head">
                      <span>
                        #{req.sequence} {req.clientLabel} ({req.clientIp})
                      </span>
                      <strong>{findServerLabel(req.assignedServer)}</strong>
                    </div>
                    <p>{req.routingReason}</p>
                  </li>
                ))}
            </ul>
          ) : (
            <p>No traffic yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadBalancerVisualization;
