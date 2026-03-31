import React, { useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { useDispatch } from "react-redux";
import "./main.scss";
import { selectNeuron } from "../../store/slices/simulationSlice";
import { useAnnAnimation } from "./useAnnAnimation";
import { viz } from "vizcraft";

interface NetworkVisualizationProps {
  onAnimationComplete?: () => void;
}

export interface NeuronData {
  layerIndex: number;
  neuronIndex: number;
  bias: number;
  output: number;
  inputs: number[];
  weights: number[];
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const {
    signals,
    activeLayer,
    neurons,
    connections,
    neuronValues,
    layerSizes,
  } = useAnnAnimation(onAnimationComplete);

  // Constants for layout
  const width = 800;
  const height = 600;
  const neuronRadius = 15;

  const containerRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);

  const scene = useMemo(() => {
    // Grid Configuration
    const cols = layerSizes.length;
    const rows = Math.max(...layerSizes);
    const b = viz().view(width, height).grid(cols, rows, { x: 50, y: 50 });

    // Nodes
    neurons.forEach((neuron) => {
      const val = neuronValues[`${neuron.layerIndex}-${neuron.neuronIndex}`];
      const isVisible = val !== undefined;

      let neuronClass = `neuron ${
        activeLayer === neuron.layerIndex ? "active" : ""
      }`;
      let displayValue = "";

      if (isVisible) {
        if (val.state === "sum") {
          neuronClass += val.sum < 0 ? " negative" : " positive";
          displayValue = val.sum.toFixed(2);
        } else {
          if (val.output === 0) {
            neuronClass += " inactive";
            displayValue = "0.00";
          } else {
            neuronClass += " positive";
            displayValue = val.output.toFixed(2);
          }
        }
      }

      // Calculate centered row index
      const layerSize = layerSizes[neuron.layerIndex] || 0;
      const rowOffset = (rows - layerSize) / 2;
      // Fractional positioning allowed in viz-kit
      const row = neuron.neuronIndex + rowOffset;

      const nodeBuilder = b
        .node(`${neuron.layerIndex}-${neuron.neuronIndex}`)
        .cell(neuron.layerIndex, row) // Use calculated grid coordinates
        //.at(neuron.x, neuron.y) // old implementation
        .circle(neuronRadius)
        .class(neuronClass)
        .label(isVisible ? displayValue : "", {
          className: `neuron-value ${isVisible ? "visible" : ""}`,
        });

      // Tooltips: explain what this neuron is and why it fired/didn't
      if (isVisible) {
        const isInputLayer = neuron.layerIndex === 0;
        if (isInputLayer) {
          nodeBuilder.tooltip({
            title: `Input Neuron [${neuron.neuronIndex}]`,
            sections: [
              { label: "Value", value: val.output.toFixed(4) },
              { label: "Role", value: "Passes raw data into the network" },
            ],
          });
        } else if (val.state === "sum") {
          nodeBuilder.tooltip({
            title: `Neuron [L${neuron.layerIndex}, N${neuron.neuronIndex}]`,
            sections: [
              { label: "Weighted Sum", value: val.sum.toFixed(4) },
              { label: "Bias", value: neuron.bias.toFixed(4) },
              {
                label: "Status",
                value: "Computing… activation not yet applied",
              },
            ],
          });
        } else {
          const fired = val.output > 0;
          nodeBuilder.tooltip({
            title: `Neuron [L${neuron.layerIndex}, N${neuron.neuronIndex}]`,
            sections: [
              { label: "Weighted Sum", value: val.sum.toFixed(4) },
              { label: "After ReLU", value: val.output.toFixed(4) },
              {
                label: "Fired?",
                value: fired
                  ? "✓ Yes — sum was positive"
                  : "✗ No — sum was ≤ 0, ReLU outputs 0",
              },
              {
                label: "Why?",
                value: fired
                  ? "Positive inputs outweighed negative ones"
                  : "Negative/zero inputs dominated — this neuron stays silent",
              },
            ],
          });
          // Badge: quick visual indicator of fired/not-fired
          nodeBuilder.badge(fired ? "✓" : "✗", {
            position: "top-right",
            fill: "#fff",
            background: fired ? "#22c55e" : "#ef4444",
            fontSize: 8,
          });
        }
      }

      nodeBuilder.onClick(() => {
        // Gather data for this neuron
        const incomingConnections = connections.filter(
          (c) =>
            c.targetIndex === neuron.neuronIndex &&
            c.sourceLayer === neuron.layerIndex - 1,
        );

        const inputs = incomingConnections.map((c) => {
          const sourceKey = `${c.sourceLayer}-${c.sourceIndex}`;
          return neuronValues[sourceKey]?.output || 0;
        });

        const weights = incomingConnections.map((c) => c.weight);

        dispatch(
          selectNeuron({
            layerIndex: neuron.layerIndex,
            neuronIndex: neuron.neuronIndex,
            bias: neuron.bias,
            output: val?.output || 0,
            inputs,
            weights,
          }),
        );
      });
    });

    // Connections
    connections.forEach((conn) => {
      const sourceKey = `${conn.sourceLayer}-${conn.sourceIndex}`;
      const sourceVal = neuronValues[sourceKey];
      const sourceOutput = sourceVal?.output ?? 0;

      const hasFlow =
        activeLayer === conn.sourceLayer &&
        sourceVal?.sum > 0 &&
        conn.weight > 0;

      const bEdge = b
        .edge(
          `${conn.sourceLayer}-${conn.sourceIndex}`,
          `${conn.sourceLayer + 1}-${conn.targetIndex}`,
          conn.id,
        )
        .label(conn.weight.toFixed(2), { className: "weight-label" })
        .class("connection")
        .hitArea(10);

      // Tooltip: explain this connection's role
      const product = sourceOutput * conn.weight;
      const isExcitatory = conn.weight >= 0;
      const tooltipSections = [
        {
          label: "Weight",
          value: `${conn.weight.toFixed(4)} (${isExcitatory ? "excitatory ↑" : "inhibitory ↓"})`,
        },
      ];
      if (sourceVal) {
        tooltipSections.push(
          { label: "Source Output", value: sourceOutput.toFixed(4) },
          {
            label: "Signal Sent",
            value: `${sourceOutput.toFixed(2)} × ${conn.weight.toFixed(2)} = ${product.toFixed(4)}`,
          },
        );
      }
      if (hasFlow) {
        tooltipSections.push({
          label: "Flow",
          value: "✓ Active — positive source & positive weight",
        });
      } else if (activeLayer === conn.sourceLayer) {
        const reason =
          sourceOutput <= 0
            ? "Source neuron did not fire (output ≤ 0)"
            : conn.weight <= 0
              ? "Weight is negative or zero"
              : "Not active at this step";
        tooltipSections.push({
          label: "Flow",
          value: `✗ Inactive — ${reason}`,
        });
      }

      bEdge.tooltip({
        title: `Connection`,
        sections: tooltipSections,
      });

      if (hasFlow) {
        bEdge.animate("flow", { duration: "2s" });
      }
    });

    // Add Signals, Grid Labels, and Legend via OverlayBuilder
    b.overlay((o) => {
      // Signals
      signals.forEach((sig) => {
        o.add(
          "signal",
          {
            from: `${sig.sourceLayer}-${sig.sourceIndex}`,
            to: `${sig.targetLayer}-${sig.targetIndex}`,
            progress: sig.progress,
            magnitude: sig.sourceOutput,
          },
          { key: sig.id },
        );
      });

      // Generate Grid Labels Dynamically
      const colLabels: Record<number, string> = {};
      const validLayers = layerSizes
        .map((size, index) => ({ size, index }))
        .filter((l) => l.size > 0);

      validLayers.forEach((layer, i) => {
        if (i === 0) colLabels[layer.index] = "Input Layer";
        else if (i === validLayers.length - 1)
          colLabels[layer.index] = "Output Layer";
        else colLabels[layer.index] = "Hidden Layer";
      });

      o.add("grid-labels", { colLabels, yOffset: 20 }, { key: "grid-labels" });
    });

    // AnimationBuilder: pulse active-layer neurons on activation steps
    if (activeLayer !== null) {
      b.animate((anim) => {
        neurons
          .filter((n) => n.layerIndex === activeLayer)
          .forEach((n) => {
            anim
              .at(0)
              .node(`${n.layerIndex}-${n.neuronIndex}`)
              .to({ scale: 1.15 }, { duration: 200, easing: "easeOut" })
              .to({ scale: 1.0 }, { duration: 200, easing: "easeIn" });
          });
      });
    }

    return b;
  }, [
    neurons,
    connections,
    neuronValues,
    activeLayer,
    dispatch,
    width,
    height,
    layerSizes,
    signals,
  ]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous scene before mounting new one
    builderRef.current?.destroy();
    builderRef.current = scene;

    scene.mount(containerRef.current, { autoplay: true });
  }, [scene]);

  // Destroy on unmount
  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
    };
  }, []);

  return (
    <div className="network-visualization">
      <div
        ref={containerRef}
        className="ann-viz"
        style={{ width: 800, height: 600 }}
      ></div>
    </div>
  );
};

export default NetworkVisualization;
