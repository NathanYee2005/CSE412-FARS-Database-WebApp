import { useState } from "react";
import styles from "./AdminUpload.module.css";

const FILE_FIELDS = [
  { name: "accident", label: "Accident CSV", hint: "accident.csv" },
  { name: "vehicle",  label: "Vehicle CSV",  hint: "vehicle.csv"  },
  { name: "person",   label: "Person CSV",   hint: "person.csv"   },
];

export default function AdminUpload() {
  const [files, setFiles] = useState({ accident: null, vehicle: null, person: null });
  const [status, setStatus] = useState(null); // null | "loading" | { error } | { inserted }

  const allSelected = FILE_FIELDS.every(({ name }) => files[name]);

  function handleFile(field, e) {
    setFiles((prev) => ({ ...prev, [field]: e.target.files[0] ?? null }));
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const body = new FormData();
    for (const { name } of FILE_FIELDS) body.append(name, files[name]);

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) setStatus({ error: json.message ?? "Upload failed" });
      else setStatus({ inserted: json.inserted });
    } catch {
      setStatus({ error: "Network error — is the server running?" });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.badge}>FARS</div>
          <div>
            <h1 className={styles.title}>Admin Upload</h1>
            <p className={styles.subtitle}>Load FARS CSV data into the database</p>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Upload FARS Files</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.fields}>
              {FILE_FIELDS.map(({ name, label, hint }) => (
                <div key={name} className={styles.field}>
                  <label className={styles.label} htmlFor={`file-${name}`}>
                    {label} <span className={styles.labelHint}>({hint})</span>
                  </label>
                  <input
                    id={`file-${name}`}
                    type="file"
                    accept=".csv"
                    required
                    className={`${styles.fileInput} ${files[name] ? styles.fileInputReady : ""}`}
                    onChange={(e) => handleFile(name, e)}
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!allSelected || status === "loading"}
            >
              {status === "loading" ? "Uploading…" : "Upload"}
            </button>
          </form>

          {status === "loading" && (
            <div className={`${styles.status} ${styles.statusLoading}`}>
              <div className={styles.statusTitle}>Processing…</div>
              Parsing CSVs and inserting into the database. This may take a moment.
            </div>
          )}

          {status?.error && (
            <div className={`${styles.status} ${styles.statusError}`}>
              <div className={styles.statusTitle}>Upload failed</div>
              {status.error}
            </div>
          )}

          {status?.inserted && (
            <div className={`${styles.status} ${styles.statusSuccess}`}>
              <div className={styles.statusTitle}>Upload complete</div>
              <table className={styles.resultTable}>
                <thead>
                  <tr><th>Table</th><th>Rows inserted</th></tr>
                </thead>
                <tbody>
                  {Object.entries(status.inserted).map(([table, count]) => (
                    <tr key={table}>
                      <td>{table}</td>
                      <td>{count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
