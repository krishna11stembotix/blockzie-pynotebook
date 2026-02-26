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
EXECUTION_TIMEOUT = int(os.getenv("BLOCKZIE_EXEC_TIMEOUT", "120"))

CORS_ORIGINS = os.getenv(
    "BLOCKZIE_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

# MUST match docker run volume mount
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
    images: list[str] = []

# --------------------------------------------------
# Execution logic
# --------------------------------------------------

def run_docker_code(code_path: str):
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    docker_command = [
        "docker",
        "run",
        "--rm",
        "--memory=4g",
        "-cpus=2",
        "-v",
        f"{os.path.dirname(code_path)}:/workspace",
    ]

    if openrouter_key:
        docker_command.extend([
            "-e",
            f"OPENROUTER_API_KEY={openrouter_key}"
        ])

    docker_command.extend([
        DOCKER_IMAGE,
        "python",
        "/workspace/cell_exec.py",
    ])

    return subprocess.run(
        docker_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
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

    wrapped_code = f"""
import os
os.environ["YOLO_OFFLINE"] = "True"
os.environ["TORCH_CPP_LOG_LEVEL"] = "ERROR"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import io
import base64
import sys

def _blockzie_show():
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    print("<<BLOCKZIE_IMAGE>>" + img_base64)
    plt.close()

plt.show = _blockzie_show

# ---- USER CODE START ----
{req.code}
# ---- USER CODE END ----
"""

    with open(code_path, "w") as f:
        f.write(wrapped_code)

    try:
        result = run_docker_code(code_path)

        stdout = result.stdout
        stderr = result.stderr

        # Filter NNPACK warnings
        stderr_lines = []
        for line in stderr.splitlines():
            if "NNPACK" not in line:
                stderr_lines.append(line)

        stderr = "\n".join(stderr_lines)

        images = []

        marker = "<<BLOCKZIE_IMAGE>>"

        if marker in stdout:
            parts = stdout.split(marker)
            clean_stdout = parts[0]

            for img in parts[1:]:
                images.append(f"data:image/png;base64,{img.strip()}")

            stdout = clean_stdout

        return {
            "stdout": stdout,
            "stderr": stderr,
            "executionTime": time.time() - start_time,
            "error": result.returncode != 0,
            "images": images
        }        

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Execution timed out",
            "executionTime": EXECUTION_TIMEOUT,
            "error": True,
            "images": []
        }

    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Docker is not available on this system",
            "executionTime": 0,
            "error": True,
            "images": []
        }
