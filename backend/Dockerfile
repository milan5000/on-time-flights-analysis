FROM python:3.14

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

# Initialize a uv project
RUN uv init /code

# NOTE: The WORKDIR instruction sets the working directory for any RUN, CMD, ENTRYPOINT, COPY and ADD instructions that follow it in the Dockerfile
WORKDIR /code

RUN uv add fastapi[standard] pydantic pytest argparse requests xmltodict redis hotqueue matplotlib seaborn pandas

COPY ./src/app.py /code/app.py

COPY ./src/jobs.py /code/jobs.py

COPY ./src/worker.py /code/worker.py

COPY ./data/dec_2025_data.csv /code/data/dec_2025_data.csv

COPY ../data/sample_data.csv /code/data/sample_data.csv

COPY ./test/test_api.py /code/test/test_api.py

COPY ./test/test_jobs.py /code/test/test_jobs.py

COPY ./test/test_worker.py /code/test/test_worker.py

CMD ["uv", "run", "--", "fastapi", "dev",  "--host", "0.0.0.0", "app.py"]