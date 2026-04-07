from fastapi import FastAPI
from pydantic import BaseModel

class Flight(BaseModel):
    mkt_unique_carrier: str
    # TODO

# TODO: validate data is present as expected

app = FastAPI()
