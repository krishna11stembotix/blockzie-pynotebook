"use client";

import { useRef } from "react";
import { usePyodide } from "@/lib/pyodide-context";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Play,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
} from "lucide-react";

export function NotebookHeader() {
  const { isReady, isLoading, loadingStatus, error, runCode, restart } =
    usePyodide();

  const {
    cells,
    addCell,
    clearAllOutputs,
    setCellRunning,
    setCellOutput,
    incrementExecutionCount,
    setCellExecutionCount,
    exportNotebook,
    importNotebook,
  } = useNotebookStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* -----------------------------
     Run all cells
  ----------------------------- */
  const handleRunAll = async () => {
    if (!isReady) return;

    for (const cell of cells) {
      if (!cell.code.trim()) continue;

      setCellRunning(cell.id, true);
      const execCount = incrementExecutionCount();
      setCellExecutionCount(cell.id, execCount);

      const result = await runCode(cell.code, cell.id);
      setCellOutput(cell.id, result);
      setCellRunning(cell.id, false);
    }
  };

  /* -----------------------------
     Export notebook
  ----------------------------- */
  const handleExport = () => {
    const json = exportNotebook();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "blockzie-notebook.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  /* -----------------------------
     Import notebook
  ----------------------------- */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importNotebook(data);
      } catch {
        alert("Invalid notebook file");
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-mono text-sm font-bold text-primary-foreground">
                B
              </span>
            </div>
            <span className="text-lg font-semibold showing-tight text-foreground">
              Blockzie
            </span>
          </div>
          <div className="hidden h-6 w-px bg-border md:block" />
          <span className="hidden text-sm text-muted-foreground md:block">
            Python Notebook
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="mr-2 flex items-center gap-2">
            {isLoading && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {loadingStatus}
                </span>
              </>
            )}
            {isReady && (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="hidden text-xs text-muted-foreground md:inline">
                  Python Ready
                </span>
              </>
            )}
            {error && (
              <>
                <AlertCircle className="h-4 w-4 text-error" />
                <span className="hidden text-xs text-error md:inline">
                  {error}
                </span>
              </>
            )}
          </div>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={!cells.length}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>

          {/* Import */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Existing actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCell()}
            disabled={!isReady}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Cell</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAll}
            disabled={!isReady || isLoading}
            className="gap-1.5 bg-transparent"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run All</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAllOutputs}
            disabled={!isReady}
            className="gap-1.5 bg-transparent"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear Outputs</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={restart}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Restart</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
