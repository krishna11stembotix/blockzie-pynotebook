import { create } from "zustand";
import type { ExecutionResult } from "./pyodide-context";

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
  
  // Actions
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
  createCell(`# Create some data with NumPy
x = np.linspace(0, 10, 100)
y = np.sin(x)

print(f"x shape: {x.shape}")
print(f"y shape: {y.shape}")
print(f"First 5 x values: {x[:5]}")`),
  createCell(`# Create a plot with Matplotlib
plt.figure(figsize=(10, 6))
plt.plot(x, np.sin(x), label='sin(x)', color='#4ade80', linewidth=2)
plt.plot(x, np.cos(x), label='cos(x)', color='#60a5fa', linewidth=2)
plt.xlabel('x', color='white')
plt.ylabel('y', color='white')
plt.title('Sine and Cosine Functions', color='white', fontsize=14)
plt.legend(facecolor='#2a2a2a', edgecolor='#444', labelcolor='white')
plt.grid(True, alpha=0.3, color='#555')
plt.gca().set_facecolor('#1a1a1a')
plt.gca().tick_params(colors='white')
for spine in plt.gca().spines.values():
    spine.set_color('#444')
plt.tight_layout()
plt.show()`),
  createCell(`# Work with Pandas DataFrames
df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'Age': [25, 30, 35, 28, 32],
    'Score': [85.5, 92.3, 78.9, 95.1, 88.7],
    'City': ['NYC', 'LA', 'Chicago', 'NYC', 'LA']
})

print("DataFrame:")
print(df)
print()
print("Summary Statistics:")
print(df.describe())`),
];

export const useNotebookStore = create<NotebookState>((set, get) => ({
  cells: defaultCells,
  activeCell: defaultCells[0]?.id ?? null,
  globalExecutionCount: 0,

  addCell: (afterId?: string) => {
    const newCell = createCell();
    set((state) => {
      if (!afterId) {
        return { cells: [...state.cells, newCell] };
      }
      const index = state.cells.findIndex((c) => c.id === afterId);
      if (index === -1) {
        return { cells: [...state.cells, newCell] };
      }
      const newCells = [...state.cells];
      newCells.splice(index + 1, 0, newCell);
      return { cells: newCells, activeCell: newCell.id };
    });
  },

  removeCell: (id: string) => {
    set((state) => {
      if (state.cells.length <= 1) return state;
      const newCells = state.cells.filter((c) => c.id !== id);
      const wasActive = state.activeCell === id;
      return {
        cells: newCells,
        activeCell: wasActive ? newCells[0]?.id ?? null : state.activeCell,
      };
    });
  },

  updateCellCode: (id: string, code: string) => {
    set((state) => ({
      cells: state.cells.map((c) => (c.id === id ? { ...c, code } : c)),
    }));
  },

  setCellOutput: (id: string, output: ExecutionResult) => {
    set((state) => ({
      cells: state.cells.map((c) => (c.id === id ? { ...c, output } : c)),
    }));
  },

  setCellRunning: (id: string, running: boolean) => {
    set((state) => ({
      cells: state.cells.map((c) =>
        c.id === id ? { ...c, isRunning: running } : c
      ),
    }));
  },

  setActiveCell: (id: string | null) => {
    set({ activeCell: id });
  },

  incrementExecutionCount: () => {
    const newCount = get().globalExecutionCount + 1;
    set({ globalExecutionCount: newCount });
    return newCount;
  },

  setCellExecutionCount: (id: string, count: number) => {
    set((state) => ({
      cells: state.cells.map((c) =>
        c.id === id ? { ...c, executionCount: count } : c
      ),
    }));
  },

  moveCell: (id: string, direction: "up" | "down") => {
    set((state) => {
      const index = state.cells.findIndex((c) => c.id === id);
      if (index === -1) return state;
      
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= state.cells.length) return state;
      
      const newCells = [...state.cells];
      [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
      return { cells: newCells };
    });
  },

  clearAllOutputs: () => {
    set((state) => ({
      cells: state.cells.map((c) => ({
        ...c,
        output: null,
        executionCount: null,
      })),
      globalExecutionCount: 0,
    }));
  },
}));
