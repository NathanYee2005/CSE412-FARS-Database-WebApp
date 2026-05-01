import { useState, useMemo, useEffect } from "react";

const WEATHER_MAP = {
  1: "Clear", 2: "Rain"
};

const LIGHT_MAP = {
  1: "Daylight", 2: "Dark"
};

const MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COLUMNS = [
  { key: "st_case",   label: "Case #",      sortable: true  },
  { key: "date",      label: "Date",        sortable: true  },
  { key: "fatals",    label: "Fatalities",  sortable: true  },
  { key: "persons",   label: "Persons",     sortable: true  },
  { key: "ve_total",  label: "Vehicles",    sortable: true  },
  { key: "weather",   label: "Weather",     sortable: false },
  { key: "lgt_cond",  label: "Light",       sortable: false },
  { key: "state",     label: "State",       sortable: true  },
  { key: "location",  label: "Location",    sortable: false },
];

export default function CrashTable({ crashes, loading, error, total }) {
  const [sortKey, setSortKey] = useState("fatals");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [crashes]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!crashes?.length) return [];
    return [...crashes].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (sortKey === "date") {
        aVal = (a.year ?? 0) * 10000 + (a.month ?? 0) * 100 + (a.day ?? 0);
        bVal = (b.year ?? 0) * 10000 + (b.month ?? 0) * 100 + (b.day ?? 0);
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [crashes, sortKey, sortDir]);

  const pageCount = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Searching crash records…</p>;

  if (error) return <p>Error: {error}</p>;

  if (!crashes) {
    return (
      <p>Apply filters to explore crash data. Use the filters above to search across the FARS dataset.</p>
    );
  }

  if (crashes.length === 0) {
    return <p>No crashes found. Try adjusting your filters to broaden the search.</p>;
  }

  return (
    <div>
      <div>
        <span>
          {total != null ? total.toLocaleString() : sorted.length.toLocaleString()} results
          {total != null && total > crashes.length && (
            <span> (showing first {crashes.length.toLocaleString()})</span>
          )}
        </span>
        <span>
          {" "}Sorted by <strong>{COLUMNS.find(c => c.key === sortKey)?.label}</strong> ({sortDir === "asc" ? "ascending" : "descending"})
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="4" cellSpacing="0">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{ cursor: col.sortable ? "pointer" : "default" }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((crash) => (
              <tr key={crash.st_case}>
                <td>{crash.st_case}</td>
                <td>
                  {crash.month && crash.day && crash.year
                    ? `${MONTH_ABBR[crash.month]} ${crash.day}, ${crash.year}`
                    : crash.year ?? "—"}
                </td>
                <td>{crash.fatals ?? 0}</td>
                <td>{crash.persons ?? "—"}</td>
                <td>{crash.ve_total ?? "—"}</td>
                <td>{WEATHER_MAP[crash.weather] ?? "Unknown"}</td>
                <td>{LIGHT_MAP[crash.lgt_cond] ?? "Unknown"}</td>
                <td>{crash.state ?? "—"}</td>
                <td>
                  {crash.latitude != null && crash.longitude != null
                    ? `${Number(crash.latitude).toFixed(4)}, ${Number(crash.longitude).toFixed(4)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span> Page {page} of {pageCount} </span>
          <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
