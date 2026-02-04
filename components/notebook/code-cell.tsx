"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { usePyodide } from "@/lib/pyodide-context";
import { useNotebookStore, type Cell } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { CellOutput } from "./cell-output";
import {
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type * as Monaco from "monaco-editor";

interface CodeCellProps {
  cell: Cell;
  index: number;
  totalCells: number;
}

export function CodeCell({ cell, index, totalCells }: CodeCellProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const { isReady, runCode } = usePyodide();
  const {
    activeCell,
    setActiveCell,
    updateCellCode,
    setCellOutput,
    setCellRunning,
    addCell,
    removeCell,
    moveCell,
    incrementExecutionCount,
    setCellExecutionCount,
  } = useNotebookStore();

  const isActive = activeCell === cell.id;

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleRunCell = useCallback(async () => {
    if (!isReady || cell.isRunning || !cell.code.trim()) return;

    setCellRunning(cell.id, true);
    const execCount = incrementExecutionCount();
    setCellExecutionCount(cell.id, execCount);

    const result = await runCode(cell.code, cell.id);
    setCellOutput(cell.id, result);
    setCellRunning(cell.id, false);
  }, [
    isReady,
    cell.isRunning,
    cell.code,
    cell.id,
    setCellRunning,
    incrementExecutionCount,
    setCellExecutionCount,
    runCode,
    setCellOutput,
  ]);

  // Keyboard shortcut: Shift+Enter to run cell
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const disposable = editor.addAction({
      id: "run-cell",
      label: "Run Cell",
      keybindings: [
        // Shift + Enter (Monaco.KeyMod.Shift | Monaco.KeyCode.Enter)
        1024 + 3,
      ],
      run: () => {
        handleRunCell();
      },
    });

    return () => {
      disposable?.dispose();
    };
  }, [handleRunCell]);

  const lineCount = cell.code.split("\n").length;
  const editorHeight = Math.max(60, Math.min(400, lineCount * 19 + 20));

  return (
    <div
      className={cn(
        "group relative rounded-lg border transition-all duration-200",
        isActive
          ? "border-cell-active bg-cell-bg shadow-[0_0_0_1px_var(--cell-active)]"
          : "border-cell-border bg-cell-bg hover:border-muted-foreground/30"
      )}
      onClick={() => setActiveCell(cell.id)}
    >
      {/* Cell header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRunCell}
            disabled={!isReady || cell.isRunning}
          >
            {cell.isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Play className="h-4 w-4 text-primary" />
            )}
          </Button>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              In [{cell.executionCount ?? " "}]:
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveCell(cell.id, "up")}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveCell(cell.id, "down")}
            disabled={index === totalCells - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => addCell(cell.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeCell(cell.id)}
            disabled={totalCells <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code editor */}
      <div className="overflow-hidden rounded-b-lg">
        <Editor
          height={editorHeight}
          language="python"
          theme="blockzie-dark"
          value={cell.code}
          onChange={(value) => updateCellCode(cell.id, value ?? "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Geist Mono', monospace",
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 8,
            lineHeight: 19,
            renderLineHighlight: "line",
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: { top: 8, bottom: 8 },
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            contextmenu: false,
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("blockzie-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "comment", foreground: "6b7280", fontStyle: "italic" },
                { token: "keyword", foreground: "c084fc" },
                { token: "string", foreground: "4ade80" },
                { token: "number", foreground: "fbbf24" },
                { token: "type", foreground: "60a5fa" },
                { token: "function", foreground: "60a5fa" },
                { token: "variable", foreground: "f472b6" },
                { token: "operator", foreground: "94a3b8" },
              ],
              colors: {
                "editor.background": "#1a1a1a",
                "editor.foreground": "#e5e5e5",
                "editor.lineHighlightBackground": "#262626",
                "editor.selectionBackground": "#374151",
                "editorCursor.foreground": "#4ade80",
                "editorLineNumber.foreground": "#6b7280",
                "editorLineNumber.activeForeground": "#9ca3af",
                "editor.selectionHighlightBackground": "#374151",
                "editorIndentGuide.background1": "#374151",
              },
            });
          }}
        />
      </div>

      {/* Cell output */}
      {cell.output && (
        <CellOutput
          output={cell.output}
          executionCount={cell.executionCount}
        />
      )}

      {/* Running indicator */}
      {cell.isRunning && (
        <div className="absolute right-3 top-3">
          <div className="flex items-center gap-1.5 rounded bg-primary/20 px-2 py-1">
            <Square className="h-3 w-3 animate-pulse fill-primary text-primary" />
            <span className="text-xs text-primary">Running...</span>
          </div>
        </div>
      )}
    </div>
  );
}
