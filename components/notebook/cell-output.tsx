"use client";

import type { ExecutionResult } from "@/lib/pyodide-context";
import { cn } from "@/lib/utils";
import { AlertCircle, Clock } from "lucide-react";

interface CellOutputProps {
  output: ExecutionResult;
  executionCount: number | null;
}

export function CellOutput({ output, executionCount }: CellOutputProps) {
  const hasContent =
    output.stdout ||
    output.stderr ||
    output.result ||
    output.images.length > 0;

  if (!hasContent) return null;

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="border-t border-border/50 bg-output-bg">
      {/* Output header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">
          Out [{executionCount ?? " "}]:
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-xs">{formatTime(output.executionTime)}</span>
        </div>
      </div>

      {/* Output content */}
      <div className="space-y-2 px-3 pb-3">
        {/* Standard output */}
        {output.stdout && (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-3 font-mono text-sm text-foreground">
            {output.stdout}
          </pre>
        )}

        {/* Result value */}
        {output.result && !output.stdout.includes(output.result) && (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-3 font-mono text-sm text-primary">
            {output.result}
          </pre>
        )}

        {/* Error output */}
        {output.stderr && (
          <div
            className={cn(
              "overflow-x-auto rounded p-3",
              output.error ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle
                className={cn(
                  "h-4 w-4",
                  output.error ? "text-destructive" : "text-warning"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  output.error ? "text-destructive" : "text-warning"
                )}
              >
                {output.error ? "Error" : "Warning"}
              </span>
            </div>
            <pre
              className={cn(
                "whitespace-pre-wrap break-words font-mono text-sm",
                output.error ? "text-destructive" : "text-warning"
              )}
            >
              {output.stderr}
            </pre>
          </div>
        )}

        {/* Matplotlib images */}
        {output.images.length > 0 && (
          <div className="space-y-2">
            {output.images.map((img, idx) => (
              <div
                key={`${executionCount}-${idx}`}
                className="overflow-hidden rounded-lg border border-border/50 bg-muted/20"
              >
                <img
                  src={img || "/placeholder.svg"}
                  alt={`Plot ${idx + 1}`}
                  className="mx-auto max-h-[500px] w-auto"
                  crossOrigin="anonymous"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
