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

//FARS loader to mirror load_db.py in prod
const PLACEHOLDER_VINS = new Set(["999999999999", "888888888888", "000000000000"]);
const SENTINEL_LATS = [77.7777, 88.8888, 99.9999];

const LOCATION_FIELDS = ["COUNTY", "CITY", "STATE", "TYP_INT", "REL_ROAD", "ROUTE"];
const CRASH_FIELDS = ["PEDS", "PERSONS", "DAY", "MONTH", "YEAR", "NOT_HOUR", "ARR_HOUR",
  "VE_TOTAL", "ARR_MIN", "MAN_COLL", "NOT_MIN", "FATALS"];
const VEHICLE_FIELDS = ["MOD_YEAR", "MAKE", "BODY_TYP", "UNITTYPE"];
const INVOLVES_FIELDS = ["NUMOCCS", "ROLLOVER", "TRAV_SP", "IMPACT1", "HIT_RUN",
  "FIRE_EXP", "TOWED", "DEFORMED", "VSPD_LIM"];
const PERSON_FIELDS = ["AGE", "SEX", "INJ_SEV", "HOSPITAL", "DOA"];
const CAR_PERSON_FIELDS = ["EJECTION", "SEAT_POS", "REST_USE"];
const DRIVER_FIELDS = ["DRINKING", "DRUGS"];

const TABLE_COLUMNS = [
  ["Location",   ["LATITUDE", "LONGITUDE", ...LOCATION_FIELDS]],
  ["Crash",      ["ST_CASE", ...CRASH_FIELDS, "LATITUDE", "LONGITUDE", "WEATHER", "LGT_COND", "WRK_ZONE"]],
  ["Vehicle",    ["VIN", "VEH_NO", ...VEHICLE_FIELDS]],
  ["Person",     ["ST_CASE", "PER_NO", ...PERSON_FIELDS]],
  ["Pedestrian", ["PER_NO", "ST_CASE"]],
  ["CarPerson",  ["PER_NO", "ST_CASE", ...CAR_PERSON_FIELDS]],
  ["Passenger",  ["PER_NO", "ST_CASE"]],
  ["Driver",     ["PER_NO", "ST_CASE", ...DRIVER_FIELDS]],
  ["Rides_In",   ["PER_NO", "ST_CASE", "VIN"]],
  ["Involves",   ["ST_CASE", "VIN", ...INVOLVES_FIELDS]],
];

