import { useState } from "react";
import CrashExplorer from "./CrashExplorer";
import AdminUpload from "./AdminUpload";

const NAV_STYLE = {
  display: "flex",
  gap: "8px",
  padding: "8px 1.5rem",
  background: "#f1f5f9",
  borderBottom: "1px solid #e5e7eb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

const tabStyle = (active) => ({
  padding: "6px 16px",
  borderRadius: "6px",
  border: "none",
  fontSize: "13px",
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  background: active ? "#1e3a8a" : "transparent",
  color: active ? "#fff" : "#374151",
});

export default function App() {
  const [view, setView] = useState("explorer");
  return (
    <>
      <nav style={NAV_STYLE}>
        <button style={tabStyle(view === "explorer")} onClick={() => setView("explorer")}>
          Explorer
        </button>
        <button style={tabStyle(view === "admin")} onClick={() => setView("admin")}>
          Admin Upload
        </button>
      </nav>
      {view === "explorer" ? <CrashExplorer apiBase="/api" /> : <AdminUpload />}
    </>
  );
}
