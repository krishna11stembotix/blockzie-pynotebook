"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  result: string | null;
  images: string[];
  executionTime: number;
  error: boolean;
}

interface PyodideContextType {
  isLoading: boolean;
  isReady: boolean;
  loadingStatus: string;
  error: string | null;
  runCode: (code: string, cellId: string) => Promise<ExecutionResult>;
  restart: () => void;

  writeFile: (path: string, content: string | ArrayBuffer) => Promise<void>;

}

const PyodideContext = createContext<PyodideContextType | null>(null);

export function PyodideProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const pendingCallsRef = useRef<Map<string, {
    resolve: (result: ExecutionResult) => void;
    reject: (error: Error) => void;
  }>>(new Map());

  useEffect(() => {
    // Create web worker
    const worker = new Worker("/pyodide-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type, message, cellId, result, error: errorMsg } = event.data;

      switch (type) {
        case "status":
          setLoadingStatus(message);
          break;
        case "ready":
          setIsReady(true);
          setIsLoading(false);
          setLoadingStatus("Ready!");
          break;
        case "error":
          setError(errorMsg);
          setIsLoading(false);
          break;
        case "result":
          const pending = pendingCallsRef.current.get(cellId);
          if (pending) {
            pending.resolve(result);
            pendingCallsRef.current.delete(cellId);
          }
          break;
      }
    };

    worker.onerror = (err) => {
      console.error("Worker error:", err);
      setError("Failed to initialize Python worker");
      setIsLoading(false);
    };

    // Initialize Pyodide in the worker
    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
    };
  }, []);

  const runCode = useCallback(
    async (code: string, cellId: string): Promise<ExecutionResult> => {
      if (!workerRef.current || !isReady) {
        return {
          stdout: "",
          stderr: "Python environment not ready. Please wait...",
          result: null,
          images: [],
          executionTime: 0,
          error: true,
        };
      }

      return new Promise((resolve, reject) => {
        pendingCallsRef.current.set(cellId, { resolve, reject });
        workerRef.current!.postMessage({ type: "run", code, cellId });
      });
    },
    [isReady]
  );

  const restart = useCallback(() => {
    if (!workerRef.current) return;

    setIsLoading(true);
    setIsReady(false);
    setLoadingStatus("Restarting kernel...");
    setError(null);

    // Clear pending calls
    pendingCallsRef.current.forEach(({ reject }) => {
      reject(new Error("Kernel restarted"));
    });
    pendingCallsRef.current.clear();

    workerRef.current.postMessage({ type: "restart" });
  }, []);

  const writeFile = useCallback(
    async (path: string, content: string | ArrayBuffer) => {
      if (!workerRef.current || !isReady) return;

      workerRef.current.postMessage({
        type: "write-file",
        path,
        content,
      });
    },
    [isReady]
  );


  return (
    <PyodideContext.Provider
      value={{
        isLoading,
        isReady,
        loadingStatus,
        error,
        runCode,
        restart,
        writeFile,
      }}
    >
      {children}
    </PyodideContext.Provider>
  );
}

export function usePyodide() {
  const context = useContext(PyodideContext);
  if (!context) {
    throw new Error("usePyodide must be used within a PyodideProvider");
  }
  return context;
}
