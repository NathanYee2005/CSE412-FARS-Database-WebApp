import express from "express";
import cors from "cors";
import multer from "multer";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: "/tmp" });

function parseIntParam(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/crashes
app.get("/api/crashes", async (req, res) => {
  const {
    year, month, weather, lgt_cond,
    min_fatals, max_fatals, wrk_zone, state,
    limit: rawLimit = "500",
    offset: rawOffset = "0",
  } = req.query;

  const limit = Math.min(parseIntParam(rawLimit, 500), 1000);
  const offset = parseIntParam(rawOffset, 0);

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

  addInt("year", year);
  addInt("month", month);
  addInt("weather", weather);
  addInt("lgt_cond", lgt_cond);
  addInt("wrk_zone", wrk_zone);
  addInt("state", state, "l");

  const minF = parseIntParam(min_fatals, null);
  const maxF = parseIntParam(max_fatals, null);
  if (minF !== null) { conditions.push(`c.fatals >= $${idx++}`); values.push(minF); }
  if (maxF !== null) { conditions.push(`c.fatals <= $${idx++}`); values.push(maxF); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

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
      pool.query(dataQuery, [...values, limit, offset]),
      pool.query(countQuery, values),
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

// POST /api/upload — multipart form, field name "file", expects FARS accident.csv
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const rows = parse(fs.readFileSync(tmpPath), {
      columns: true,
      skip_empty_lines: true,
    });

    let inserted = 0;
    for (const row of rows) {
      await pool.query(
        `INSERT INTO Location (latitude, longitude, state)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [row.LATITUDE, row.LONGITUD, row.STATE]
      );
      await pool.query(
        `INSERT INTO Crash (st_case, year, month, day, fatals, weather, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (st_case) DO NOTHING`,
        [row.ST_CASE, row.YEAR, row.MONTH, row.DAY, row.FATALS, row.WEATHER, row.LATITUDE, row.LONGITUD]
      );
      inserted++;
    }

    res.json({ inserted });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  } finally {
    // Always clean up the temp file whether the upload succeeded or failed
    if (tmpPath && fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
});

// GET /admin — basic CSV upload page
app.get("/admin", (_req, res) => {
  res.send(`
    <h1>FARS Admin Upload</h1>
    <form method="POST" action="/api/upload" enctype="multipart/form-data">
      <input type="file" name="file" accept=".csv" required>
      <button type="submit">Upload</button>
    </form>
  `);
});

app.listen(3001, () => console.log("API running on http://localhost:3001"));
