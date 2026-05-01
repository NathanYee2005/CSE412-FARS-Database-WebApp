import { useState } from "react";
import styles from "./CrashFilters.module.css";

const WEATHER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "Clear" },
  { value: "2", label: "Rain" },
  { value: "3", label: "Sleet or Hail" },
  { value: "4", label: "Snow" },
  { value: "5", label: "Fog, Smog, Smoke" },
  { value: "6", label: "Severe Crosswinds" },
  { value: "7", label: "Blowing Sand, Soil, Dirt" },
  { value: "8", label: "Other" },
  { value: "10", label: "Cloudy" },
  { value: "11", label: "Blowing Snow" },
  { value: "12", label: "Freezing Rain or Drizzle" },
  { value: "98", label: "Not Reported" },
  { value: "99", label: "Reported as Unknown" },
];

const LIGHT_COND_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "Daylight" },
  { value: "2", label: "Dark - Not Lighted" },
  { value: "3", label: "Dark - Lighted" },
  { value: "4", label: "Dawn" },
  { value: "5", label: "Dusk" },
  { value: "6", label: "Dark - Unknown Lighting" },
  { value: "7", label: "Other" },
  { value: "8", label: "Not Reported" },
  { value: "9", label: "Reported as Unknown" },
];

const STATE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "Alabama" },
  { value: "2", label: "Alaska" },
  { value: "4", label: "Arizona" },
  { value: "5", label: "Arkansas" },
  { value: "6", label: "California" },
  { value: "8", label: "Colorado" },
  { value: "9", label: "Connecticut" },
  { value: "10", label: "Delaware" },
  { value: "11", label: "District of Columbia" },
  { value: "12", label: "Florida" },
  { value: "13", label: "Georgia" },
  { value: "15", label: "Hawaii" },
  { value: "16", label: "Idaho" },
  { value: "17", label: "Illinois" },
  { value: "18", label: "Indiana" },
  { value: "19", label: "Iowa" },
  { value: "20", label: "Kansas" },
  { value: "21", label: "Kentucky" },
  { value: "22", label: "Louisiana" },
  { value: "23", label: "Maine" },
  { value: "24", label: "Maryland" },
  { value: "25", label: "Massachusetts" },
  { value: "26", label: "Michigan" },
  { value: "27", label: "Minnesota" },
  { value: "28", label: "Mississippi" },
  { value: "29", label: "Missouri" },
  { value: "30", label: "Montana" },
  { value: "31", label: "Nebraska" },
  { value: "32", label: "Nevada" },
  { value: "33", label: "New Hampshire" },
  { value: "34", label: "New Jersey" },
  { value: "35", label: "New Mexico" },
  { value: "36", label: "New York" },
  { value: "37", label: "North Carolina" },
  { value: "38", label: "North Dakota" },
  { value: "39", label: "Ohio" },
  { value: "40", label: "Oklahoma" },
  { value: "41", label: "Oregon" },
  { value: "42", label: "Pennsylvania" },
  { value: "44", label: "Rhode Island" },
  { value: "45", label: "South Carolina" },
  { value: "46", label: "South Dakota" },
  { value: "47", label: "Tennessee" },
  { value: "48", label: "Texas" },
  { value: "49", label: "Utah" },
  { value: "50", label: "Vermont" },
  { value: "51", label: "Virginia" },
  { value: "53", label: "Washington" },
  { value: "54", label: "West Virginia" },
  { value: "55", label: "Wisconsin" },
  { value: "56", label: "Wyoming" },
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
                max="2024"
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
                <option value="4">Work Zone, Type Unknown</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>State</label>
              <select name="state" className={styles.select} value={filters.state} onChange={handleChange}>
                {STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
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
