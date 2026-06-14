"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      alert(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Personal Workspace</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to manage your notes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-100 text-zinc-900 font-medium text-sm rounded-lg px-4 py-2.5 mt-2 hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
