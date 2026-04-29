from fastapi.testclient import TestClient
from app import app

client=TestClient(app)

def test_load_data():
    res=client.post("/data")
    assert res.status_code==200
    assert "data_loaded" in res.json()

def test_get_data():
    client.post("/data")
    res = client.get("/data")
    assert res.status_code==200
    assert isinstance(res.json(),list)

def test_delete_data():
    client.post("/data")
    res = client.delete("/data")
    assert res.status_code==200

def test_create_job():
    res = client.post("/jobs",json={
        "origin": "JFK",
        "dest": "LAX",
        "date": "2023-01-01"
    })
    assert res.status_code==200
    assert "id" in res.json()