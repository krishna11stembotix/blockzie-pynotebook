import type { Kernel, KernelExecutionResult } from "./types";

/**
 * Factory to create a Pyodide-backed kernel
 * Execution functions are injected from React context
 */
export function createPyodideKernel(
  runCode: (code: string, cellId: string) => Promise<KernelExecutionResult>,
  restart: () => void
): Kernel {
  return {
    id: "pyodide",
    name: "Browser (Pyodide)",

    async execute(code: string, cellId?: string) {
      return await runCode(code, cellId ?? crypto.randomUUID());
    },

    async restart() {
      restart();
    },
  };
}
