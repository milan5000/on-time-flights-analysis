# SHARED LOGGER
import os
import logging
LOG_LEVEL = os.getenv("LOG_LEVEL","INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger=logging.getLogger(__name__)

""" IMPORTS """
import csv
import json
import redis
# import requests   # uncomment if ever use URL to load data

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any
from jobs import JobInput, JobRequest, JobStatus, add_job, get_job_by_id, get_result_by_id, jdb, get_result_image_by_id

""" API CONNECTION """
app = FastAPI()

# For now, import local small sample csv to prove the system works
BASE_DIR=os.path.dirname(__file__)
DATA_FILE=os.path.join(BASE_DIR,"data","dec_2025_data.csv")
# FLIGHT_URL = "PUT_YOUR_URL_HERE"

""" REDDIS CONNECTION """
# this is base redis for normal data 
# Redist host may be different depending on if we are testing or deploying
REDIS_HOST=os.getenv("REDIS_HOST", "redis-db")
rd = redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True)
# This redis is for jobs
from jobs import jdb, q



""" MODEL DEFINITION """
class Flight(BaseModel):
    DAY_OF_WEEK: int | None = None
    FL_DATE: str | None = None
    MKT_UNIQUE_CARRIER: str | None = None

    ORIGIN_AIRPORT_ID: int | None = None
    ORIGIN_AIRPORT_SEQ_ID: int | None = None
    ORIGIN_CITY_MARKET_ID: int | None = None
    ORIGIN: str | None = None
    ORIGIN_CITY_NAME: str | None = None

    DEST_AIRPORT_ID: int | None = None
    DEST_AIRPORT_SEQ_ID: int | None = None
    DEST_CITY_MARKET_ID: int | None = None
    DEST: str | None = None
    DEST_CITY_NAME: str | None = None

    CRS_DEP_TIME: str | None = None
    DEP_DELAY: float | None = None
    CRS_ARR_TIME: str | None = None
    ARR_DELAY: float | None = None

    CANCELLED: float | None = None
    DIVERTED: float | None = None

    CARRIER_DELAY: float | None = None
    WEATHER_DELAY: float | None = None
    NAS_DELAY: float | None = None
    SECURITY_DELAY: float | None = None
    LATE_AIRCRAFT_DELAY: float | None = None


""" HELPER FUNCTIONS """
def to_int(value:Any)->int|None:
    """Convert value to int, or None if blank/bad."""
    if value is None:
        return None
    value=str(value).strip()
    if value=="":
        return None
    try:
        return int(float(value))
    except (TypeError,ValueError):
        return None

def to_float(value:Any)->float|None:
    """Convert value to float, or None if blank/bad."""
    if value is None:
        return None
    value = str(value).strip()
    if value=="":
        return None
    try:
        return float(value)
    except (TypeError,ValueError):
        return None

def clean_row(row: dict[str,Any])->dict[str,Any]:
    """Strip whitespace from CSV keys and values."""
    temp: dict[str, Any]={}
    for k,v in row.items():
        key=str(k).strip()
        if isinstance(v,str):
            temp[key]=v.strip()
        else:
            temp[key]=v
    return temp


""" PARSE & READ CSV FUNCTIONS """
def convert_cvs_to_flight(row: dict[str, Any])->Flight:
    """Parse one CSV row into a Flight model."""
    row=clean_row(row)

    return Flight(
        DAY_OF_WEEK=to_int(row.get("DAY_OF_WEEK")),
        FL_DATE=row.get("FL_DATE"),
        MKT_UNIQUE_CARRIER=row.get("MKT_UNIQUE_CARRIER"),

        ORIGIN_AIRPORT_ID=to_int(row.get("ORIGIN_AIRPORT_ID")),
        ORIGIN_AIRPORT_SEQ_ID=to_int(row.get("ORIGIN_AIRPORT_SEQ_ID")),
        ORIGIN_CITY_MARKET_ID=to_int(row.get("ORIGIN_CITY_MARKET_ID")),
        ORIGIN=row.get("ORIGIN"),
        ORIGIN_CITY_NAME=row.get("ORIGIN_CITY_NAME"),

        DEST_AIRPORT_ID=to_int(row.get("DEST_AIRPORT_ID")),
        DEST_AIRPORT_SEQ_ID=to_int(row.get("DEST_AIRPORT_SEQ_ID")),
        DEST_CITY_MARKET_ID=to_int(row.get("DEST_CITY_MARKET_ID")),
        DEST=row.get("DEST"),
        DEST_CITY_NAME=row.get("DEST_CITY_NAME"),

        CRS_DEP_TIME=row.get("CRS_DEP_TIME"),
        DEP_DELAY=to_float(row.get("DEP_DELAY")),
        CRS_ARR_TIME=row.get("CRS_ARR_TIME"),
        ARR_DELAY=to_float(row.get("ARR_DELAY")),

        CANCELLED=to_float(row.get("CANCELLED")),
        DIVERTED=to_float(row.get("DIVERTED")),

        CARRIER_DELAY=to_float(row.get("CARRIER_DELAY")),
        WEATHER_DELAY=to_float(row.get("WEATHER_DELAY")),
        NAS_DELAY=to_float(row.get("NAS_DELAY")),
        SECURITY_DELAY=to_float(row.get("SECURITY_DELAY")),
        LATE_AIRCRAFT_DELAY=to_float(row.get("LATE_AIRCRAFT_DELAY")),
    )

