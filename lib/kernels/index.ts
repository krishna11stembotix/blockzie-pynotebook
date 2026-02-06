import { dockerKernel } from "./docker-kernel";
import { createPyodideKernel } from "./pyodide-kernel";
import type { Kernel } from "./types";

/**
 * Kernel registry
 *
 * Pyodide kernel is created dynamically because it depends
 * on execution functions provided by React context.
 */

export type KernelId = "pyodide" | "docker";

/**
 * Static kernels (no React dependency)
 */
export const staticKernels: Record<KernelId, Kernel | null> = {
  pyodide: null, // created later using factory
  docker: dockerKernel,
};
