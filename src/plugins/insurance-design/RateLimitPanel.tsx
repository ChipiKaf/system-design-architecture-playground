import React, { useState, useMemo } from "react";

/* ── Model data (Tier-1 limits) ──────────────────────── */
interface ModelInfo {
  name: string;
  rpm: number;
  tpm: number;
}

const MODELS: ModelInfo[] = [
  { name: "GPT-5.4", rpm: 500, tpm: 500_000 },
  { name: "GPT-5", rpm: 500, tpm: 500_000 },
  { name: "GPT-4.1", rpm: 500, tpm: 30_000 },
  { name: "GPT-5.4 mini", rpm: 500, tpm: 500_000 },
  { name: "GPT-4.1 mini", rpm: 500, tpm: 200_000 },
  { name: "GPT-5.4 nano", rpm: 500, tpm: 200_000 },
  { name: "GPT-4.1 nano", rpm: 500, tpm: 200_000 },
];

const DEFAULT_AVG_TOKENS = 2000; // 1 500 in + 500 out

/* ── Styles ──────────────────────────────────────────── */
const panel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
  fontSize: "0.82rem",
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
};

const labelSt: React.CSSProperties = {
  color: "#94a3b8",
  whiteSpace: "nowrap",
  fontSize: "0.78rem",
};

const selectSt: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: "0.78rem",
  flex: 1,
  maxWidth: 160,
};

const inputSt: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: "0.78rem",
  width: 72,
  textAlign: "right",
};

const resultBox: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  padding: "0.6rem 0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const resultLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const resultValue: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "1rem",
  fontVariantNumeric: "tabular-nums",
};

const tagBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #1e293b",
  margin: "0.15rem 0",
};

