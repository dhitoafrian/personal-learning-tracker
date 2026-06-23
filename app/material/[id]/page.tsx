"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Pencil, Trash2, X, Loader2 } from "lucide-react";

interface Material {
  id: string;
  folder_id: string;
  title: string;
  content: string | null;
  images: string[];
  created_at: string;
}

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const materialId = resolvedParams.id;

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchMaterial() {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("id", materialId)
        .single();

      if (error || !data) {
        router.replace("/");
        return;
      }
      setMaterial(data);
      setLoading(false);
    }
    fetchMaterial();
  }, [materialId, router]);

  const handleDelete = async () => {
    if (!material) return;

    const { error } = await supabase.from("materials").delete().eq("id", material.id);
    if (!error) {
      // Cleanup storage files
      if (material.images && material.images.length > 0) {
        const pathsToDelete = material.images
          .map(url => {
            const parts = url.split("/public/material-assets/");
            return parts.length > 1 ? parts[1] : null;
          })
          .filter(Boolean) as string[];
        if (pathsToDelete.length > 0) {
          supabase.storage.from("material-assets").remove(pathsToDelete);
        }
      }
      // Pindah ke folder yang bersangkutan, bukan sekadar router.back()
      router.replace(`/?folder=${material.folder_id}`);
    }
  };

  const handleEdit = () => {
    // Navigate back to the specific folder with edit flag via query param
    router.push(`/?folder=${material?.folder_id}&edit=${material?.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="text-zinc-500 animate-spin" size={28} />
      </div>
    );
  }

  if (!material) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* TOP NAV */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push(`/?folder=${material.folder_id}`)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleEdit}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
            title="Edit note"
          >
            <Pencil size={17} />
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 leading-tight">
            {material.title}
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            {new Date(material.created_at).toLocaleString()}
          </p>
        </div>

        {material.content && (
          <div className="border-t border-zinc-800 pt-6">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {material.content}
            </p>
          </div>
        )}

        {material.images && material.images.length > 0 && (
          <div className="border-t border-zinc-800 pt-6 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Attached Images ({material.images.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {material.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setZoomedImage(imgUrl)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors focus:outline-none"
                >
                  <img
                    src={imgUrl}
                    alt={`Attachment ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* IMAGE LIGHTBOX */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900/60 p-2 rounded-full transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X size={22} />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-full max-h-full object-contain rounded-lg cursor-default"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* DELETE CONFIRMATION (in-app, no native confirm()) */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Delete note?</h3>
              <p className="text-sm text-zinc-500 mt-1">
                This will permanently delete the note and all attached images.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
