# SHARED LOGGER
import os
import logging
LOG_LEVEL = os.getenv("LOG_LEVEL","INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger=logging.getLogger(__name__)

import redis
from hotqueue import HotQueue
from pydantic import BaseModel
from enum import Enum
import uuid
import json
import datetime
import typing

class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    ERROR = "FINISHED -- ERROR"
    SUCCESS = "FINISHED -- SUCCESS"

class JobInput(BaseModel):
    origin:str
    dest:str
    date:str

class JobRequest(BaseModel):
    id:str
    status: JobStatus
    origin:str|None=None
    dest:str|None=None
    date:str|None=None
    start_time: typing.Optional[datetime.datetime] = None
    end_time: typing.Optional[datetime.datetime] = None


# REDIST HOST ENV VARIABLE
REDIS_HOST = os.getenv("REDIS_HOST", "redis-db")
# jobs database
jdb=redis.Redis(host=REDIS_HOST,port=6379,db=1,decode_responses=True)
# queue living in same redis service
q=HotQueue("queue",host=REDIS_HOST,port=6379,db=1)
# results database
rdb = redis.Redis(host=REDIS_HOST,port=6379,db=3,decode_responses=False)

def _generate_jid() -> str:
    """
    Generate a pseudo-random identifier for a job.
    """
    logger.debug("Generating new job ID")
    return str(uuid.uuid4())

def _save_result(jid: str, results: dict) -> bool:
    rdb.set(f"result:{jid}", json.dumps(results).encode())
    return True

def _instantiate_job(jid: str, status: JobStatus, origin: str, dest: str, date: str) -> JobRequest:
    """
    Create the job object description as a python dictionary. Requires the job id,
    status, start and end parameters.
    """
    return JobRequest(id=jid, status=status, origin = origin, dest=dest, date=date, start_time = None, end_time = None )


def _save_job(jid: str, job: JobRequest) -> bool:
    """Save a job object in the Redis database."""
    logger.debug(f"Saving job {jid} to Redis")
    jdb.set(jid, json.dumps(job.model_dump(mode="json")))
    return True


def _queue_job(jid: str) -> bool:
    """Add a job to the redis queue."""
    logger.debug(f"Queueing job {jid}")
    q.put(jid)
    
    return True


def get_job_by_id(jid: str)->JobRequest:
    """Return job object given jid"""
    logger.debug(f"Loading job {jid}")
    data=jdb.get(jid)
    if not data:
        logger.warning(f"Job not found: {jid}")
        return None
    loadedData=json.loads(data)
    return JobRequest(**loadedData)


def get_result_by_id(jid: str) -> dict | None:
    data = rdb.get(f"result:{jid}")
    if data:
        return json.loads(data)
    return None


def add_job(origin: str, dest: str, date: str) -> JobRequest:
    """Add a job to the redis database and queue."""
    logger.info(f"Adding job origin={origin}, dest={dest}, date={date}")
    jid = _generate_jid()
    job = _instantiate_job(jid, JobStatus.QUEUED, origin, dest, date)
    _save_job(jid, job)
    _queue_job(jid)
    logger.info(f"Job queued successfully")
    return job


def start_job(jid: str) -> bool:
    """Called by worker when starting a new job. Updates the job's status and start time."""
    logger.info(f"Starting job {jid}")
    start_time = datetime.datetime.now()
    job = get_job_by_id(jid)
    job.start_time = start_time
    return _save_job(jid=jid, job=job)


def update_job_status(jid: str, status: JobStatus) -> bool:
    """Update the status of job with job id `jid` to status `status`."""
    logger.info(f"Job {jid} status -> {status}")
    job = get_job_by_id(jid)
    if job:
        job.status = status
        if job.status == JobStatus.ERROR or job.status == JobStatus.SUCCESS:
            job.end_time = datetime.datetime.now()
        return _save_job(jid, job)
    else:
        logger.error(f"Job not found: {jid}")
        raise Exception()
    


def _save_result_image(jid: str, image_bytes: bytes) -> bool:
    rdb.set(f"image:{jid}", image_bytes)
    return True

def get_result_image_by_id(jid: str) -> bytes | None:
    return rdb.get(f"image:{jid}")