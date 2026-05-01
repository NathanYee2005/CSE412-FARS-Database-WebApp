import express from "express";
import cors from "cors";
import multer from "multer";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

const execFileP = promisify(execFile);

const app = express();
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: "/tmp" });

function parseIntParam(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildCrashFilter(query) {
  const conditions = [];
  const values = [];
  let idx = 1;

  const addInt = (col, val, table = "c") => {
    const n = parseIntParam(val, null);
    if (n !== null) {
      conditions.push(`${table}.${col} = $${idx++}`);
      values.push(n);
    }
  };

  addInt("year", query.year);
  addInt("month", query.month);
  addInt("weather", query.weather);
  addInt("lgt_cond", query.lgt_cond);
  addInt("wrk_zone", query.wrk_zone);
  addInt("state", query.state, "l");

  const minF = parseIntParam(query.min_fatals, null);
  const maxF = parseIntParam(query.max_fatals, null);
  if (minF !== null) { conditions.push(`c.fatals >= $${idx++}`); values.push(minF); }
  if (maxF !== null) { conditions.push(`c.fatals <= $${idx++}`); values.push(maxF); }

  return { conditions, values, idx };
}

// GET /api/crashes capped at 1000 for table in frontend
app.get("/api/crashes", async (req, res) => {
  const limit = Math.min(parseIntParam(req.query.limit, 500), 1000);
  const offset = parseIntParam(req.query.offset, 0);

  const filter = buildCrashFilter(req.query);
  const where = filter.conditions.length ? "WHERE " + filter.conditions.join(" AND ") : "";
  let idx = filter.idx;

  const dataQuery = `
    SELECT
      c.st_case, c.year, c.month, c.day,
      c.fatals, c.persons, c.ve_total,
      c.weather, c.lgt_cond, c.wrk_zone,
      c.latitude, c.longitude,
      l.state, l.county, l.city
    FROM Crash c
    LEFT JOIN Location l ON c.latitude = l.latitude AND c.longitude = l.longitude
    ${where}
    ORDER BY c.fatals DESC, c.st_case ASC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM Crash c
    LEFT JOIN Location l ON c.latitude = l.latitude AND c.longitude = l.longitude
    ${where}
  `;

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...filter.values, limit, offset]),
      pool.query(countQuery, filter.values),
    ]);
    res.json({
      crashes: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/crashes/heatmap not capped for correct heatmap rendering
app.get("/api/crashes/heatmap", async (req, res) => {
  const filter = buildCrashFilter(req.query);
  const allConditions = [
    ...filter.conditions,
    "c.latitude IS NOT NULL",
    "c.longitude IS NOT NULL",
  ];
  const where = "WHERE " + allConditions.join(" AND ");

  const sql = `
    SELECT c.latitude, c.longitude, c.fatals
    FROM Crash c
    LEFT JOIN Location l ON c.latitude = l.latitude AND c.longitude = l.longitude
    ${where}
  `;

  try {
    const result = await pool.query(sql, filter.values);
    res.json({ points: result.rows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

function getPgEnv() {
  const url = new URL(process.env.DATABASE_URL);
  return {
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: url.pathname.replace(/^\//, ""),
  };
}

// Pulls "  Location     39185" lines out of load_db.py's stdout into a {table: count} map.
function parseInsertOutput(stdout) {
  const inserted = {};
  for (const line of stdout.split("\n")) {
    const m = line.match(/^\s{2,}(\w+)\s+(\d+)/);
    if (m) inserted[m[1]] = parseInt(m[2], 10);
  }
  return inserted;
}

// POST /api/upload — delegates to scripts/load_db.py (avoids duplicating loader logic)
app.post(
  "/api/upload",
  upload.fields([
    { name: "accident", maxCount: 1 },
    { name: "vehicle",  maxCount: 1 },
    { name: "person",   maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files ?? {};
    const sources = {
      accident: files.accident?.[0]?.path,
      vehicle:  files.vehicle?.[0]?.path,
      person:   files.person?.[0]?.path,
    };

    if (!sources.accident || !sources.vehicle || !sources.person) {
      Object.values(sources).forEach((p) => p && fs.existsSync(p) && fs.unlinkSync(p));
      return res.status(400).json({
        message: "All three CSVs required: accident, vehicle, person",
      });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fars-upload-"));
    try {
      for (const [name, src] of Object.entries(sources)) {
        fs.renameSync(src, path.join(tmpDir, `${name}.csv`));
      }
      const { stdout } = await execFileP(
        "python3",
        ["scripts/load_db.py", "--csv-dir", tmpDir, "--no-schema"],
        { env: { ...process.env, ...getPgEnv() }, maxBuffer: 50 * 1024 * 1024 }
      );
      res.json({ inserted: parseInsertOutput(stdout) });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({
        message: "Upload failed",
        error: (err.stderr || err.message || "").toString(),
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
);

app.listen(3001, () => console.log("API running on http://localhost:3001"));
