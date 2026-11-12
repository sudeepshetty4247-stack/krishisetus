"""Bounded-memory nationwide history preparation with a reproducible provenance manifest."""
import json
from datetime import datetime, timezone
import duckdb
from data_engine.history_import import ROOT, SOURCE_NAME, SOURCE_URL, DATASET, sha256

def prepare(years=range(2021,2027)):
    files=[ROOT/'raw'/f'mandi_daily_{y}.parquet' for y in years]
    if not all(p.is_file() for p in files):
        raise ValueError('Download every requested year before preparation')
    out=ROOT/'history'/'india_2021_2026.parquet'; out.parent.mkdir(parents=True,exist_ok=True)
    temp=ROOT/'tmp';temp.mkdir(parents=True,exist_ok=True)
    con=duckdb.connect();con.execute("SET memory_limit='256MB'");con.execute('SET threads=1');con.execute('SET preserve_insertion_order=false')
    con.execute(f"SET temp_directory='{temp}'")
    paths=','.join("'"+str(p)+"'" for p in files)
    con.execute(f"""CREATE VIEW raw AS SELECT trim(State) state,trim(District) district,trim(Market) market,
      regexp_replace(trim(Commodity),'\\s+\\(','(','g') commodity,
      coalesce(nullif(trim(Variety),''),'Not specified') variety,coalesce(trim(Grade),'') grade,
      cast(Arrival_Date AS DATE) date,Min_Price min_price,Max_Price max_price,Modal_Price modal_price
      FROM read_parquet([{paths}])""")
    con.execute("""CREATE VIEW valid AS SELECT * FROM raw WHERE modal_price>0 AND modal_price<10000000
      AND (min_price IS NULL OR (min_price>=0 AND min_price<=modal_price))
      AND (max_price IS NULL OR max_price>=modal_price) AND date<=current_date
      AND state<>'' AND district<>'' AND market<>'' AND commodity<>''""")
    # Stable aggregation rather than arbitrary last-row selection for conflicting duplicate prices.
    con.execute("""CREATE VIEW cleaned AS SELECT state,district,market,commodity,variety,grade,date,
      min(min_price) min_price,max(max_price) max_price,median(modal_price) modal_price,
      max(max_price)>min(min_price)*4 suspicious
      FROM valid GROUP BY state,district,market,commodity,variety,grade,date""")
    # State partitions bound grouping memory; state is part of the identity so dedupe remains exact.
    parts=ROOT/'history'/'india_parts';parts.mkdir(parents=True,exist_ok=True)
    states=con.execute('select distinct state from valid order by state').fetchall()
    for i,(state,) in enumerate(states):
        literal=state.replace("'","''")
        con.execute(f"COPY (SELECT * FROM cleaned WHERE state='{literal}') TO '{parts/f'part-{i:03d}.parquet'}' (FORMAT PARQUET,COMPRESSION ZSTD)")
    con.execute(f"COPY (SELECT * FROM read_parquet('{parts}/*.parquet')) TO '{out}' (FORMAT PARQUET,COMPRESSION ZSTD)")
    counts=con.execute(f"""SELECT count(*),count(distinct state),count(distinct (state,district)),
      count(distinct (state,district,market)),count(distinct commodity),min(date),max(date)
      FROM read_parquet('{out}')""").fetchone()
    received=con.execute('select count(*) from raw').fetchone()[0]
    valid=con.execute('select count(*) from valid').fetchone()[0]
    manifest=dict(zip(['records','states','districts','reported_markets','commodities','earliest','latest'],counts))
    manifest.update(source=SOURCE_NAME,source_url=SOURCE_URL,dataset=DATASET,received=received,
      rejected=received-valid,duplicate_rows=valid-counts[0],unit='INR/quintal',arrivals_available=False,
      duplicate_policy='Median modal within identical date/source/geography/commodity/variety/grade; extrema retained',
      created_at=datetime.now(timezone.utc).isoformat(),files={p.name:sha256(p) for p in files})
    out.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2,default=str))
    print(json.dumps(manifest,indent=2,default=str)); return out

if __name__=='__main__': prepare()