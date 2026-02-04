"use client";

import { PyodideProvider } from "@/lib/pyodide-context";
import { Notebook } from "@/components/notebook/notebook";

export default function Home() {
  return (
    <PyodideProvider>
      <Notebook />
    </PyodideProvider>
  );
}
