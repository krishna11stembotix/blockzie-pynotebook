"use client";

import { useRef } from "react";
import { usePyodide } from "@/lib/pyodide-context";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import {
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
  const {
    isReady,
    isLoading,
    loadingStatus,
    error,
    runCode,
    restart,
    writeFile, // ✅ FIX 1
  } = usePyodide();

  const {
    cells,
    clearAllOutputs,
    setCellRunning,
    setCellOutput,
    incrementExecutionCount,
    setCellExecutionCount,
    exportNotebook,
    importNotebook,
  } = useNotebookStore();

  // ✅ FIX 2: separate refs
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  /* -----------------------------
     Upload file to Pyodide FS
  ----------------------------- */
  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !isReady) return;

    const buffer = await file.arrayBuffer();
    await writeFile(file.name, buffer);

    alert(`File "${file.name}" uploaded successfully`); // ✅ Success message

    e.target.value = "";
  };

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
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importNotebook(data);
        alert("Notebook imported successfully");
      } catch {
        alert("Invalid notebook file");
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="font-mono text-sm font-bold text-primary-foreground">
              B
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Blockzie
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="mr-2 flex items-center gap-2">
            {isLoading && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="hidden text-xs md:inline">
                  {loadingStatus}
                </span>
              </>
            )}
            {isReady && (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="hidden text-xs md:inline">
                  Python Ready
                </span>
              </>
            )}
            {error && (
              <>
                <AlertCircle className="h-4 w-4 text-error" />
                <span className="hidden text-xs md:inline">
                  {error}
                </span>
              </>
            )}
          </div>

          {/* Upload */}
          <Button variant="outline" size="sm" onClick={handleUploadClick}>
            <Upload className="h-4 w-4" />Upload file
          </Button>
          <input
            ref={uploadInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Import */}
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Download className="h-4 w-4" />Import JSON
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Upload className="h-4 w-4" />Export JSON
          </Button>

          <Button variant="outline" size="sm" onClick={handleRunAll}>
            <Play className="h-4 w-4" />Run All
          </Button>

          <Button variant="outline" size="sm" onClick={clearAllOutputs}>
            <Trash2 className="h-4 w-4" />Delete Outputs
          </Button>

          <Button variant="ghost" size="sm" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
