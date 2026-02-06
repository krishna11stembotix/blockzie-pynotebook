import type { Kernel, KernelExecutionResult } from "./types";
import { runDockerCode } from "../docker-kernel";

/**
 * Docker-based Python kernel (full CPython environment)
 */
export const dockerKernel: Kernel = {
  id: "docker",
  name: "Docker (Full Python)",

  async execute(code: string): Promise<KernelExecutionResult> {
    return await runDockerCode(code);
  },

  async restart(): Promise<void> {
    // No-op for now
    // Later: reset container or session
  },
};
