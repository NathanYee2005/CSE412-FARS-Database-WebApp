import CrashMap from './components/CrashMap.jsx';

const navBtnStyle = {
  position: 'fixed',
  top: '1rem',
  right: '1rem',
  zIndex: 1000,
  padding: '0.5rem 1rem',
  backgroundColor: '#1d4ed8',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '0.875rem',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
};

export default function App() {
  return (
    <>
      <a href="/index.html">
        <button style={navBtnStyle}>→ Crash Explorer</button>
      </a>
      <header>
        <h1>FARS Crash Heatmap</h1>
      </header>
      <CrashMap />
    </>
  );
}
