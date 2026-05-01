import { useState } from "react";
import styles from "./CrashFilters.module.css";

const WEATHER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "Clear" },
  { value: "2", label: "Rain" }
];

const LIGHT_COND_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "Daylight" },
  { value: "2", label: "Dark" }
];

const MONTH_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DEFAULT_FILTERS = {
  year: "",
  month: "",
  weather: "",
  lgt_cond: "",
  min_fatals: "",
  max_fatals: "",
  wrk_zone: "",
  state: "",
};

export default function CrashFilters({ onSearch, loading }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    );
    onSearch(clean);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onSearch({});
  };

  return (
    <div className={styles.filterCard}>
      <div className={styles.filterHeader} onClick={() => setExpanded((p) => !p)}>
        <div className={styles.filterTitle}>
          <span className={styles.filterIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          Filter Crashes
        </div>
        <span className={`${styles.chevron} ${expanded ? styles.chevronUp : ""}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className={styles.filterForm}>
          <div className={styles.filterGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Year</label>
              <input
                type="number"
                name="year"
                className={styles.input}
                placeholder="e.g. 2022"
                min="1975"
                max="2023"
                value={filters.year}
                onChange={handleChange}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Month</label>
              <select name="month" className={styles.select} value={filters.month} onChange={handleChange}>
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Weather</label>
              <select name="weather" className={styles.select} value={filters.weather} onChange={handleChange}>
                {WEATHER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Light Condition</label>
              <select name="lgt_cond" className={styles.select} value={filters.lgt_cond} onChange={handleChange}>
                {LIGHT_COND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Min Fatalities</label>
              <input
                type="number"
                name="min_fatals"
                className={styles.input}
                placeholder="0"
                min="0"
                value={filters.min_fatals}
                onChange={handleChange}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Max Fatalities</label>
              <input
                type="number"
                name="max_fatals"
                className={styles.input}
                placeholder="Any"
                min="0"
                value={filters.max_fatals}
                onChange={handleChange}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Work Zone</label>
              <select name="wrk_zone" className={styles.select} value={filters.wrk_zone} onChange={handleChange}>
                <option value="">Any</option>
                <option value="0">No Work Zone</option>
                <option value="1">Construction</option>
                <option value="2">Maintenance</option>
                <option value="3">Utility</option>
                <option value="4">Unknown</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>State Code</label>
              <input
                type="number"
                name="state"
                className={styles.input}
                placeholder="e.g. 6 (CA)"
                min="1"
                max="56"
                value={filters.state}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.resetBtn} onClick={handleReset}>
              Clear
            </button>
            <button type="submit" className={styles.searchBtn} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Search Crashes
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
