# FARS Crash Explorer

Awesome Web app over the NHTSA FARS (Fatality Analysis Reporting System) dataset. React + Vite frontend, Express + Postgres backend.


## 1. Database

```bash
sudo -u postgres createdb -O "$USER" fars
```

## 2. Load FARS data

Download a year's CSVs from <https://www.nhtsa.gov/file-downloads> (e.g. `FARS2023NationalCSV.zip`) and unzip somewhere.

Load the first year (creates the schema):

```bash
python3 scripts/load_db.py --csv-dir path/to/FARS2023NationalCSV --dbname fars
```

Add more years on top (no schema reset):

```bash
python3 scripts/load_db.py --csv-dir path/to/FARS2022NationalCSV --dbname fars --no-schema
```

## 3. Add the DB url to the .env

```bash
 'DATABASE_URL=postgresql:///fars?host=/var/run/postgresql' 
```

## 4. Run

```bash
npm i
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3001>

## Layout

```
schema.sql            DDL for all tables
scripts/load_db.py    CSV → Postgres loader
server.js             Express API
src/                  React frontend
```
