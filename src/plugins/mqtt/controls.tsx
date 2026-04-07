import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setPublishTopic,
  setQoS,
  toggleRetained,
  setSubscriberPattern,
  addSubscriber,
  removeSubscriber,
  ALL_TOPICS,
  type MqttState,
  type QoSLevel,
} from "./mqttSlice";

/* ── Pre-built wildcard pattern presets ───────────────── */
const WILDCARD_PRESETS = [
  { label: "B1/F1/R1", value: "B1/F1/R1", hint: "Exact topic" },
  { label: "B1/F1/+", value: "B1/F1/+", hint: "All rooms on B1/F1" },
  { label: "B1/+/R1", value: "B1/+/R1", hint: "Room 1 every floor B1" },
  { label: "+/F1/R1", value: "+/F1/R1", hint: "F1/R1 in any building" },
  { label: "B1/#", value: "B1/#", hint: "Everything in B1" },
  { label: "+/F1/#", value: "+/F1/#", hint: "All of F1, any building" },
  { label: "#", value: "#", hint: "All topics" },
];

const MqttControls: React.FC = () => {
  const dispatch = useDispatch();
  const { publishTopic, subscribers, qos, retained } = useSelector(
    (state: RootState) => state.mqtt,
  ) as MqttState;

  const handleTopicChange = (topic: string) => {
    dispatch(setPublishTopic(topic));
    dispatch(resetSimulation());
  };

  const handleSubPatternChange = (id: string, pattern: string) => {
    dispatch(setSubscriberPattern({ id, pattern }));
    dispatch(resetSimulation());
  };

  const handleQoSChange = (level: QoSLevel) => {
    dispatch(setQoS(level));
    dispatch(resetSimulation());
  };

  return (
    <div className="mqtt-controls">
      {/* ── Publish topic selector ─────────────────────── */}
      <div className="mqtt-controls__group">
        <span className="mqtt-controls__label">Publish:</span>
        <select
          className="mqtt-controls__select"
          value={publishTopic}
          onChange={(e) => handleTopicChange(e.target.value)}
        >
          {ALL_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <span className="mqtt-controls__sep" />

      {/* ── QoS selector ───────────────────────────────── */}
      <div className="mqtt-controls__group">
        <span className="mqtt-controls__label">QoS:</span>
        {([0, 1, 2] as QoSLevel[]).map((level) => (
          <button
            key={level}
            className={`mqtt-controls__btn ${qos === level ? "mqtt-controls__btn--active" : ""}`}
            style={qos === level ? { borderColor: "#a78bfa" } : undefined}
            onClick={() => handleQoSChange(level)}
          >
            {level}
          </button>
        ))}
      </div>

      <span className="mqtt-controls__sep" />

      {/* ── Retain toggle ──────────────────────────────── */}
      <button
        className={`mqtt-controls__btn ${retained ? "mqtt-controls__btn--active" : ""}`}
        style={retained ? { borderColor: "#f59e0b" } : undefined}
        onClick={() => {
          dispatch(toggleRetained());
          dispatch(resetSimulation());
        }}
      >
        {retained ? "Retained ✓" : "Retain"}
      </button>

      <span className="mqtt-controls__sep" />

      {/* ── Subscriber controls ────────────────────────── */}
      <div className="mqtt-controls__group">
        <button
          className="mqtt-controls__btn"
          onClick={() => {
            dispatch(removeSubscriber());
            dispatch(resetSimulation());
          }}
          disabled={subscribers.length <= 1}
        >
          − Sub
        </button>
        <span className="mqtt-controls__label">
          {subscribers.length} sub{subscribers.length !== 1 ? "s" : ""}
        </span>
        <button
          className="mqtt-controls__btn"
          onClick={() => {
            dispatch(addSubscriber());
            dispatch(resetSimulation());
          }}
          disabled={subscribers.length >= 6}
        >
          + Sub
        </button>
      </div>

      <span className="mqtt-controls__sep" />

      {/* ── Per-subscriber pattern selectors ──────────── */}
      {subscribers.map((sub) => (
        <div key={sub.id} className="mqtt-controls__group">
          <span
            className="mqtt-controls__dot"
            style={{ background: sub.color }}
          />
          <select
            className="mqtt-controls__select mqtt-controls__select--sm"
            value={sub.pattern}
            onChange={(e) => handleSubPatternChange(sub.id, e.target.value)}
          >
            {WILDCARD_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} — {p.hint}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default MqttControls;
