"use client";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import MaterialsView from "../components/MaterialsView";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Panggil komponen sidebar */}
      <Sidebar onSelectFolder={(id) => setSelectedId(id)} />
      
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-zinc-950">
        {selectedId ? (
          <MaterialsView folderId={selectedId} />
        ) : (
          <div className="mt-10 md:mt-20 flex flex-col items-center justify-center text-zinc-500 h-64 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <p className="text-sm">Silakan pilih atau buat folder di sebelah kiri.</p>
          </div>
        )}
      </div>
    </div>
  );
}