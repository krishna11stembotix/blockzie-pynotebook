"use client";

import { useNotebookStore } from "@/lib/notebook-store";
import { usePyodide } from "@/lib/pyodide-context";
import { CodeCell } from "./code-cell";
import { NotebookHeader } from "./notebook-header";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export function Notebook() {
  const { cells, addCell, renderKey } = useNotebookStore();
  const { isLoading, loadingStatus, isReady } = usePyodide();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NotebookHeader />

      <main className="flex-1">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted"></div>
                <div className="absolute left-0 top-0 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  Initializing Python Environment
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loadingStatus}
                </p>
              </div>
              <div className="mt-4 w-64">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full animate-pulse rounded-full bg-primary"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notebook content */}
        {isReady && (
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
            <div className="space-y-4">
              {cells.map((cell, index) => (
                <CodeCell
                  key={`${cell.id}-${renderKey}`}
                  cell={cell}
                  index={index}
                  totalCells={cells.length}
                />
              ))}
            </div>

            {/* Add cell button at bottom */}
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => addCell()}
                className="gap-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add Cell
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-6">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://pyodide.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Pyodide
            </a>{" "}
            - Python running in your browser
          </p>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Shift</kbd> +{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd> to run cell
          </p>
        </div>
      </footer>
    </div>
  );
}
