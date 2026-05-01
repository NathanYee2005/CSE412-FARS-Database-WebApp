#!/usr/bin/env python3
"""Load a FARS year's accident.csv, vehicle.csv, and person.csv into Postgres."""

import argparse
import csv
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

HERE = Path(__file__).resolve().parent
SCHEMA_SQL = HERE.parent / 'schema.sql'
REQUIRED_CSVS = ('accident.csv', 'vehicle.csv', 'person.csv')
PLACEHOLDER_VINS = {'999999999999', '888888888888', '000000000000'}
SENTINEL_LATS = (77.7777, 88.8888, 99.9999)

LOCATION_FIELDS = ('COUNTY', 'CITY', 'STATE', 'TYP_INT', 'REL_ROAD', 'ROUTE')
CRASH_FIELDS = ('PEDS', 'PERSONS', 'DAY', 'MONTH', 'YEAR', 'NOT_HOUR', 'ARR_HOUR',
                'VE_TOTAL', 'ARR_MIN', 'MAN_COLL', 'NOT_MIN', 'FATALS')
VEHICLE_FIELDS = ('MOD_YEAR', 'MAKE', 'BODY_TYP', 'UNITTYPE')
INVOLVES_FIELDS = ('NUMOCCS', 'ROLLOVER', 'TRAV_SP', 'IMPACT1', 'HIT_RUN',
                   'FIRE_EXP', 'TOWED', 'DEFORMED', 'VSPD_LIM')
PERSON_FIELDS = ('AGE', 'SEX', 'INJ_SEV', 'HOSPITAL', 'DOA')
CAR_PERSON_FIELDS = ('EJECTION', 'SEAT_POS', 'REST_USE')
DRIVER_FIELDS = ('DRINKING', 'DRUGS')

TABLE_COLUMNS = (
    ('Location', ('LATITUDE', 'LONGITUDE', *LOCATION_FIELDS)),
    ('Crash', ('ST_CASE', *CRASH_FIELDS, 'LATITUDE', 'LONGITUDE', 'WEATHER', 'LGT_COND', 'WRK_ZONE')),
    ('Vehicle', ('VIN', 'VEH_NO', *VEHICLE_FIELDS)),
    ('Person', ('ST_CASE', 'PER_NO', 'YEAR', *PERSON_FIELDS)),
    ('Pedestrian', ('PER_NO', 'ST_CASE', 'YEAR')),
    ('CarPerson', ('PER_NO', 'ST_CASE', 'YEAR', *CAR_PERSON_FIELDS)),
    ('Passenger', ('PER_NO', 'ST_CASE', 'YEAR')),
    ('Driver', ('PER_NO', 'ST_CASE', 'YEAR', *DRIVER_FIELDS)),
    ('Rides_In', ('PER_NO', 'ST_CASE', 'YEAR', 'VIN')),
    ('Involves', ('ST_CASE', 'YEAR', 'VIN', *INVOLVES_FIELDS)),
)


def coerce(value, fn):
    if value is None or value == '':
        return None
    try:
        return fn(value)
    except ValueError:
        return None


def to_int(value):
    return coerce(value, int)


def to_num(value):
    return coerce(value, float)


def ints(row, fields):
    return tuple(to_int(row[field]) for field in fields)


def csv_rows(csv_dir, filename):
    with open(Path(csv_dir) / filename, newline='', encoding='utf-8-sig') as fh:
        yield from csv.DictReader(fh)


def is_sentinel(lat):
    try:
        value = abs(float(lat))
    except (ValueError, TypeError):
        return True
    return any(abs(value - sentinel) < 0.001 for sentinel in SENTINEL_LATS)


def resolve_vin(vin, year, st_case, veh_no):
    return f'UNK{year}{st_case}V{veh_no}' if vin in PLACEHOLDER_VINS else vin


def sniff_year(csv_dir):
    for row in csv_rows(csv_dir, 'accident.csv'):
        year = to_int(row['YEAR'])
        if year is None:
            sys.exit("Could not read YEAR from accident.csv")
        return year
    sys.exit("accident.csv is empty")


def synth_per_no(veh_no, per_no):
    return int(veh_no) * 100 + int(per_no)


def read_accidents(csv_dir):
    locations, crashes, seen_cases = {}, [], set()
    for row in csv_rows(csv_dir, 'accident.csv'):
        st_case = row['ST_CASE']
        if st_case in seen_cases:
            continue
        seen_cases.add(st_case)

        lat, lon = row['LATITUDE'], row['LONGITUD']
        sentinel = is_sentinel(lat)
        if not sentinel:
            locations.setdefault((lat, lon), (to_num(lat), to_num(lon), *ints(row, LOCATION_FIELDS)))
        crashes.append((
            to_int(st_case), *ints(row, CRASH_FIELDS),
            None if sentinel else to_num(lat), None if sentinel else to_num(lon),
            *ints(row, ['WEATHER', 'LGT_COND', 'WRK_ZONE']),
        ))
    return list(locations.values()), crashes


