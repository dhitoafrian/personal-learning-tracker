"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "../components/Sidebar";
import MaterialsView from "../components/MaterialsView";
import { Loader2, Folder as FolderIcon, FileText } from "lucide-react";

function Dashboard() {
  const [stats, setStats] = useState({ folders: 0, materials: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { count: foldersCount } = await supabase.from("folders").select("*", { count: "exact", head: true });
      const { count: materialsCount } = await supabase.from("materials").select("*", { count: "exact", head: true });
      setStats({ folders: foldersCount || 0, materials: materialsCount || 0 });
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center text-zinc-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-4 md:mt-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Workspace Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Overview of your learning materials.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-blue-400">
            <FolderIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Total Folders</p>
            <p className="text-3xl font-bold text-zinc-100 mt-1">{stats.folders}</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Total Notes</p>
            <p className="text-3xl font-bold text-zinc-100 mt-1">{stats.materials}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-8 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-center flex flex-col items-center justify-center min-h-[200px]">
        <FolderIcon className="text-zinc-600 mb-3" size={32} />
        <p className="text-zinc-300 font-medium">Select a folder</p>
        <p className="text-zinc-500 text-sm mt-1">Choose a folder from the sidebar to view or add notes.</p>
      </div>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");
  const editId = searchParams.get("edit");

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-zinc-950">
        {folderId ? (
          <MaterialsView folderId={folderId} initialEditId={editId} />
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}