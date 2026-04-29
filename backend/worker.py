# SHARED LOGGER
import os
import logging
LOG_LEVEL = os.getenv("LOG_LEVEL","INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger=logging.getLogger(__name__)

# IMPORTS
import time
from jobs import q, jdb, JobRequest, update_job_status, JobStatus, start_job, _save_result,get_job_by_id
import json
from app import rd, Flight

# HELPER FUNCTIONS 
def flight_match_job(flight:dict,job: JobRequest)->bool:
    logger.debug(f"Matching flight ORIGIN={flight.get('ORIGIN')} DEST={flight.get('DEST')}")
    if job.origin and flight.get("ORIGIN")!=job.origin:
        return False
    if job.dest and flight.get("DEST")!=job.dest:
        return False
    if job.date and job.date not in flight.get("FL_DATE"):
        return False
    return True

def avg(flights:list)->float:
    return sum(flights)/len(flights) if flights else None


# ANALYSIS FUNCTION
def perform_analysis(job: JobRequest) -> dict:
    """
    Perform flight filtering
    Filtering logic:
    - If origin is provided, filter by ORIGIN
    - If dest is provided, filter by DEST
    - If date is provided, filter by FL_DATE
    - If any field is None, ignore that filter
    - No filter gives you all flights
    """
    logger.debug(f"Running analysis for job: {job.id}")

    keys=rd.keys("*")
    flights=[]
    for key in keys:
        raw=rd.get(key)
        if not raw:
            continue
        try:
            flights.append(json.loads(raw))
        except json.JSONDecodeError:
            continue

    filteredFlight=[f for f in flights if flight_match_job(f,job)]
    logger.debug(f"Filtered flights: {len(filteredFlight)}")
    totalFlight=len(filteredFlight)
    dep_delays=[f["DEP_DELAY"] for f in filteredFlight if f.get("DEP_DELAY") is not None]
    arr_delays=[f["ARR_DELAY"] for f in filteredFlight if f.get("ARR_DELAY") is not None]
    
    cancelled=sum(1 for f in filteredFlight if (f.get("CANCELLED")or 0)!=0)
    diverted=sum(1 for f in filteredFlight if (f.get("DIVERTED")or 0)!=0)


    results={
        "filter":{
            "origin":job.origin,
            "dest": job.dest,
            "date": job.date
        },
        "summary":{
            "total_flights":totalFlight,
            "avg_departure_delay":avg(dep_delays),
            "avg_arrival_delay":avg(arr_delays),
            "cancelled_flights":cancelled,
            "diverted_flights":diverted
        },
        "flights":filteredFlight
    }
    return results
    
    

@q.worker
def execute_job(jid):
    logger.info(f"Worker picked up job {jid}")
    try:

        start_job(jid)

        update_job_status(jid, JobStatus.RUNNING)

        job=get_job_by_id(jid)
        logger.debug(f"Processing job {jid}")
        result=perform_analysis(job)
        logger.info(f"Job {jid} analysis complete")
        _save_result(jid,result)

        logger.info(f"Job {jid} finished successfully")
        update_job_status(jid, JobStatus.SUCCESS)

    except Exception as e:
        logger.exception(f"Job {jid} failed")
        update_job_status(jid, JobStatus.ERROR)
        raise

if __name__ == "__main__":
    execute_job()