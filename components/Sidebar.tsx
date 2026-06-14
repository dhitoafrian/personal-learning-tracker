"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import { Folder, Plus, Trash2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Sidebar({ onSelectFolder }: { onSelectFolder: (id: string) => void }) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    } else {
      fetchFolders();
    }
  }

  async function fetchFolders() {
    const { data } = await supabase.from("folders").select("*").order("created_at", { ascending: false });
    if (data) setFolders(data);
  }

  const addFolder = async () => {
    if (!newFolderName) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login dulu bro");

    const { error } = await supabase.from("folders").insert([{ name: newFolderName, user_id: user.id }]);
    if (!error) {
      setNewFolderName("");
      fetchFolders();
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Hapus folder ini? Semua catatan di dalamnya akan ikut terhapus.")) return;
    
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (!error) {
      setFolders(folders.filter(f => f.id !== id));
      onSelectFolder(""); // Reset selection if deleted
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="w-full md:w-64 h-auto md:h-screen flex-none bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 text-zinc-100 p-4 flex flex-col">
      <div className="flex items-center justify-between md:mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider hidden md:block">Workspace</h2>
        <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-300 md:block hidden" title="Logout">
          <LogOut size={16} />
        </button>
      </div>
      
      <div className="flex gap-2 mb-4 md:mb-6 mt-2 md:mt-0">
        <input 
          className="bg-zinc-900 border border-zinc-800 text-sm p-2 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-600" 
          placeholder="New folder..."
          value={newFolderName} 
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFolder()}
        />
        <button onClick={addFolder} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-md transition-colors flex items-center justify-center shrink-0">
          <Plus size={16} />
        </button>
        {/* Mobile logout button */}
        <button onClick={handleLogout} className="md:hidden bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-2 rounded-md shrink-0 flex items-center justify-center">
          <LogOut size={16} />
        </button>
      </div>

      <div className="flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 scrollbar-hide">
        {folders.map(f => (
          <div key={f.id} className="group relative flex items-center shrink-0 md:w-full">
            <button 
              onClick={() => onSelectFolder(f.id)} 
              className="flex-1 flex items-center gap-2 md:gap-3 w-full text-left px-3 py-2 bg-zinc-900 md:bg-transparent hover:bg-zinc-800 md:hover:bg-zinc-900 border border-zinc-800 md:border-transparent rounded-md text-sm text-zinc-300 hover:text-zinc-50 transition-colors pr-8 md:pr-3"
            >
              <Folder size={16} className="text-zinc-500 shrink-0" />
              <span className="truncate max-w-[120px] md:max-w-none">{f.name}</span>
            </button>
            <button 
              onClick={() => deleteFolder(f.id)} 
              className="absolute right-2 text-zinc-600 hover:text-red-400 md:opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete folder"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}