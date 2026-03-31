import React from "react";
import "./main.scss";
import { useLoadBalancerAnimation } from "./useLoadBalancerAnimation";
import { useDispatch } from "react-redux";
import { setStrategy, toggleServer } from "./loadBalancerSlice";
import type { DistributionStrategy } from "./loadBalancerSlice";

interface LoadBalancerVisualizationProps {
  onAnimationComplete?: () => void;
}

const LoadBalancerVisualization: React.FC<LoadBalancerVisualizationProps> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { loadBalancer, currentStep } =
    useLoadBalancerAnimation(onAnimationComplete);
  const { servers, requests, strategy } = loadBalancer;

  const lastRequest = requests[requests.length - 1];

  return (
    <div className="lb-visualization">
      <div className="lb-controls">
        <label htmlFor="strategy-select">Strategy:</label>
        <select
          id="strategy-select"
          value={strategy}
          onChange={(e) =>
            dispatch(setStrategy(e.target.value as DistributionStrategy))
          }
          disabled={currentStep > 0}
        >
          <option value="round-robin">Round Robin</option>
          <option value="least-connections">Least Connections</option>
          <option value="random">Random</option>
        </select>
      </div>

      <div className="lb-diagram">
        {/* Client */}
        <div className="lb-client">
          <div className="lb-box client-box">Client</div>
        </div>

        {/* Arrow to LB */}
        <div className="lb-arrow-col">
          <div className="lb-arrow">▶</div>
        </div>

        {/* Load Balancer */}
        <div className="lb-balancer">
          <div
            className={`lb-box balancer-box ${currentStep >= 1 ? "active" : ""}`}
          >
            Load Balancer
            <span className="lb-strategy-badge">{strategy}</span>
          </div>
        </div>

        {/* Arrows to servers */}
        <div className="lb-arrow-col multi">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`lb-arrow ${lastRequest?.assignedServer === server.id ? "highlighted" : ""}`}
            >
              ▶
            </div>
          ))}
        </div>

        {/* Servers */}
        <div className="lb-servers">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`lb-box server-box ${!server.isActive ? "inactive" : ""} ${lastRequest?.assignedServer === server.id ? "highlighted" : ""}`}
              onClick={() => dispatch(toggleServer(server.id))}
              title="Click to toggle server on/off"
            >
              <span className="server-label">{server.label}</span>
              <span className="server-connections">
                {server.connections} conn
              </span>
              <span
                className={`server-status ${server.isActive ? "online" : "offline"}`}
              >
                {server.isActive ? "Online" : "Offline"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="lb-stats">
        <h4>Request Log</h4>
        <p>
          Total requests dispatched: <strong>{requests.length}</strong>
        </p>
        {requests.length > 0 && (
          <ul className="lb-request-log">
            {[...requests]
              .reverse()
              .slice(0, 8)
              .map((req) => (
                <li key={req.id}>
                  Request → <strong>{req.assignedServer}</strong>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LoadBalancerVisualization;
