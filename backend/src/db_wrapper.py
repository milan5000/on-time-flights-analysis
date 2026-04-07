import duckdb, threading, asyncio
from polars import DataFrame

PARQUET_PATH = "../../data/full/**/*.parquet"

_my_local = threading.local()

def _get_con() -> duckdb.DuckDBPyConnection:
    if not hasattr(_my_local, "con"):
        # create a new connection with a view,
        # only if this thread does not already have one
        con = duckdb.connect()
        con.execute(f"""
            CREATE VIEW flights AS
                    SELECT * FROM read_parquet(
                        {PARQUET_PATH},
                        hive_partitioning=true
                    )
        """)
        _my_local.con = con
    return _my_local.con

def _run_query(sql: str) -> DataFrame:
    return _get_con().execute(sql, []).pl()

async def query(sql: str) -> DataFrame:
    """Asynchronously query DuckDB for data.

    Args:
        sql (str): The SQL query to issue to the database.
    
    Returns:
        out (DataFrame): A DataFrame with the results.
    """
    return await asyncio.to_thread(
        _run_query, sql
    )
