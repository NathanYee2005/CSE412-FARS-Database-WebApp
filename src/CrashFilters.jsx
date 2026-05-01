import { useState } from "react";

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
    <div>
      <div onClick={() => setExpanded((p) => !p)} style={{ cursor: "pointer" }}>
        <strong>Filter Crashes</strong> {expanded ? "▲" : "▼"}
      </div>

      {expanded && (
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              Year
              <input
                type="number"
                name="year"
                placeholder="e.g. 2022"
                min="1975"
                max="2023"
                value={filters.year}
                onChange={handleChange}
              />
            </label>

            <label>
              Month
              <select name="month" value={filters.month} onChange={handleChange}>
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label>
              Weather
              <select name="weather" value={filters.weather} onChange={handleChange}>
                {WEATHER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label>
              Light Condition
              <select name="lgt_cond" value={filters.lgt_cond} onChange={handleChange}>
                {LIGHT_COND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label>
              Min Fatalities
              <input
                type="number"
                name="min_fatals"
                placeholder="0"
                min="0"
                value={filters.min_fatals}
                onChange={handleChange}
              />
            </label>

            <label>
              Max Fatalities
              <input
                type="number"
                name="max_fatals"
                placeholder="Any"
                min="0"
                value={filters.max_fatals}
                onChange={handleChange}
              />
            </label>

            <label>
              Work Zone
              <select name="wrk_zone" value={filters.wrk_zone} onChange={handleChange}>
                <option value="">Any</option>
                <option value="0">No Work Zone</option>
                <option value="1">Construction</option>
                <option value="2">Maintenance</option>
                <option value="3">Utility</option>
                <option value="4">Unknown</option>
              </select>
            </label>

            <label>
              State Code
              <input
                type="number"
                name="state"
                placeholder="e.g. 6 (CA)"
                min="1"
                max="56"
                value={filters.state}
                onChange={handleChange}
              />
            </label>
          </div>

          <div>
            <button type="button" onClick={handleReset}>Clear</button>
            <button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search Crashes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
