"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, X, Loader2, Trash2, Search, Plus, Camera, Pencil } from "lucide-react";
import imageCompression from "browser-image-compression";

const PAGE_SIZE = 10;

interface Material {
  id: string;
  title: string;
  content: string | null;
  images: string[];
  created_at: string;
}

// Custom in-app confirmation dialog (avoids native confirm() which is blocked in PWA)
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm text-zinc-300">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple toast notification
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-5 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      {message}
    </div>
  );
}

export default function MaterialsView({
  folderId,
  initialEditId,
}: {
  folderId: string;
  initialEditId?: string | null;
}) {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // id to delete

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─── Edit & Cancel ────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setTitle("");
    setContent("");
    setSelectedFiles([]);
    setEditingId(null);
    setExistingImages([]);
    setIsFormOpen(false);
  }, []);

  const startEdit = useCallback((material: Material) => {
    setEditingId(material.id);
    setTitle(material.title);
    setContent(material.content || "");
    setSelectedFiles([]);
    setExistingImages(material.images || []);
    setIsFormOpen(true);
    // No window.scrollTo - use smooth scroll via CSS/ref instead
    document.getElementById("materials-form-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleForm = useCallback(() => {
    if (isFormOpen) handleCancel();
    else setIsFormOpen(true);
  }, [isFormOpen, handleCancel]);

  // ─── Fetch (first page) ───────────────────────────────────────────────────
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    pageRef.current = 0;
    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    setMaterials(data ?? []);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setLoading(false);
  }, [folderId]);

  // ─── Fetch next page ─────────────────────────────────────────────────────
  const fetchNextPage = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data && data.length > 0) {
      setMaterials(prev => [...prev, ...data]);
      pageRef.current = nextPage;
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [folderId, hasMore, loadingMore]);

  // ─── IntersectionObserver for infinite scroll ─────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  // ─── Reload on folder change ──────────────────────────────────────────────
  useEffect(() => {
    fetchFirstPage();
    setTimeout(() => {
      handleCancel();
      setSearchQuery("");
    }, 0);
  }, [folderId, fetchFirstPage, handleCancel]);

  // ─── Auto-open edit from ?edit= query param ───────────────────────────────
  useEffect(() => {
    if (!initialEditId || materials.length === 0) return;
    const target = materials.find(m => m.id === initialEditId);
    if (target) {
      setTimeout(() => {
        startEdit(target);
      }, 0);
    }
    // clear the edit query param without reloading, but KEEP the folder param
    router.replace(`/?folder=${folderId}`, { scroll: false });
  }, [initialEditId, materials, router, startEdit, folderId]);

  // ─── File handling ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Compress & upload ────────────────────────────────────────────────────
  const compressAndUpload = async (file: File): Promise<string | null> => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
      });
      const ext = compressed.name.split(".").pop();
      const filePath = `${folderId}/${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("material-assets").upload(filePath, compressed);
      if (error) return null;
      return supabase.storage.from("material-assets").getPublicUrl(filePath).data.publicUrl;
    } catch {
      return null;
    }
  };

  // ─── Submit (add / edit) ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast("Session expired. Please login again.");
      setIsSubmitting(false);
      return;
    }

    const uploadedUrls: string[] = [];
    for (const file of selectedFiles) {
      const url = await compressAndUpload(file);
      if (url) uploadedUrls.push(url);
    }

    if (editingId) {
      const updatedImages = [...existingImages, ...uploadedUrls];

      // Garbage collect removed images from storage
      const original = materials.find(m => m.id === editingId);
      if (original?.images) {
        const removed = original.images.filter(img => !existingImages.includes(img));
        const paths = removed
          .map(url => url.split("/public/material-assets/")[1])
          .filter(Boolean);
        if (paths.length > 0) supabase.storage.from("material-assets").remove(paths);
      }

      const { error } = await supabase
        .from("materials")
        .update({ title, content: content || null, images: updatedImages })
        .eq("id", editingId);

      if (!error) {
        handleCancel();
        fetchFirstPage();
        setToast("Note updated.");
      }
    } else {
      const { error } = await supabase.from("materials").insert([{
        folder_id: folderId,
        user_id: user.id,
        title,
        content: content || null,
        images: uploadedUrls,
      }]);

      if (!error) {
        handleCancel();
        fetchFirstPage();
        setToast("Note saved.");
      }
    }

    setIsSubmitting(false);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const confirmAndDelete = (id: string) => setConfirmDelete(id);

  const executDelete = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;

    const target = materials.find(m => m.id === id);
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (!error) {
      setMaterials(prev => prev.filter(m => m.id !== id));
      // Cleanup storage
      if (target?.images?.length) {
        const paths = target.images
          .map(url => url.split("/public/material-assets/")[1])
          .filter(Boolean);
        if (paths.length > 0) supabase.storage.from("material-assets").remove(paths);
      }
      setToast("Note deleted.");
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredMaterials = searchQuery
    ? materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : materials;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10" id="materials-form-top">

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-600"
          />
        </div>
        <button
          onClick={toggleForm}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
            isFormOpen ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-900 hover:bg-white"
          }`}
        >
          {isFormOpen ? <X size={16} /> : <Plus size={16} />}
          {isFormOpen ? "Cancel" : "Add Note"}
        </button>
      </div>

      {/* COLLAPSIBLE FORM */}
      <div className={`grid transition-all duration-300 ease-in-out ${isFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-2">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              {editingId ? `Edit: ${title}` : "Add New Note"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Title (e.g. Chapter 1 Summary)"
                required
                className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 w-full"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Write your notes here (optional)..."
                rows={3}
                className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 w-full resize-y"
                value={content}
                onChange={e => setContent(e.target.value)}
              />

              {/* Existing images in edit mode */}
              {editingId && existingImages.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-500 font-medium">Current Images:</span>
                  <div className="flex flex-wrap gap-3">
                    {existingImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-800">
                        <img src={imgUrl} alt="existing" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 text-zinc-300 rounded-full p-1 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New file previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-500 font-medium">New Images:</span>
                  <div className="flex flex-wrap gap-3">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative w-20 h-20 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg">
                    <ImageIcon size={16} />
                    <span>Gallery</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </label>
                  <label className="cursor-pointer flex md:hidden items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg">
                    <Camera size={16} />
                    <span>Camera</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="bg-zinc-100 text-zinc-900 px-6 py-2 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingId ? "Save Changes" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MATERIALS LIST */}
      <div className="flex flex-col gap-4">
        {filteredMaterials.length === 0 && !loading ? (
          <div className="text-center text-zinc-500 py-10 border border-dashed border-zinc-800 rounded-xl">
            {searchQuery ? "No notes match your search." : "No notes here yet. Click 'Add Note' to create one!"}
          </div>
        ) : (
          filteredMaterials.map(material => (
            <div
              key={material.id}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 group relative transition-all cursor-pointer flex flex-col"
              onClick={() => router.push(`/material/${material.id}`)}
            >
              {/* Actions — visible on hover (desktop) or always on mobile */}
              <div
                className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => startEdit(material)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
                  title="Edit note"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => confirmAndDelete(material.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h4 className="text-lg font-medium text-zinc-100 pr-16">{material.title}</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                {new Date(material.created_at).toLocaleString()}
              </p>

              {material.content && (
                <p className="text-sm text-zinc-400 line-clamp-3 whitespace-pre-wrap mb-4 pr-2">
                  {material.content}
                </p>
              )}

              {material.images && material.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {material.images.slice(0, 4).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-zinc-900 shrink-0"
                    >
                      <img src={imgUrl} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {material.images.length > 4 && (
                    <div className="w-20 h-20 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 text-sm font-medium shrink-0">
                      +{material.images.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* INFINITE SCROLL SENTINEL */}
        {!searchQuery && (
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loadingMore && <Loader2 className="animate-spin text-zinc-600" size={20} />}
            {!hasMore && materials.length > 0 && (
              <p className="text-xs text-zinc-700">All notes loaded.</p>
            )}
          </div>
        )}
      </div>

      {/* IN-APP DELETE CONFIRMATION */}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this note? All attached images will also be permanently removed."
          onConfirm={executDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* TOAST */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
