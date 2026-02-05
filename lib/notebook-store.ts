import { create } from "zustand";
import type { ExecutionResult } from "./pyodide-context";

/* ---------------------------------------------
   Persistence helpers
--------------------------------------------- */

const STORAGE_KEY = "blockzie-notebook-v1";

function saveNotebookState(state: {
  cells: Cell[];
  activeCell: string | null;
  globalExecutionCount: number;
}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadNotebookState(): {
  cells: Cell[];
  activeCell: string | null;
  globalExecutionCount: number;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ---------------------------------------------
   Types
--------------------------------------------- */

export interface Cell {
  id: string;
  code: string;
  output: ExecutionResult | null;
  isRunning: boolean;
  executionCount: number | null;
}

interface NotebookState {
  cells: Cell[];
  activeCell: string | null;
  globalExecutionCount: number;

  /** Forces Monaco editors to remount safely */
  renderKey: number;

  addCell: (afterId?: string) => void;
  removeCell: (id: string) => void;
  updateCellCode: (id: string, code: string) => void;
  setCellOutput: (id: string, output: ExecutionResult) => void;
  setCellRunning: (id: string, running: boolean) => void;
  setActiveCell: (id: string | null) => void;
  incrementExecutionCount: () => number;
  setCellExecutionCount: (id: string, count: number) => void;
  moveCell: (id: string, direction: "up" | "down") => void;
  clearAllOutputs: () => void;
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

const createCell = (code = ""): Cell => ({
  id: crypto.randomUUID(),
  code,
  output: null,
  isRunning: false,
  executionCount: null,
});

const defaultCells: Cell[] = [
  createCell(`# Welcome to Blockzie!
# A Python notebook running entirely in your browser

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

print("Hello, Blockzie!")
print("Python is running in your browser with Pyodide")`),
];

/* ---------------------------------------------
   Store
--------------------------------------------- */

export const useNotebookStore = create<NotebookState>((set, get) => {
  const saved = loadNotebookState();

  return {
    cells: saved?.cells ?? defaultCells,
    activeCell:
      saved?.activeCell ??
      saved?.cells?.[0]?.id ??
      defaultCells[0]?.id ??
      null,
    globalExecutionCount: saved?.globalExecutionCount ?? 0,

    // 🔑 MUST be initialized
    renderKey: 0,

    addCell: (afterId) => {
      set((state) => {
        const newCell = createCell();
        let cells = [...state.cells];

        if (afterId) {
          const index = cells.findIndex((c) => c.id === afterId);
          if (index !== -1) cells.splice(index + 1, 0, newCell);
          else cells.push(newCell);
        } else {
          cells.push(newCell);
        }

        const next = {
          ...state,
          cells,
          activeCell: newCell.id,
        };

        saveNotebookState(next);
        return next;
      });
    },

    removeCell: (id) => {
      set((state) => {
        if (state.cells.length <= 1) return state;

        const cells = state.cells.filter((c) => c.id !== id);

        const next = {
          ...state,
          cells,
          activeCell:
            state.activeCell === id ? cells[0]?.id ?? null : state.activeCell,
        };

        saveNotebookState(next);
        return next;
      });
    },

    updateCellCode: (id, code) => {
      set((state) => {
        const next = {
          ...state,
          cells: state.cells.map((c) =>
            c.id === id ? { ...c, code } : c
          ),
        };
        saveNotebookState(next);
        return next;
      });
    },

    setCellOutput: (id, output) => {
      set((state) => {
        const next = {
          ...state,
          cells: state.cells.map((c) =>
            c.id === id ? { ...c, output } : c
          ),
        };
        saveNotebookState(next);
        return next;
      });
    },

    setCellRunning: (id, running) => {
      set((state) => ({
        ...state,
        cells: state.cells.map((c) =>
          c.id === id ? { ...c, isRunning: running } : c
        ),
      }));
    },

    setActiveCell: (id) => {
      set((state) => {
        const next = { ...state, activeCell: id };
        saveNotebookState(next);
        return next;
      });
    },

    incrementExecutionCount: () => {
      const newCount = get().globalExecutionCount + 1;

      set((state) => {
        const next = {
          ...state,
          globalExecutionCount: newCount,
        };
        saveNotebookState(next);
        return { globalExecutionCount: newCount };
      });

      return newCount;
    },

    setCellExecutionCount: (id, count) => {
      set((state) => {
        const next = {
          ...state,
          cells: state.cells.map((c) =>
            c.id === id ? { ...c, executionCount: count } : c
          ),
        };
        saveNotebookState(next);
        return next;
      });
    },

    moveCell: (id, direction) => {
      set((state) => {
        const index = state.cells.findIndex((c) => c.id === id);
        if (index === -1) return state;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= state.cells.length) return state;

        const cells = [...state.cells];
        [cells[index], cells[newIndex]] = [cells[newIndex], cells[index]];

        const next = {
          ...state,
          cells,
          renderKey: state.renderKey + 1, // 🔑 CRITICAL FIX
        };

        saveNotebookState(next);
        return next;
      });
    },

    clearAllOutputs: () => {
      set((state) => {
        const next = {
          ...state,
          cells: state.cells.map((c) => ({
            ...c,
            output: null,
            executionCount: null,
          })),
          globalExecutionCount: 0,
        };
        saveNotebookState(next);
        return next;
      });
    },
  };
});
