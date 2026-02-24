export interface DockerExecutionResult {
  stdout: string;
  stderr: string;
  executionTime: number;
  error: boolean;
}

export async function runDockerCode(
  code: string
): Promise<DockerExecutionResult> {
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error("Docker execution failed");
  }

  return response.json();
}