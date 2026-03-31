import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginName = process.argv[2];

if (!pluginName) {
  console.error('Please provide a plugin name (kebab-case), e.g., npm run generate load-balancer');
  process.exit(1);
}

// Helpers
const toPascalCase = (str) =>
  str.replace(/(^\w|-\w)/g, (clear) => clear.replace(/-/, '').toUpperCase());

const toCamelCase = (str) =>
  str.replace(/-\w/g, (clear) => clear[1].toUpperCase());

const pascalName = toPascalCase(pluginName);
const camelName = toCamelCase(pluginName);
const targetDir = path.join(__dirname, '../src/plugins', pluginName);

if (fs.existsSync(targetDir)) {
  console.error(`Plugin "${pluginName}" already exists at ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

// 1. Slice
const sliceContent = `import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ${pascalName}State {
  // Add specific state here
  value: number;
}

export const initialState: ${pascalName}State = {
  value: 0,
};

const ${camelName}Slice = createSlice({
  name: '${camelName}',
  initialState,
  reducers: {
    setValue(state, action: PayloadAction<number>) {
      state.value = action.payload;
    },
  },
});

export const { setValue } = ${camelName}Slice.actions;
export default ${camelName}Slice.reducer;
`;

fs.writeFileSync(path.join(targetDir, `${camelName}Slice.ts`), sliceContent);

// 2. Animation Hook
const hookContent = `import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../../store/store';

// We listen to the GLOBAL simulation step to drive our logic,
// similar to how the ANN plugin works.
export const use${pascalName}Animation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  
  // Select global simulation state
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  
  // Local state for animation progress
  const [signalProgress, setSignalProgress] = useState(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Cancel loop on step change
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    if (currentStep === 0) {
      // Step 0: Start (Idle)
      // Reset everything
      setSignalProgress(0);
      
      // Signal completion immediately for idle steps so the "Next" button enables
      // wrapper in timeout to ensure state is settled
      setTimeout(() => onAnimationComplete?.(), 0);

    } else if (currentStep === 1) {
      // Step 1: Process (Flow Animation)
      // Run the animation
      const startTime = performance.now();
      const duration = 2000; // 2 seconds

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        setSignalProgress(progress);

        if (progress < 1) {
          requestRef.current = requestAnimationFrame(animate);
        } else {
          // Animation done
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      };
      
      requestRef.current = requestAnimationFrame(animate);
      
    } else {
        // Step 2+: Finished
        setSignalProgress(1); // Keep it at end
        setTimeout(() => onAnimationComplete?.(), 0);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentStep, dispatch]); // Not including onAnimationComplete in deps to avoid loops if it changes

  return {
    currentStep,
    signalProgress,
  };
};
`;

fs.writeFileSync(path.join(targetDir, `use${pascalName}Animation.ts`), hookContent);

// 3. Main Component
const mainComponentContent = `import React, { useMemo } from 'react';
import './main.scss';
import { use${pascalName}Animation } from './use${pascalName}Animation';
import { viz, VizCanvas } from '../../viz-kit';

interface ${pascalName}VisualizationProps {
  onAnimationComplete?: () => void;
}

const ${pascalName}Visualization: React.FC<${pascalName}VisualizationProps> = ({
  onAnimationComplete,
}) => {
  const { currentStep, signalProgress } = use${pascalName}Animation(onAnimationComplete);

  const scene = useMemo(() => {
    const width = 800;
    const height = 600;
    
    // Create a new visualization builder
    const b = viz().view(width, height);

    // Node 1 (Start)
    b.node('node-1')
        .at(250, 300)
        .circle(40)
        .label('Start')
        .class('node-start');

    // Node 2 (End)
    b.node('node-2')
        .at(550, 300)
        .circle(40)
        .label('End')
        .class('node-end');

    // Edge
    const edge = b.edge('node-1', 'node-2', 'edge-1')
        .label('Flow')
        .arrow(true);
    
    // Always show idle animation
    edge.animate('flow', { duration: '2s' });

    // Signal Overlay (The Ball)
    // Show ball if we are processing (step 1) or finished (step 2)
    if (currentStep === 1 || currentStep === 2) {
        b.overlay('signal', {
            from: 'node-1',
            to: 'node-2',
            progress: signalProgress,
            magnitude: 1, 
        }, 'signal-1');
    }

    return b.build();
  }, [currentStep, signalProgress]);

  return (
    <div className="${pluginName}-visualization">
       <div className="canvas-wrapper">
          <VizCanvas scene={scene} className="${pluginName}-canvas" />
       </div>
       <div className="info-panel">
          <h3>${pascalName} Status</h3>
          <p>Global Step: {currentStep}</p>
          <p>Progress: {(signalProgress * 100).toFixed(0)}%</p>
       </div>
    </div>
  );
};

export default ${pascalName}Visualization;
`;

fs.writeFileSync(path.join(targetDir, 'main.tsx'), mainComponentContent);

// 4. SCSS
const scssContent = `.${pluginName}-visualization {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  
  .canvas-wrapper {
    width: 100%;
    flex: 1;
    min-height: 400px;
  }

  .info-panel {
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin: 1rem;
    min-width: 200px;
  }
}

// Viz Styles
.${pluginName}-canvas {
    .node-start circle {
        fill: #3b82f6; // Blue
        stroke: #1d4ed8;
    }
    
    .node-end circle {
        fill: #10b981; // Green
        stroke: #047857;
    }

    .viz-edge {
        stroke: #cbd5e1;
        stroke-width: 2px;
    }
}
`;

fs.writeFileSync(path.join(targetDir, 'main.scss'), scssContent);

// 5. Index
const indexContent = `import type { DemoPlugin } from '../../types/ModelPlugin';
import ${camelName}Reducer, { type ${pascalName}State, initialState } from './${camelName}Slice';
import ${pascalName}Visualization from './main';
import type { Action, Dispatch } from '@reduxjs/toolkit';

type LocalRootState = { ${camelName}: ${pascalName}State };

const ${pascalName}Plugin: DemoPlugin<${pascalName}State, Action, LocalRootState, Dispatch<Action>> = {
  id: '${pluginName}',
  name: '${pascalName}',
  description: 'Description for ${pascalName} demo.',
  initialState,
  reducer: ${camelName}Reducer,
  Component: ${pascalName}Visualization,
  getSteps: (state: ${pascalName}State) => {
    return [
        { 
            label: 'Start (Idle)', 
            autoAdvance: false,
        },
        { 
            label: 'Process (Flow)', 
            autoAdvance: true,
        },
        {
            label: 'Finished',
            autoAdvance: true,
        }
    ];
  },
  init: (dispatch) => {
    // Init logic
  },
  selector: (state: LocalRootState) => state.${camelName},
};

export default ${pascalName}Plugin;
`;

fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent);


// 6. Update App.tsx
const appPath = path.join(__dirname, '../src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');

// 6a. Add Import
const importStatement = `import ${pascalName}Plugin from './plugins/${pluginName}';`;
// Insert usage of the new plugin after the last plugin import
const lastImportRegex = /import .*Plugin from '.\/plugins\/.*';/g;
let match;
let lastImportIndex = -1;
while ((match = lastImportRegex.exec(appContent)) !== null) {
  lastImportIndex = match.index + match[0].length;
}

if (lastImportIndex !== -1) {
  appContent =
    appContent.slice(0, lastImportIndex) +
    '\n' + importStatement +
    appContent.slice(lastImportIndex);
} else {
  // Fallback: try to add after the last import line
  const lastAnyImportRegex = /import .* from .*/g;
  while ((match = lastAnyImportRegex.exec(appContent)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }
  if (lastImportIndex !== -1) {
    appContent =
      appContent.slice(0, lastImportIndex) +
      '\n' + importStatement +
      appContent.slice(lastImportIndex);
  }
}

// 6b. Add Option
const humanName = pascalName.replace(/([A-Z])/g, ' $1').trim();
const optionElement = `        <option value="${pluginName}">${humanName}</option>`;
const selectEndTag = '</select>';
const selectIndex = appContent.indexOf(selectEndTag);

if (selectIndex !== -1) {
  appContent =
    appContent.slice(0, selectIndex) +
    optionElement + '\n' +
    '      ' +
    appContent.slice(selectIndex);
}

// 6c. Add Route
const routeElement = `        <Route path="/${pluginName}" element={<Shell plugin={${pascalName}Plugin} />} />`;
const routesEndTag = '</Routes>';
const routesIndex = appContent.indexOf(routesEndTag);

if (routesIndex !== -1) {
  appContent =
    appContent.slice(0, routesIndex) +
    routeElement + '\n' +
    '      ' +
    appContent.slice(routesIndex);
}

fs.writeFileSync(appPath, appContent);
console.log('Updated src/App.tsx with new plugin routes');

// 7. Update store.ts
const storePath = path.join(__dirname, '../src/store/store.ts');
if (fs.existsSync(storePath)) {
  let storeContent = fs.readFileSync(storePath, 'utf-8');

  // 7a. Add Import
  const storeImportStatement = `import ${pascalName}Plugin from '../plugins/${pluginName}';`;
  const lastStoreImportRegex = /import .*Plugin from '..\/plugins\/.*';/g;
  let match;
  let lastStoreImportIndex = -1;
  while ((match = lastStoreImportRegex.exec(storeContent)) !== null) {
    lastStoreImportIndex = match.index + match[0].length;
  }

  if (lastStoreImportIndex !== -1) {
    storeContent =
      storeContent.slice(0, lastStoreImportIndex) +
      '\n' + storeImportStatement +
      storeContent.slice(lastStoreImportIndex);
  } else {
    // Fallback
    const lastAnyImport = /import .* from .*/g;
    while ((match = lastAnyImport.exec(storeContent)) !== null) {
      lastStoreImportIndex = match.index + match[0].length;
    }
    if (lastStoreImportIndex !== -1) {
      storeContent =
        storeContent.slice(0, lastStoreImportIndex) +
        '\n' + storeImportStatement +
        storeContent.slice(lastStoreImportIndex);
    }
  }

  // 7b. Add to Reducer
  const reducerLine = `    ${camelName}: ${pascalName}Plugin.reducer,`;
  const reducerStartRegex = /reducer:\s*\{/;
  const reducerMatch = reducerStartRegex.exec(storeContent);

  if (reducerMatch) {
    const insertIndex = reducerMatch.index + reducerMatch[0].length;
    storeContent =
      storeContent.slice(0, insertIndex) +
      '\n' + reducerLine +
      storeContent.slice(insertIndex);
  }

  fs.writeFileSync(storePath, storeContent);
  console.log('Updated src/store/store.ts with new plugin reducer');
}

console.log('Successfully created plugin "' + pluginName + '" in src/plugins/' + pluginName);