const toInt = (v) => {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const ints = (row, fields) => fields.map((f) => toInt(row[f]));

const isSentinel = (lat) => {
  const v = Math.abs(Number(lat));
  if (!Number.isFinite(v)) return true;
  return SENTINEL_LATS.some((s) => Math.abs(v - s) < 0.001);
};
const resolveVin = (vin, stCase, vehNo) =>
  PLACEHOLDER_VINS.has(vin) ? `UNK${stCase}V${vehNo}` : vin;
const synthPerNo = (vehNo, perNo) => parseInt(vehNo, 10) * 100 + parseInt(perNo, 10);

function readAccidents(rows) {
  const locations = new Map();
  const crashes = [];
  const seen = new Set();
  for (const row of rows) {
    const stCase = row.ST_CASE;
    if (seen.has(stCase)) continue;
    seen.add(stCase);
    const lat = row.LATITUDE, lon = row.LONGITUD;
    const sentinel = isSentinel(lat);
    if (!sentinel) {
      const key = `${lat},${lon}`;
      if (!locations.has(key)) {
        locations.set(key, [toNum(lat), toNum(lon), ...ints(row, LOCATION_FIELDS)]);
      }
    }
    crashes.push([
      toInt(stCase), ...ints(row, CRASH_FIELDS),
      sentinel ? null : toNum(lat), sentinel ? null : toNum(lon),
      ...ints(row, ["WEATHER", "LGT_COND", "WRK_ZONE"]),
    ]);
  }
  return { locations: [...locations.values()], crashes };
}

function readVehicles(rows) {
  const vehicles = new Map();
  const involves = new Map();
  const vinMap = new Map();
  for (const row of rows) {
    const stCase = row.ST_CASE, vehNo = row.VEH_NO;
    const stInt = toInt(stCase);
    const vin = resolveVin(row.VIN, stCase, vehNo);
    vinMap.set(`${stCase}|${vehNo}`, vin);
    if (!vehicles.has(vin)) {
      vehicles.set(vin, [vin, toInt(vehNo), ...ints(row, VEHICLE_FIELDS)]);
    }
    const ik = `${stInt}|${vin}`;
    if (!involves.has(ik)) {
      involves.set(ik, [stInt, vin, ...ints(row, INVOLVES_FIELDS)]);
    }
  }
  return { vehicles: [...vehicles.values()], involves: [...involves.values()], vinMap };
}

function readPersons(rows, vinMap) {
  const persons = new Map(), peds = new Map(), carPeople = new Map();
  const passengers = new Map(), drivers = new Map(), ridesIn = new Map();
  for (const row of rows) {
    const stCase = row.ST_CASE, vehNo = row.VEH_NO, perType = row.PER_TYP;
    const stInt = toInt(stCase);
    const perNo = synthPerNo(vehNo, row.PER_NO);
    const key = `${perNo}|${stInt}`;
    if (!persons.has(key)) {
      persons.set(key, [stInt, perNo, ...ints(row, PERSON_FIELDS)]);
    }
    if (perType === "1" || perType === "2") {
      if (!carPeople.has(key)) {
        carPeople.set(key, [perNo, stInt, ...ints(row, CAR_PERSON_FIELDS)]);
      }
      const vin = vinMap.get(`${stCase}|${vehNo}`);
      if (vin && !ridesIn.has(key)) {
        ridesIn.set(key, [perNo, stInt, vin]);
      }
      if (perType === "1") {
        if (!drivers.has(key)) drivers.set(key, [perNo, stInt, ...ints(row, DRIVER_FIELDS)]);
      } else {
        if (!passengers.has(key)) passengers.set(key, [perNo, stInt]);
      }
    } else if (perType === "5" || perType === "6") {
      if (!peds.has(key)) peds.set(key, [perNo, stInt]);
    }
  }
  return {
    persons: [...persons.values()],
    peds: [...peds.values()],
    carPeople: [...carPeople.values()],
    passengers: [...passengers.values()],
    drivers: [...drivers.values()],
    ridesIn: [...ridesIn.values()],
  };
}

async function bulkInsert(client, table, columns, rows, chunkSize = 500) {
  if (!rows.length) return 0;
  const cols = columns.join(", ");
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map((_, r) =>
      `(${columns.map((__, c) => `$${r * columns.length + c + 1}`).join(",")})`
    ).join(",");
    const flat = chunk.flat();
    await client.query(
      `INSERT INTO ${table} (${cols}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      flat
    );
  }
  return rows.length;
}

function parseCsvFile(filePath) {
  return parse(fs.readFileSync(filePath), { columns: true, skip_empty_lines: true });
}

// POST /api/upload multipart form expecting fields: accident, vehicle, person (FARS CSVs)
app.post(
  "/api/upload",
  upload.fields([
    { name: "accident", maxCount: 1 },
    { name: "vehicle",  maxCount: 1 },
    { name: "person",   maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files ?? {};
    const accidentPath = files.accident?.[0]?.path;
    const vehiclePath  = files.vehicle?.[0]?.path;
    const personPath   = files.person?.[0]?.path;
    const tmpPaths = [accidentPath, vehiclePath, personPath].filter(Boolean);

    if (!accidentPath || !vehiclePath || !personPath) {
      tmpPaths.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
      return res.status(400).json({
        message: "All three CSVs required: accident, vehicle, person",
      });
    }

    const client = await pool.connect();
    try {
      const accidentRows = parseCsvFile(accidentPath);
      const vehicleRows  = parseCsvFile(vehiclePath);
      const personRows   = parseCsvFile(personPath);

      const { locations, crashes } = readAccidents(accidentRows);
      const { vehicles, involves, vinMap } = readVehicles(vehicleRows);
      const { persons, peds, carPeople, passengers, drivers, ridesIn } =
        readPersons(personRows, vinMap);

      const rowsByTable = {
        Location: locations, Crash: crashes, Vehicle: vehicles, Person: persons,
        Pedestrian: peds, CarPerson: carPeople, Passenger: passengers, Driver: drivers,
        Rides_In: ridesIn, Involves: involves,
      };

      await client.query("BEGIN");
      const inserted = {};
      for (const [table, columns] of TABLE_COLUMNS) {
        inserted[table] = await bulkInsert(client, table, columns, rowsByTable[table]);
      }
      await client.query("COMMIT");
      res.json({ inserted });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed", error: err.message });
    } finally {
      client.release();
      tmpPaths.forEach((p) => { if (fs.existsSync(p)) fs.unlinkSync(p); });
    }
  }
);

// GET /admin — basic CSV upload page
app.get("/admin", (_req, res) => {
  res.send(`
    <h1>FARS Admin Upload</h1>
    <p>Select FARS <code>accident.csv</code>, <code>vehicle.csv</code>, and <code>person.csv</code>.</p>
    <form method="POST" action="/api/upload" enctype="multipart/form-data">
      <p><label>accident.csv: <input type="file" name="accident" accept=".csv" required></label></p>
      <p><label>vehicle.csv: <input type="file" name="vehicle" accept=".csv" required></label></p>
      <p><label>person.csv: <input type="file" name="person" accept=".csv" required></label></p>
      <button type="submit">Upload</button>
    </form>
  `);
});

app.listen(3001, () => console.log("API running on http://localhost:3001"));