def get_csv_rows()->list[dict[str, Any]]:
    """Read local CSV file and return rows."""
    try:
        with open(DATA_FILE, "r", encoding="utf-8-sig", newline="") as f:
            reader=csv.DictReader(f)
            rows=[]
            for row in reader:
                rows.append(clean_row(row))
            return rows
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"CSV file not found: {DATA_FILE}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV data: {e}") from e


"""
THIS IS FOR POSSIBLE URL LOADING DATA_FILE
def get_csv_rows()->list[dict[str, Any]]:
    # Read CSV data from a URL and return rows.
    try:
        response=requests.get(FLIGHT_URL)
        response.raise_for_status()
        lines=response.text.splitlines()
        reader=csv.DictReader(lines)
        rows=[]
        for row in reader:
            rows.append(clean_row(row))
        return rows
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch flight data: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected flight data format: {e}") from e
"""


""" API ROUTES FOR DATA MANIPULATION """
@app.post("/data")
def load_data()->dict[str, Any]:
    """
    Load flight data into Redis.
    """
    rows=get_csv_rows()
    cnt=0
    logger.info("Loading flight data into Redis started")

    try:
        all_keys=rd.keys("*") # get all keys
        if all_keys:
            rd.delete(*all_keys)

        for i,row in enumerate(rows):
            flight=convert_cvs_to_flight(row)
            flight_id=str(i)
            rd.set(flight_id,flight.model_dump_json())
            cnt+=1
        logger.info(f"Loaded {cnt} flights into Redis")
        return {"message": "Flight data loaded into Redis", "data_loaded": cnt}
    except Exception as e:
        logger.exception("Failed to load data into Redis")
        raise HTTPException(status_code=500, detail=f"Failed to store data in Redis: {e}") from e


@app.get("/data")
def get_data()->list[dict[str, Any]]:
    """Return all flight data currently in Redis."""
    try:
        keys=rd.keys("*")
        data:list[dict[str, Any]]=[]

        for key in keys:
            cur=rd.get(key)
            if cur is None:
                continue
            data.append(json.loads(cur))

        logger.debug(f"Returning {len(data)} flights from Redis")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read data from Redis: {e}") from e


@app.delete("/data")
def delete_data()->dict[str, str]:
    """Delete all flight data from Redis."""
    logger.warning("Deleting all flight data from Redis")
    try:
        keys=rd.keys("*")
        if keys:
            rd.delete(*keys)
        return {"message": "All flight data deleted from Redis"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete data from Redis: {e}") from e


@app.get("/flights")
def get_flight_ids()->list[str]:
    """Return all generated flight IDs stored in Redis."""
    return rd.keys("*")

@app.get("/flights/{flight_id}")
def get_flight_by_id(flight_id: str) -> dict[str, Any]:
    """Return the flight record associated with one generated flight ID."""
    logger.debug(f"Fetching flight_id={flight_id}")
    try:
        cur=rd.get(flight_id)
    except Exception as e:
        logger.warning(f"Flight not found: {flight_id}")
        raise HTTPException(status_code=500, detail=f"Redis lookup failed: {e}") from e

    if cur is None:
        raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found")

    try:
        return json.loads(cur)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Stored flight data is corrupted: {e}") from e


""" API ROUTES FOR JOBS MANIPULATION """
@app.post("/jobs")
def create_job(job_input: JobInput)->dict[str, Any]:
    """
    Create a new job and place its ID into the queue.
    """
    logger.info(f"Creating job: {job_input.model_dump()}")
    try:
        job = add_job(
            origin=job_input.origin,
            dest=job_input.dest,
            date=job_input.date
        )
        logger.info(f"Job created: {job.id}")
        return job.model_dump()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}") from e


@app.get("/jobs")
def get_jobs() -> list[str]:
    """
    Return all existing job IDs.
    """
    logger.debug(f"Fetching jobs")
    try:
        return jdb.keys("*")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get jobs: {e}") from e
    

@app.get("/jobs/{jid}")
def get_job(jid: str) -> dict[str, Any]:
    """
    Return job information for one job ID.
    """
    try:
        job=get_job_by_id(jid)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Job '{jid}' not found")

    return job.model_dump()


"""API REOUTES FOR RESULTS"""
@app.get("/results/{jid}")
def get_results(jid:str):
    job=get_job_by_id(jid)
    logger.debug(f"Fetching result for job: {jid}")
    if not job:
        raise HTTPException(status_code=404,detail="JOB NOT FOUND")
    if job.status!=JobStatus.SUCCESS:
        logger.info(f"Job {jid} not complete yet: {job.status}")
        return{
            "job_id": jid,
            "status":job.status,
            "message": "job is not done yet"
        }
    result=get_result_by_id(jid)
    return {
        "job_id": jid,
        "status": job.status,
        "result": result
    }

@app.get("/results/{jid}/image")
def get_result_image(jid: str):
    job = get_job_by_id(jid)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.SUCCESS:
        return {"job_id": jid, "status": job.status, "message": "Job is not done yet"}

    image_bytes = get_result_image_by_id(jid)
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Image not found")

    return Response(content=image_bytes, media_type="image/png")