def read_vehicles(csv_dir, year):
    vin_map, vehicles, involves = {}, {}, {}
    for row in csv_rows(csv_dir, 'vehicle.csv'):
        st_case, veh_no = row['ST_CASE'], row['VEH_NO']
        st_int = to_int(st_case)
        vin = resolve_vin(row['VIN'], year, st_case, veh_no)
        vin_map[(st_case, veh_no)] = vin
        vehicles.setdefault(vin, (vin, to_int(veh_no), *ints(row, VEHICLE_FIELDS)))
        involves.setdefault((st_int, vin), (st_int, year, vin, *ints(row, INVOLVES_FIELDS)))
    return list(vehicles.values()), list(involves.values()), vin_map


def read_persons(csv_dir, vin_map, year):
    persons, peds, car_people, passengers, drivers, rides_in = ({} for _ in range(6))
    for row in csv_rows(csv_dir, 'person.csv'):
        st_case, veh_no, per_type = row['ST_CASE'], row['VEH_NO'], row['PER_TYP']
        st_int = to_int(st_case)
        per_no = synth_per_no(veh_no, row['PER_NO'])
        key = (per_no, st_int)
        persons.setdefault(key, (st_int, per_no, year, *ints(row, PERSON_FIELDS)))

        if per_type in ('1', '2'):
            car_people.setdefault(key, (per_no, st_int, year, *ints(row, CAR_PERSON_FIELDS)))
            vin = vin_map.get((st_case, veh_no))
            if vin:
                rides_in.setdefault(key, (per_no, st_int, year, vin))
            if per_type == '1':
                drivers.setdefault(key, (per_no, st_int, year, *ints(row, DRIVER_FIELDS)))
            else:
                passengers.setdefault(key, (per_no, st_int, year))
        elif per_type in ('5', '6'):
            peds.setdefault(key, (per_no, st_int, year))

    return tuple(list(rows.values()) for rows in (persons, peds, car_people, passengers, drivers, rides_in))


SHARED_TABLES = {'Location', 'Vehicle'}  # PK is year-independent; skip rows already loaded by another year


def insert_many(cur, table, columns, rows, page_size=1000):
    if not rows:
        print(f"  {table:<11s}    0  (skipped)")
        return
    suffix = ' ON CONFLICT DO NOTHING' if table in SHARED_TABLES else ''
    execute_values(cur, f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s{suffix}", rows, page_size=page_size)
    print(f"  {table:<11s} {len(rows):>6d}")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv-dir', required=True, help='Folder containing accident.csv, vehicle.csv, and person.csv.')
    parser.add_argument('--schema', default=SCHEMA_SQL, help='Path to schema SQL file.')
    parser.add_argument('--no-schema', action='store_true', help='Skip running the schema file.')
    parser.add_argument('--year', type=int, default=None,
                        help='FARS year to stamp on every row. Defaults to YEAR from accident.csv.')
    parser.add_argument('--dbname', default=os.environ.get('PGDATABASE', 'fars'))
    parser.add_argument('--host', default=os.environ.get('PGHOST'))
    parser.add_argument('--port', default=os.environ.get('PGPORT'))
    parser.add_argument('--user', default=os.environ.get('PGUSER'))
    parser.add_argument('--password', default=os.environ.get('PGPASSWORD'))
    return parser.parse_args()


def main():
    args = parse_args()
    csv_dir = Path(args.csv_dir)
    if not csv_dir.is_dir():
        sys.exit(f"CSV directory not found: {args.csv_dir}")
    missing = [name for name in REQUIRED_CSVS if not (csv_dir / name).exists()]
    if missing:
        sys.exit(f"Missing required CSV(s): {', '.join(missing)} in {args.csv_dir}")

    print(f"Connecting to '{args.dbname}'" + (f" @ {args.host}" if args.host else "") + " ...")
    conn = psycopg2.connect(
        dbname=args.dbname, user=args.user, password=args.password, host=args.host, port=args.port,
    )
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            if not args.no_schema:
                print(f"Running schema: {args.schema}")
                with open(args.schema) as fh:
                    cur.execute(fh.read())

            year = args.year if args.year is not None else sniff_year(csv_dir)
            print(f"Reading CSVs (YEAR={year})...")
            locations, crashes = read_accidents(csv_dir)
            vehicles, involves, vin_map = read_vehicles(csv_dir, year)
            persons, peds, car_people, passengers, drivers, rides_in = read_persons(csv_dir, vin_map, year)
            rows_by_table = {
                'Location': locations, 'Crash': crashes, 'Vehicle': vehicles, 'Person': persons,
                'Pedestrian': peds, 'CarPerson': car_people, 'Passenger': passengers, 'Driver': drivers,
                'Rides_In': rides_in, 'Involves': involves,
            }

            print("Inserting:")
            for table, columns in TABLE_COLUMNS:
                insert_many(cur, table, columns, rows_by_table[table])

        conn.commit()
        print("Committed.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
