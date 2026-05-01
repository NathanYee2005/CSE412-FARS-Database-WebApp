import { useState, useMemo, useEffect } from "react";
import styles from "./CrashTable.module.css";

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

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={styles.sortIconNeutral}>
        <path d="M5 2L7.5 5H2.5L5 2Z" fill="currentColor" opacity="0.3"/>
        <path d="M5 8L2.5 5H7.5L5 8Z" fill="currentColor" opacity="0.3"/>
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={styles.sortIconActive}>
      {direction === "asc"
        ? <path d="M5 2L7.5 6H2.5L5 2Z" fill="currentColor"/>
        : <path d="M5 8L2.5 4H7.5L5 8Z" fill="currentColor"/>
      }
    </svg>
  );
}

function FatalBadge({ count }) {
  if (count === 0) return <span className={styles.badgeGray}>0</span>;
  if (count === 1) return <span className={styles.badgeAmber}>{count}</span>;
  return <span className={styles.badgeRed}>{count}</span>;
}

export default function CrashTable({ crashes, loading, error, total }) {
  const [sortKey, setSortKey] = useState("fatals");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reset to page 1 whenever a new set of results comes in
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

  if (loading) {
    return (
      <div className={styles.state}>
        <div className={styles.loadingSpinner} />
        <p className={styles.stateText}>Searching crash records…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.state}>
        <div className={styles.errorIcon}>!</div>
        <p className={styles.stateText}>{error}</p>
      </div>
    );
  }

  if (!crashes) {
    return (
      <div className={styles.emptyState}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={styles.emptyIcon}>
          <rect x="6" y="10" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 16h28" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M13 24h14M13 28h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className={styles.emptyTitle}>Apply filters to explore crash data</p>
        <p className={styles.emptySubtitle}>Use the filters above to search across the FARS dataset.</p>
      </div>
    );
  }

  if (crashes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={styles.emptyIcon}>
          <circle cx="18" cy="18" r="11" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M27 27L35 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M14 18h8M18 14v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className={styles.emptyTitle}>No crashes found</p>
        <p className={styles.emptySubtitle}>Try adjusting your filters to broaden the search.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableHeader}>
        <span className={styles.resultCount}>
          {total != null ? total.toLocaleString() : sorted.length.toLocaleString()} results
          {total != null && total > crashes.length && (
            <span className={styles.resultNote}> (showing first {crashes.length.toLocaleString()})</span>
          )}
        </span>
        <span className={styles.sortLabel}>
          Sorted by <strong>{COLUMNS.find(c => c.key === sortKey)?.label}</strong> ({sortDir === "asc" ? "ascending" : "descending"})
        </span>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.sortable ? styles.thSortable : ""} ${sortKey === col.key ? styles.thActive : ""}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className={styles.thContent}>
                    {col.label}
                    {col.sortable && (
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((crash, i) => (
              <tr key={crash.st_case} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.td}>
                  <span className={styles.caseNo}>{crash.st_case}</span>
                </td>
                <td className={styles.td}>
                  {crash.month && crash.day && crash.year
                    ? `${MONTH_ABBR[crash.month]} ${crash.day}, ${crash.year}`
                    : crash.year ?? "—"}
                </td>
                <td className={styles.td}>
                  <FatalBadge count={crash.fatals ?? 0} />
                </td>
                <td className={styles.td}>{crash.persons ?? "—"}</td>
                <td className={styles.td}>{crash.ve_total ?? "—"}</td>
                <td className={styles.td}>
                  <span className={styles.pill}>{WEATHER_MAP[crash.weather] ?? "Unknown"}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.pill}>{LIGHT_MAP[crash.lgt_cond] ?? "Unknown"}</span>
                </td>
                <td className={styles.td}>{crash.state ?? "—"}</td>
                <td className={styles.td}>
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
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pageCount}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