/* ── Component ───────────────────────────────────────── */
const RateLimitPanel: React.FC = () => {
  const [modelIdx, setModelIdx] = useState(2); // default GPT-4.1 (tightest)
  const [requestRate, setRequestRate] = useState(100);
  const [avgTokens, setAvgTokens] = useState(DEFAULT_AVG_TOKENS);

  const model = MODELS[modelIdx];

  const calc = useMemo(() => {
    const rpmCap = model.rpm;
    const tpmCap = Math.floor(model.tpm / avgTokens);
    const effectiveRpm = Math.min(rpmCap, tpmCap);
    const bottleneck: "RPM" | "TPM" = tpmCap < rpmCap ? "TPM" : "RPM";
    const surplus = Math.max(0, requestRate - effectiveRpm);
    const queueDepthPer5Min = surplus * 5;
    const drainTimeMin = surplus > 0 ? Math.ceil(surplus / effectiveRpm) : 0;
    return {
      rpmCap,
      tpmCap,
      effectiveRpm,
      bottleneck,
      surplus,
      queueDepthPer5Min,
      drainTimeMin,
    };
  }, [model, requestRate, avgTokens]);

  const safe = requestRate <= calc.effectiveRpm;

  return (
    <div style={panel}>
      {/* Model selector */}
      <div style={row}>
        <span style={labelSt}>Model</span>
        <select
          style={selectSt}
          value={modelIdx}
          onChange={(e) => setModelIdx(Number(e.target.value))}
        >
          {MODELS.map((m, i) => (
            <option key={m.name} value={i}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Avg tokens per request */}
      <div style={row}>
        <span style={labelSt}>Avg tokens / req</span>
        <input
          type="number"
          style={inputSt}
          min={100}
          max={128_000}
          step={100}
          value={avgTokens}
          onChange={(e) => setAvgTokens(Math.max(1, Number(e.target.value)))}
        />
      </div>

      {/* Request rate */}
      <div style={row}>
        <span style={labelSt}>Your req/min</span>
        <input
          type="number"
          style={inputSt}
          min={0}
          max={100_000}
          step={10}
          value={requestRate}
          onChange={(e) => setRequestRate(Math.max(0, Number(e.target.value)))}
        />
      </div>

      <div style={divider} />

      {/* Model limits */}
      <div style={resultBox}>
        <span style={resultLabel}>Model Limits (Tier 1)</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <span>
            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>RPM </span>
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {model.rpm.toLocaleString()}
            </span>
          </span>
          <span>
            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>TPM </span>
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {model.tpm.toLocaleString()}
            </span>
          </span>
        </div>
      </div>

      {/* Effective throughput */}
      <div style={resultBox}>
        <span style={resultLabel}>Effective Throughput</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ ...resultValue, color: safe ? "#4ade80" : "#f87171" }}>
            {calc.effectiveRpm} req/min
          </span>
          <span
            style={{
              ...tagBase,
              background: calc.bottleneck === "TPM" ? "#7f1d1d" : "#1e3a5f",
              color: calc.bottleneck === "TPM" ? "#fca5a5" : "#93c5fd",
            }}
          >
            {calc.bottleneck}-limited
          </span>
        </div>
        <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
          min({model.rpm} RPM, ⌊{model.tpm.toLocaleString()} / {avgTokens}⌋ ={" "}
          {calc.tpmCap})
        </span>
      </div>

      {/* Calculation breakdown */}
      <div
        style={{
          ...resultBox,
          background: "#0c1222",
          fontSize: "0.75rem",
          gap: "0.4rem",
        }}
      >
        <span style={{ ...resultLabel, fontSize: "0.68rem" }}>
          How This Is Calculated
        </span>
        <div style={{ color: "#94a3b8", lineHeight: 1.6 }}>
          <div>
            <span style={{ color: "#64748b" }}>① RPM cap:</span>{" "}
            <span style={{ color: "#e2e8f0" }}>{model.rpm}</span> req/min
            <span style={{ color: "#475569" }}> (model hard limit)</span>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>② TPM→RPM:</span> ⌊
            <span style={{ color: "#e2e8f0" }}>
              {model.tpm.toLocaleString()}
            </span>{" "}
            ÷ <span style={{ color: "#e2e8f0" }}>{avgTokens}</span>⌋ ={" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {calc.tpmCap}
            </span>{" "}
            req/min
          </div>
          <div
            style={{
              marginTop: "0.25rem",
              borderTop: "1px solid #1e293b",
              paddingTop: "0.25rem",
            }}
          >
            <span style={{ color: "#64748b" }}>③ Effective:</span> min(
            {model.rpm}, {calc.tpmCap}) ={" "}
            <span
              style={{ color: safe ? "#4ade80" : "#f87171", fontWeight: 700 }}
            >
              {calc.effectiveRpm}
            </span>{" "}
            req/min
            <span
              style={{
                color: calc.bottleneck === "TPM" ? "#fca5a5" : "#93c5fd",
                marginLeft: 4,
              }}
            >
              ← {calc.bottleneck} is the bottleneck
            </span>
          </div>
          {!safe && (
            <>
              <div
                style={{
                  marginTop: "0.25rem",
                  borderTop: "1px solid #1e293b",
                  paddingTop: "0.25rem",
                }}
              >
                <span style={{ color: "#64748b" }}>④ Overflow:</span>{" "}
                <span style={{ color: "#e2e8f0" }}>{requestRate}</span> −{" "}
                <span style={{ color: "#e2e8f0" }}>{calc.effectiveRpm}</span> ={" "}
                <span style={{ color: "#fca5a5", fontWeight: 600 }}>
                  +{calc.surplus}
                </span>{" "}
                msg/min into SQS
              </div>
              <div>
                <span style={{ color: "#64748b" }}>⑤ Queue after 5 min:</span>{" "}
                {calc.surplus} × 5 ={" "}
                <span style={{ color: "#fca5a5", fontWeight: 600 }}>
                  {calc.queueDepthPer5Min.toLocaleString()}
                </span>{" "}
                messages
              </div>
              <div>
                <span style={{ color: "#64748b" }}>⑥ Drain time:</span> ⌈
                {calc.surplus} ÷ {calc.effectiveRpm}⌉ ={" "}
                <span style={{ color: "#fca5a5", fontWeight: 600 }}>
                  ~{calc.drainTimeMin} min
                </span>{" "}
                after spike stops
              </div>
            </>
          )}
        </div>
      </div>

      {/* Queue pressure */}
      {!safe && (
        <div style={{ ...resultBox, borderColor: "#7f1d1d" }}>
          <span style={{ ...resultLabel, color: "#f87171" }}>
            SQS Queue Pressure
          </span>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}
          >
            <span style={{ color: "#fca5a5", fontWeight: 600 }}>
              +{calc.surplus} msg/min overflow
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
              ~{calc.queueDepthPer5Min.toLocaleString()} messages queued after 5
              min spike
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
              Drain time after spike stops: ~{calc.drainTimeMin} min
            </span>
          </div>
        </div>
      )}

      {safe && (
        <div style={{ ...resultBox, borderColor: "#166534" }}>
          <span style={{ ...resultLabel, color: "#4ade80" }}>
            Within Limits
          </span>
          <span style={{ color: "#86efac", fontSize: "0.78rem" }}>
            No queue buildup — workers can keep up in real time.
          </span>
        </div>
      )}
    </div>
  );
};

export default RateLimitPanel;
