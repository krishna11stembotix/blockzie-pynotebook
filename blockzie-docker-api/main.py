from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import tempfile
import time
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# --------------------------------------------------
# Configuration
# --------------------------------------------------

DOCKER_IMAGE = os.getenv("BLOCKZIE_DOCKER_IMAGE", "blockzie-python")
EXECUTION_TIMEOUT = int(os.getenv("BLOCKZIE_EXEC_TIMEOUT", "15"))

CORS_ORIGINS = os.getenv(
    "BLOCKZIE_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

# Host execution directory (MUST match docker run volume mount)
HOST_EXEC_ROOT = "/home/blockzie/blockzie-exec"

# --------------------------------------------------
# App setup
# --------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Models
# --------------------------------------------------

class ExecuteRequest(BaseModel):
    code: str


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    executionTime: float
    error: bool

# --------------------------------------------------
# Execution logic
# --------------------------------------------------

def run_docker_code(code_path: str):
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    docker_command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{os.path.dirname(code_path)}:/workspace",
        DOCKER_IMAGE,
        "python",
        "/workspace/cell_exec.py",
    ]

    if openrouter_key:
        docker_command.insert(
            4,
            "-e"
        )
        docker_command.insert(
            5,
            f"OPENROUTER_API_KEY={openrouter_key}"
        )

    return subprocess.run(
        docker_command,
        capture_output=True,
        text=True,
        timeout=EXECUTION_TIMEOUT,
    )


def create_ai_module(temp_dir):
    ai_code = """
import requests
import os

class chatGPT:
    def __init__(self, model="openai/gpt-4o-mini"):
        self.model = model
        self.api_key = os.getenv("OPENROUTER_API_KEY")

    def ask(self, prompt):
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter error: {response.text}")

        result = response.json()
        return result["choices"][0]["message"]["content"]
"""

    ai_path = os.path.join(temp_dir, "AI.py")
    with open(ai_path, "w") as f:
        f.write(ai_code)

# --------------------------------------------------
# API endpoint
# --------------------------------------------------

@app.post("/execute", response_model=ExecuteResponse)
def execute_code(req: ExecuteRequest):
    start_time = time.time()

    os.makedirs(HOST_EXEC_ROOT, exist_ok=True)

    temp_dir = tempfile.mkdtemp(dir=HOST_EXEC_ROOT)

    create_ai_module(temp_dir)

    code_path = os.path.join(temp_dir, "cell_exec.py")

    with open(code_path, "w") as f:
        f.write(req.code)

    try:
        result = run_docker_code(code_path)

        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "executionTime": time.time() - start_time,
            "error": result.returncode != 0,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Execution timed out",
            "executionTime": EXECUTION_TIMEOUT,
            "error": True,
        }

    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Docker is not available on this system",
            "executionTime": 0,
            "error": True,
        }