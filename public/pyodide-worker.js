/* eslint-disable no-undef */
// Pyodide Web Worker - runs Python code in isolated context
let pyodide = null;
let isInitialized = false;

// Import Pyodide from CDN
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

// Helper code for matplotlib and output capture
const helperCode = `
import sys
import io

class OutputCapture:
    def __init__(self):
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()
        self._old_stdout = None
        self._old_stderr = None
    
    def start(self):
        self._old_stdout = sys.stdout
        self._old_stderr = sys.stderr
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()
        sys.stdout = self.stdout
        sys.stderr = self.stderr
    
    def stop(self):
        sys.stdout = self._old_stdout
        sys.stderr = self._old_stderr
        return self.stdout.getvalue(), self.stderr.getvalue()

_output_capture = OutputCapture()

def _setup_matplotlib():
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        
        plt.style.use('dark_background')
        plt.rcParams.update({
            'figure.facecolor': '#1a1a1a',
            'axes.facecolor': '#1a1a1a',
            'axes.edgecolor': '#404040',
            'axes.labelcolor': '#e0e0e0',
            'text.color': '#e0e0e0',
            'xtick.color': '#e0e0e0',
            'ytick.color': '#e0e0e0',
            'grid.color': '#404040',
            'legend.facecolor': '#1a1a1a',
            'legend.edgecolor': '#404040',
        })
        return True
    except ImportError:
        return False

def _get_matplotlib_figures():
    try:
        import matplotlib.pyplot as plt
        import base64
        from io import BytesIO
        
        figures = []
        for fig_num in plt.get_fignums():
            fig = plt.figure(fig_num)
            buf = BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', 
                       facecolor='#1a1a1a', edgecolor='none')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            figures.append(f"data:image/png;base64,{img_base64}")
            buf.close()
        
        plt.close('all')
        return figures
    except ImportError:
        return []

_setup_matplotlib();
`;

async function initializePyodide() {
  if (isInitialized) return;
  
  try {
    self.postMessage({ type: "status", message: "Loading Pyodide runtime..." });
    
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
    });
    
    self.postMessage({ type: "status", message: "Installing packages (numpy, pandas, matplotlib)..." });
    
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    
    await micropip.install(["numpy", "pandas", "matplotlib"]);
    
    self.postMessage({ type: "status", message: "Setting up Python environment..." });
    
    await pyodide.runPythonAsync(helperCode);
    
    isInitialized = true;
    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({ 
      type: "error", 
      error: "Failed to initialize Pyodide: " + error.message 
    });
  }
}

async function runCode(code, cellId) {
  if (!isInitialized) {
    self.postMessage({
      type: "result",
      cellId: cellId,
      result: {
        stdout: "",
        stderr: "Python environment not ready. Please wait...",
        result: null,
        images: [],
        executionTime: 0,
        error: true,
      }
    });
    return;
  }
  
  const startTime = performance.now();
  
  try {
    await pyodide.runPythonAsync("_output_capture.start()");
    
    let result;
    try {
      result = await pyodide.runPythonAsync(code);
    } catch (execError) {
      const outputProxy = await pyodide.runPythonAsync("_output_capture.stop()");
      const stdout = outputProxy.get(0) || "";
      const stderr = outputProxy.get(1) || "";
      
      const imagesProxy = await pyodide.runPythonAsync("_get_matplotlib_figures()");
      const images = imagesProxy.toJs ? imagesProxy.toJs() : [];
      
      const endTime = performance.now();
      
      self.postMessage({
        type: "result",
        cellId: cellId,
        result: {
          stdout: stdout,
          stderr: stderr + "\n" + execError.message,
          result: null,
          images: images,
          executionTime: endTime - startTime,
          error: true,
        }
      });
      return;
    }
    
    const outputProxy = await pyodide.runPythonAsync("_output_capture.stop()");
    const stdout = outputProxy.get(0) || "";
    const stderr = outputProxy.get(1) || "";
    
    const imagesProxy = await pyodide.runPythonAsync("_get_matplotlib_figures()");
    const images = imagesProxy.toJs ? imagesProxy.toJs() : [];
    
    const endTime = performance.now();
    
    let resultStr = null;
    if (result !== undefined && result !== null) {
      try {
        const str = String(result);
        if (str !== "None" && str !== "undefined") {
          resultStr = str;
        }
      } catch (e) {
        resultStr = null;
      }
    }
    
    self.postMessage({
      type: "result",
      cellId: cellId,
      result: {
        stdout: stdout,
        stderr: stderr,
        result: resultStr,
        images: images,
        executionTime: endTime - startTime,
        error: false,
      }
    });
  } catch (error) {
    const endTime = performance.now();
    self.postMessage({
      type: "result",
      cellId: cellId,
      result: {
        stdout: "",
        stderr: error.message,
        result: null,
        images: [],
        executionTime: endTime - startTime,
        error: true,
      }
    });
  }
}

async function restartKernel() {
  isInitialized = false;
  pyodide = null;
  await initializePyodide();
}

self.onmessage = async function(event) {
  const data = event.data;
  const type = data.type;
  const code = data.code;
  const cellId = data.cellId;
  
  if (type === "init") {
    await initializePyodide();
  } else if (type === "run") {
    await runCode(code, cellId);
  } else if (type === "restart") {
    await restartKernel();
  }
};
