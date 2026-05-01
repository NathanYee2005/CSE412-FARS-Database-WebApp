import { useState, useCallback } from "react";
import CrashFilters from "./CrashFilters";
import CrashTable from "./CrashTable";
import CrashMap from "./components/CrashMap";
import styles from "./CrashExplorer.module.css";

//Top-level page component that connects the filter form to the results table.
export default function CrashExplorer({ apiBase = "/api" }) {
  const [crashes, setCrashes] = useState(null);
  const [heatPoints, setHeatPoints] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(
    async (filters) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(filters);
        const [tableRes, heatRes] = await Promise.all([
          fetch(`${apiBase}/crashes?${params.toString()}`),
          fetch(`${apiBase}/crashes/heatmap?${params.toString()}`),
        ]);
        if (!tableRes.ok) {
          const body = await tableRes.json().catch(() => ({}));
          throw new Error(body.message ?? `Server error ${tableRes.status}`);
        }
        if (!heatRes.ok) {
          const body = await heatRes.json().catch(() => ({}));
          throw new Error(body.message ?? `Heatmap error ${heatRes.status}`);
        }
        const tableData = await tableRes.json();
        const heatData = await heatRes.json();
        setCrashes(tableData.crashes ?? tableData);
        setTotal(tableData.total ?? null);
        setHeatPoints(heatData.points ?? []);
      } catch (err) {
        setError(err.message || "Failed to fetch crash data.");
        setCrashes([]);
        setHeatPoints([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBase]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.badge}>FARS</div>
          <div>
            <h1 className={styles.title}>Crash Explorer</h1>
            <p className={styles.subtitle}>
              Fatality Analysis Reporting System — filter and explore fatal crash records
            </p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <CrashFilters onSearch={handleSearch} loading={loading} />
        <CrashMap crashes={heatPoints} />
        <CrashTable
          crashes={crashes}
          loading={loading}
          error={error}
          total={total}
        />
      </div>
    </div>
  );
}
