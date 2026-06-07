"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Sekarang @ sudah berfungsi

export default function Sidebar({ onSelectFolder }: { onSelectFolder: (id: string) => void }) {
  const [folders, setFolders] = useState<any[]>([]);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const { data } = await supabase.from("folders").select("*").order("created_at", { ascending: false });
    if (data) setFolders(data);
  };

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

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4">
      <h2 className="font-bold mb-4">Folder Catatan</h2>
      <div className="flex gap-2 mb-4">
        <input 
          className="bg-gray-800 text-sm p-1 rounded w-full" 
          value={newFolderName} 
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button onClick={addFolder} className="bg-blue-600 px-2 rounded">+</button>
      </div>
      {folders.map(f => (
        <button key={f.id} onClick={() => onSelectFolder(f.id)} className="block w-full text-left p-2 hover:bg-gray-700 rounded text-sm">
          📁 {f.name}
        </button>
      ))}
    </div>
  );
}