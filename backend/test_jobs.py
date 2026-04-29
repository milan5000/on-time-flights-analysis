from jobs import _generate_jid, JobStatus, _instantiate_job, get_job_by_id
import pytest

def test_generate_jid_unique():
    assert _generate_jid()!=_generate_jid()

def test_instantiate_job():
    job=_instantiate_job("1",JobStatus.QUEUED,"A","B","2020")
    assert job.origin=="A"
    assert job.status==JobStatus.QUEUED