# FARS Crash Explorer

Web app over the NHTSA FARS (Fatality Analysis Reporting System) dataset. React + Vite frontend, Express + Postgres backend, with a heatmap, filterable result table, and an admin upload form for ingesting new years.

![Crash Explorer](docs/screenshots/2024_heatmap_many_res_dark.png)

## Quickstart (from a SQL dump)

The fastest path is to restore the prebuilt `fars_dump.sql` (dump is for 2022).

```bash
# 1. Create the database and a dedicated user  (e.g user is 'riley')
sudo -u postgres createdb fars
sudo -u postgres psql -d fars -c "CREATE USER riley WITH PASSWORD 'riley';"
sudo -u postgres psql -d fars -c "GRANT ALL ON SCHEMA public TO riley;"

# 2. Restore the dump
PGPASSWORD=riley psql -U riley -h localhost -d fars -f fars_dump.sql

# 3. Verify (expect 39422)
PGPASSWORD=riley psql -U riley -h localhost -d fars -c "SELECT COUNT(*) FROM crash;"

# 4. Set DATABASE_URL in .env
"DATABASE_URL=postgres://riley:riley@localhost:5432/fars"

# 5. Install and run
npm install
npm run dev
```

Open <http://localhost:5173>. The API runs at <http://localhost:3001>.

## Loading from CSVs

If you'd rather start from raw FARS data, download a year's CSVs from <https://www.nhtsa.gov/file-downloads> and run the loader (it applies `schema.sql` on the first call):

```bash
python3 scripts/load_db.py --csv-dir path/to/FARS2023NationalCSV --dbname fars
python3 scripts/load_db.py --csv-dir path/to/FARS2022NationalCSV --dbname fars --no-schema
```

## Features

**Filters compound** — pick a year, then narrow by state, weather, light condition, work zone, fatality count, and more:

| Arizona only | + Daylight + Rain |
|---|---|
| ![AZ](docs/screenshots/2024_heatmap_az.png) | ![AZ daylight rain](docs/screenshots/2024_heatmap_az_daylight_rain.png) |

**Results table** with sortable columns alongside the map:

![Results table](docs/screenshots/2022_heatmap_res_jan.png)

**Admin upload** — load a new year's `accident.csv`, `vehicle.csv`, and `person.csv` from the browser at `/admin`:

![Admin upload](docs/screenshots/admin_page_acc_vehi_per_sel.png)

## Project layout

```
schema.sql            DDL for all tables
scripts/load_db.py    CSV → Postgres loader
server.js             Express API
src/                  React frontend
docs/screenshots/     UI screenshots
```
