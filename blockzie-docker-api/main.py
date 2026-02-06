from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import tempfile
import time
import os
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExecuteRequest(BaseModel):
    code: str

class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    executionTime: float
    error: bool

@app.post("/execute", response_model=ExecuteResponse)
def execute_code(req: ExecuteRequest):
    start_time = time.time()

    with tempfile.TemporaryDirectory() as temp_dir:
        code_path = os.path.join(temp_dir, "cell_exec.py")

        with open(code_path, "w") as f:
            f.write(req.code)

        try:
            result = subprocess.run(
                [
                    "docker",
                    "run",
                    "--rm",
                    "-v",
                    f"{temp_dir}:/workspace",
                    "blockzie-python",
                    "python",
                    "/workspace/cell_exec.py"
                ],
                capture_output=True,
                text=True,
                timeout=15
            )

            execution_time = time.time() - start_time

            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "executionTime": execution_time,
                "error": result.returncode != 0
            }

        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Execution timed out",
                "executionTime": 15,
                "error": True
            }
