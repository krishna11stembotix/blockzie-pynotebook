export type KernelExecutionResult = {
  stdout: string;
  stderr: string;
  images?: string[];
  executionTime: number;
  error: boolean;
};

export interface Kernel {
  id: string;
  name: string;
  execute(code: string, cellId?: string): Promise<KernelExecutionResult>;
  restart(): Promise<void>;
}
