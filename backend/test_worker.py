from worker import flight_match_job
from jobs import JobRequest, JobStatus
import pytest

def test_flight_match_job_origin():
    job = JobRequest(id="1",status=JobStatus.QUEUED,origin="JFK",dest=None,date=None)
    flight = {"ORIGIN":"JFK","DEST":"LAX"}

    assert flight_match_job(flight, job)

def test_flight_no_match():
    job = JobRequest(id="1", status=JobStatus.QUEUED,origin="SFO",dest=None,date=None)
    flight = {"ORIGIN":"JFK","DEST":"LAX"}

    assert not flight_match_job(flight, job)