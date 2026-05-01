import { useState, useCallback } from "react";
import CrashFilters from "./CrashFilters";
import CrashTable from "./CrashTable";

export default function CrashExplorer({ apiBase = "/api" }) {
  const [crashes, setCrashes] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(
    async (filters) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${apiBase}/crashes?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Server error ${res.status}`);
        }
        const data = await res.json();
        setCrashes(data.crashes ?? data);
        setTotal(data.total ?? null);
      } catch (err) {
        setError(err.message || "Failed to fetch crash data.");
        setCrashes([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBase]
  );

  return (
    <div>
      <div>
        <h1>Crash Explorer</h1>
        <p>Fatality Analysis Reporting System — filter and explore fatal crash records</p>
      </div>
      <CrashFilters onSearch={handleSearch} loading={loading} />
      <CrashTable crashes={crashes} loading={loading} error={error} total={total} />
    </div>
  );
}
