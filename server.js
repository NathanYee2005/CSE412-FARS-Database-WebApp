const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');
const fs = require('fs');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: '/tmp' });

// GET /api/crashes?year=2022&state=4&weather=1
app.get('/api/crashes', async (req, res) => {
  const { year, state, weather } = req.query;
  const where = [];
  const params = [];
  if (year)    { params.push(year);    where.push(`c.YEAR = $${params.length}`); }
  if (state)   { params.push(state);   where.push(`l.STATE = $${params.length}`); }
  if (weather) { params.push(weather); where.push(`c.WEATHER = $${params.length}`); }
  const sql = `
    SELECT c.ST_CASE, c.YEAR, c.MONTH, c.DAY, c.FATALS, c.WEATHER, c.LATITUDE, c.LONGITUDE, l.STATE
    FROM Crash c LEFT JOIN Location l ON c.LATITUDE=l.LATITUDE AND c.LONGITUDE=l.LONGITUDE
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    LIMIT 1000`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

// POST /api/upload  (multipart form, field name "file", expects FARS accident.csv)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const rows = parse(fs.readFileSync(req.file.path), { columns: true, skip_empty_lines: true });
  let inserted = 0;
  for (const row of rows) {
    await pool.query(
      `INSERT INTO Location (LATITUDE, LONGITUDE, STATE) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [row.LATITUDE, row.LONGITUD, row.STATE]
    );
    await pool.query(
      `INSERT INTO Crash (ST_CASE, YEAR, MONTH, DAY, FATALS, WEATHER, LATITUDE, LONGITUDE)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (ST_CASE) DO NOTHING`,
      [row.ST_CASE, row.YEAR, row.MONTH, row.DAY, row.FATALS, row.WEATHER, row.LATITUDE, row.LONGITUD]
    );
    inserted++;
  }
  fs.unlinkSync(req.file.path);
  res.json({ inserted });
});

// GET /admin — tiny upload page
// will replace with real admin page once frontend exists
app.get('/admin', (_req, res) => {
  res.send(`
    <h1>FARS Admin Upload</h1>
    <form method="POST" action="/api/upload" enctype="multipart/form-data">
      <input type="file" name="file" accept=".csv" required>
      <button type="submit">Upload</button>
    </form>`);
});

app.listen(3000, () => console.log('http://localhost:3000'));
