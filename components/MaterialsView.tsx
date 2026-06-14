"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, X, Loader2, Trash2, Search, Plus, Camera, Pencil, Eye } from "lucide-react";
import imageCompression from "browser-image-compression";

interface Material {
  id: string;
  title: string;
  content: string | null;
  images: string[];
  created_at: string;
}

export default function MaterialsView({ folderId }: { folderId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [detailMaterial, setDetailMaterial] = useState<Material | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    fetchMaterials();
    handleCancel(); // Reset form states when folder changes
  }, [folderId]);

  async function fetchMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (data) setMaterials(data);
    setLoading(false);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const compressAndUpload = async (file: File): Promise<string | null> => {
    const options = {
      maxSizeMB: 1, // Diubah ke 1MB sebagai jalan tengah (kualitas tetap bagus, storage aman)
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8, // Kualitas awal diturunkan sedikit untuk memastikan file cukup kecil
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("material-assets")
        .upload(filePath, compressedFile);

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("material-assets")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Compression error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login first");
      setIsSubmitting(false);
      return;
    }

    // Upload images first
    const uploadedUrls: string[] = [];
    for (const file of selectedFiles) {
      const url = await compressAndUpload(file);
      if (url) uploadedUrls.push(url);
    }

    if (editingId) {
      // Update logic
      const updatedImages = [...existingImages, ...uploadedUrls];
      
      // Hapus file fisik dari storage jika ada gambar yang di-remove saat edit
      const originalMaterial = materials.find(m => m.id === editingId);
      if (originalMaterial && originalMaterial.images) {
        const deletedImages = originalMaterial.images.filter(img => !existingImages.includes(img));
        if (deletedImages.length > 0) {
          const pathsToDelete = deletedImages.map(url => {
            const parts = url.split("/public/material-assets/");
            return parts.length > 1 ? parts[1] : null;
          }).filter(Boolean) as string[];

          if (pathsToDelete.length > 0) {
            supabase.storage.from("material-assets").remove(pathsToDelete).catch(err => {
              console.error("Storage cleanup failed:", err);
            });
          }
        }
      }

      const { error } = await supabase
        .from("materials")
        .update({
          title: title,
          content: content || null,
          images: updatedImages
        })
        .eq("id", editingId);

      if (error) {
        alert("Failed to update material: " + error.message);
      } else {
        handleCancel();
        fetchMaterials();
      }
    } else {
      // Insert logic
      const { error } = await supabase.from("materials").insert([{
        folder_id: folderId,
        user_id: user.id,
        title: title,
        content: content || null,
        images: uploadedUrls
      }]);

      if (error) {
        alert("Failed to save material: " + error.message);
      } else {
        handleCancel();
        fetchMaterials();
      }
    }
    
    setIsSubmitting(false);
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    
    // Cari material yang ingin didelete untuk dihapus gambarnya dari storage
    const targetMaterial = materials.find(m => m.id === id);

    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (!error) {
      setMaterials(materials.filter(m => m.id !== id));
      if (detailMaterial?.id === id) {
        setDetailMaterial(null);
      }

      // Hapus semua file fisik gambar dari storage
      if (targetMaterial && targetMaterial.images && targetMaterial.images.length > 0) {
        const pathsToDelete = targetMaterial.images.map(url => {
          const parts = url.split("/public/material-assets/");
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
          supabase.storage.from("material-assets").remove(pathsToDelete).catch(err => {
            console.error("Storage deletion failed:", err);
          });
        }
      }
    }
  };

  const startEdit = (material: Material) => {
    setEditingId(material.id);
    setTitle(material.title);
    setContent(material.content || "");
    setSelectedFiles([]);
    setExistingImages(material.images || []);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setTitle("");
    setContent("");
    setSelectedFiles([]);
    setEditingId(null);
    setExistingImages([]);
    setIsFormOpen(false);
  };

  const toggleForm = () => {
    if (isFormOpen) {
      handleCancel();
    } else {
      setIsFormOpen(true);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-zinc-500"><Loader2 className="animate-spin" /></div>;
  }

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* COLLAPSIBLE ADD/EDIT MATERIAL FORM */}
      <div className={`grid transition-all duration-300 ease-in-out ${isFormOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-2">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              {editingId ? `Edit Note: ${title}` : "Add New Material / Note"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Title (e.g. Chapter 1 Summary)"
                required
                className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Write your notes here (optional)..."
                rows={3}
                className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 w-full resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              
              {/* EXISTING IMAGES PREVIEW (ONLY IN EDIT MODE) */}
              {editingId && existingImages.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-500 font-medium">Current Images:</span>
                  <div className="flex flex-wrap gap-3">
                    {existingImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative w-20 h-20 bg-zinc-850 rounded-lg overflow-hidden border border-zinc-800">
                        <img src={imgUrl} alt="existing preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 text-zinc-300 rounded-full p-1 hover:bg-red-500 hover:text-white transition-colors"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEW IMAGE PREVIEW AREA */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-500 font-medium">New Images to Attach:</span>
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
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />
                  </label>
                  
                  {/* TOMBOL KAMERA KHUSUS MOBILE */}
                  <label className="cursor-pointer flex md:hidden items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg">
                    <Camera size={16} />
                    <span>Camera</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />
                  </label>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={handleCancel}
                      className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center"
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
        {filteredMaterials.length === 0 ? (
          <div className="text-center text-zinc-500 py-10 border border-dashed border-zinc-800 rounded-xl">
            {searchQuery ? "No notes match your search." : "No notes here yet. Click 'Add Note' to create one!"}
          </div>
        ) : (
          filteredMaterials.map(material => (
            <div 
              key={material.id} 
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 group relative transition-all cursor-pointer flex flex-col"
              onClick={() => setDetailMaterial(material)}
            >
              {/* Card Actions (Visible on Hover / Mobile always visible) */}
              <div 
                className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => startEdit(material)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
                  title="Edit note"
                >
                  <Pencil size={15} />
                </button>
                <button 
                  onClick={() => deleteMaterial(material.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              
              <h4 className="text-lg font-medium text-zinc-100 pr-16">{material.title}</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-3">{new Date(material.created_at).toLocaleString()}</p>
              
              {material.content && (
                <p className="text-sm text-zinc-400 line-clamp-3 whitespace-pre-wrap mb-4 pr-2">
                  {material.content}
                </p>
              )}
              
              {material.images && material.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {material.images.map((imgUrl, idx) => (
                    <button 
                      key={idx} 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Stop opening the detail modal
                        setZoomedImage(imgUrl);
                      }}
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-zinc-900 hover:border-zinc-650 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-600 shrink-0"
                    >
                      <img src={imgUrl} alt={`Attachment ${idx+1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DETAIL VIEW MODAL */}
      {detailMaterial && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailMaterial(null)}
        >
          <div 
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-100">{detailMaterial.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{new Date(detailMaterial.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    startEdit(detailMaterial);
                    setDetailMaterial(null);
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Edit note"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => {
                    deleteMaterial(detailMaterial.id);
                    setDetailMaterial(null);
                  }}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => setDetailMaterial(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 border-t border-zinc-800 pt-4">
              {detailMaterial.content ? (
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {detailMaterial.content}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 italic">No text content in this note.</p>
              )}

              {detailMaterial.images && detailMaterial.images.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attached Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detailMaterial.images.map((imgUrl, idx) => (
                      <button 
                        key={idx} 
                        type="button"
                        onClick={() => setZoomedImage(imgUrl)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                      >
                        <img src={imgUrl} alt={`Attachment ${idx+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-102" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={20} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX / ZOOM OVERLAY */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 text-zinc-400 hover:text-white bg-zinc-900/50 p-2 rounded-full transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed attachment" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
