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
from jobs import q, jdb, JobRequest, update_job_status, JobStatus, start_job, _save_result,get_job_by_id, _save_result_image
import json
from app import rd, Flight
import io
import matplotlib
matplotlib.use('Agg')  # non-interactive backend, required for containers
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd


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
    
    all_days_flights = [f for f in flights if (not job.origin or f.get("ORIGIN") == job.origin)
                        and (not job.dest or f.get("DEST") == job.dest)]
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
        "flights":filteredFlight,
        "all_days_flights": all_days_flights
    }
    return results
    
# HEATMAP FUNCTION
def generate_heatmap(job: JobRequest, flights: list) -> bytes:
    logger.debug(f"Generating heatmap for job: {job.id}")

    df = pd.DataFrame(flights)
    df = df[df["ARR_DELAY"].notna()]

    if df.empty:
        raise ValueError("No delay data available to generate heatmap")

    df["CRS_DEP_TIME"] = df["CRS_DEP_TIME"].astype(str).str.zfill(4)
    df["HOUR"] = df["CRS_DEP_TIME"].str[:2].astype(int)
    df["DAY_OF_WEEK"] = df["DAY_OF_WEEK"].astype(int)

    # pivot for average delay (color)
    pivot_delay = df.pivot_table(
        values="ARR_DELAY",
        index="DAY_OF_WEEK",
        columns="HOUR",
        aggfunc="mean"
    )

    # pivot for count
    pivot_count = df.pivot_table(
        values="ARR_DELAY",
        index="DAY_OF_WEEK",
        columns="HOUR",
        aggfunc="count"
    )

    day_names = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}
    pivot_delay.index = [day_names.get(d, str(d)) for d in pivot_delay.index]
    pivot_count.index = [day_names.get(d, str(d)) for d in pivot_count.index]

    # build custom annotation: "delay\n(n flights)"
    annot = pivot_delay.copy().astype(object)
    for row in pivot_delay.index:
        for col in pivot_delay.columns:
            delay = pivot_delay.loc[row, col]
            count = pivot_count.loc[row, col] if row in pivot_count.index and col in pivot_count.columns else 0
            if pd.notna(delay):
                annot.loc[row, col] = f"{delay:.0f}\n({int(count)})"
            else:
                annot.loc[row, col] = ""

    fig, ax = plt.subplots(figsize=(14, 6))
    sns.heatmap(
        pivot_delay,
        ax=ax,
        cmap="RdYlGn_r",
        center=0,
        annot=annot,
        fmt="",           # empty format since we're using custom strings
        linewidths=0.5,
        annot_kws={"size": 8},
        cbar_kws={"label": "Avg Arrival Delay (min)"}
    )

    title = f"Average Arrival Delay: {job.origin or 'All'} → {job.dest or 'All'}"
    ax.set_title(title, fontsize=14)
    ax.set_xlabel("Departure Hour")
    ax.set_ylabel("Day of Week")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150)
    buf.seek(0)
    image_bytes = buf.read()
    plt.close()

    logger.debug(f"Heatmap generated: {len(image_bytes)} bytes")
    return image_bytes


@q.worker
def execute_job(jid):
    logger.info(f"Worker picked up job {jid}")
    try:
        start_job(jid)
        update_job_status(jid, JobStatus.RUNNING)

        job = get_job_by_id(jid)
        logger.debug(f"Processing job {jid}")

        # run analysis
        result = perform_analysis(job)
        logger.info(f"Job {jid} analysis complete")
        _save_result(jid, result)

        # generate heatmap from filtered flights
        image_bytes = generate_heatmap(job, result["all_days_flights"])  
        logger.info(f"Job {jid} heatmap generated")
        _save_result_image(jid, image_bytes)  # save image separately

        update_job_status(jid, JobStatus.SUCCESS)
        logger.info(f"Job {jid} finished successfully")

    except Exception as e:
        logger.exception(f"Job {jid} failed")
        update_job_status(jid, JobStatus.ERROR)
        raise

if __name__ == "__main__":
    execute_job()