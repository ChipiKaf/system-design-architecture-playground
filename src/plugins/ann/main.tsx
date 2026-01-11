
import React from 'react';
import { useDispatch } from 'react-redux';
import './main.scss';
import { selectNeuron } from '../../store/slices/simulationSlice';
import { useAnnAnimation } from './useAnnAnimation';
import { viz } from 'vizcraft';
import { useMemo } from 'react';

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
    layerSizes 
  } = useAnnAnimation(onAnimationComplete);

  // Constants for layout
  const width = 800;
  const height = 600;
  const neuronRadius = 15;

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
        activeLayer === neuron.layerIndex ? 'active' : ''
      }`;
      let displayValue = '';

      if (isVisible) {
        if (val.state === 'sum') {
          neuronClass += val.sum < 0 ? ' negative' : ' positive';
          displayValue = val.sum.toFixed(2);
        } else {
          if (val.output === 0) {
            neuronClass += ' inactive';
            displayValue = '0.00';
          } else {
            neuronClass += ' positive';
            displayValue = val.output.toFixed(2);
          }
        }
      }

      // Calculate centered row index
      const layerSize = layerSizes[neuron.layerIndex] || 0;
      const rowOffset = (rows - layerSize) / 2;
      // Fractional positioning allowed in viz-kit
      const row = neuron.neuronIndex + rowOffset;
      
      b.node(`${neuron.layerIndex}-${neuron.neuronIndex}`)
       .cell(neuron.layerIndex, row) // Use calculated grid coordinates
       //.at(neuron.x, neuron.y) // old implementation
       .circle(neuronRadius)
       .class(neuronClass)
       .label(isVisible ? displayValue : '', { className: `neuron-value ${isVisible ? 'visible' : ''}` })
       .onClick(() => {
          // Gather data for this neuron
          const incomingConnections = connections.filter(
            (c) =>
              c.targetIndex === neuron.neuronIndex &&
              c.sourceLayer === neuron.layerIndex - 1
          );

          const inputs = incomingConnections.map((c) => {
            const sourceKey = `${c.sourceLayer}-${c.sourceIndex}`;
            return neuronValues[sourceKey]?.output || 0;
          });

          const weights = incomingConnections.map((c) => c.weight);

          dispatch(selectNeuron({
            layerIndex: neuron.layerIndex,
            neuronIndex: neuron.neuronIndex,
            bias: neuron.bias,
            output: val?.output || 0,
            inputs,
            weights,
          }));
       });
    });

    // Connections
    connections.forEach((conn) => {
        const bEdge = b.edge(`${conn.sourceLayer}-${conn.sourceIndex}`, `${conn.sourceLayer + 1}-${conn.targetIndex}`, conn.id)
         .label(conn.weight.toFixed(2), { className: 'weight-label' })
         .class('connection')
         .hitArea(10); // Standard hit area width

        // Check "flow" condition: active layer matches source, source output > 0, weight > 0
        if (activeLayer === conn.sourceLayer && neuronValues[`${conn.sourceLayer}-${conn.sourceIndex}`]?.sum > 0 && conn.weight > 0) {
            bEdge.animate('flow', { duration: '2s' });
        }
    });

    // Add Signals as Overlays
    signals.forEach(sig => {
        b.overlay('signal', {
            from: `${sig.sourceLayer}-${sig.sourceIndex}`,
            to: `${sig.targetLayer}-${sig.targetIndex}`,
            progress: sig.progress,
            magnitude: sig.sourceOutput,
        }, sig.id);
    });

    // Generate Grid Labels Dynamically
    // Only label layers that have neurons (size > 0)
    const colLabels: Record<number, string> = {};
    const validLayers = layerSizes
        .map((size, index) => ({ size, index }))
        .filter(l => l.size > 0);
        
    validLayers.forEach((layer, i) => {
        if (i === 0) colLabels[layer.index] = 'Input Layer';
        else if (i === validLayers.length - 1) colLabels[layer.index] = 'Output Layer';
        else colLabels[layer.index] = 'Hidden Layer';
    });



    // Add Grid Labels
    b.overlay('grid-labels', {
        colLabels: colLabels,
        yOffset: 20,
    });

    return b;
  }, [neurons, connections, neuronValues, activeLayer, dispatch, width, height, layerSizes, signals]);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      scene.mount(containerRef.current);
    }
  }, [scene]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="network-visualization">
       <div ref={containerRef} className="ann-viz" style={{ width: 800, height: 600 }}></div>
    </div>
  );
};

export default NetworkVisualization;
