"use client";
import { useState } from "react";
// Kita pakai ../ supaya dia langsung cari ke folder sebelah
import Sidebar from "../components/Sidebar"; 

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-white text-black">
      {/* Panggil komponen sidebar */}
      <Sidebar onSelectFolder={(id) => setSelectedId(id)} />
      
      <div className="flex-1 p-10">
        <h1 className="text-xl font-bold">Konten Utama</h1>
        {selectedId ? (
          <p className="mt-4">Folder ID yang dipilih: <span className="font-mono bg-gray-100 p-1">{selectedId}</span></p>
        ) : (
          <p className="mt-4 text-gray-400">Silakan pilih folder di sebelah kiri.</p>
        )}
      </div>
    </div>
  );
}