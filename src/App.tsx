import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.scss'
import Shell from './components/Shell';
import AnnPlugin from './plugins/ann';
import DecisionTreePlugin from './plugins/decision-tree';




function PluginSwitcher() {
  const navigate = useNavigate();
  // Simple way to get current plugin from URL for init state of selector 
  const currentPath = window.location.pathname.replace('/', '') || 'ann'; 

  return (
    <div className="plugin-switcher" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000, background: 'white', padding: '0.5rem', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <select 
        value={currentPath}
        onChange={(e) => navigate(`/${e.target.value}`)}
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
      >
        <option value="ann">Neural Network</option>
        <option value="decision-tree">Decision Tree</option>
      </select>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PluginSwitcher />
      <Routes>
        <Route path="/" element={<Navigate to="/ann" replace />} />
        <Route path="/ann" element={<Shell plugin={AnnPlugin} />} />
        <Route path="/decision-tree" element={<Shell plugin={DecisionTreePlugin} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
