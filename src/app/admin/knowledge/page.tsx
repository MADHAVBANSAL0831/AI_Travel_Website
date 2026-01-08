"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Brain,
  FileUp,
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rag/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    let uploadSuccess = false;
    const uploadedFiles: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "personality");

      try {
        const res = await fetch("/api/rag/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          uploadedFiles.push(file.name);
          uploadSuccess = true;
        } else {
          setError(data.error || "Upload failed");
        }
      } catch (err) {
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);

    // Close modal and show success
    if (uploadSuccess) {
      setShowUploadModal(false);
      setSuccess(`Successfully uploaded: ${uploadedFiles.join(", ")}`);
      await fetchDocuments();
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/rag/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        setSuccess("Document deleted");
        fetchDocuments();
      } else {
        setError("Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete document");
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/rag/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchDocuments();
      }
    } catch (err) {
      setError("Failed to update document");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Knowledge Base</h1>
                <p className="text-purple-200 text-sm">Manage your AI assistant&apos;s knowledge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDocuments}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-sm text-purple-200">Total Files</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{documents.filter(d => d.isActive).length}</p>
              <p className="text-sm text-purple-200">Active</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {formatFileSize(documents.reduce((acc, d) => acc + d.fileSize, 0))}
              </p>
              <p className="text-sm text-purple-200">Total Size</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-900">×</button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess(null)} className="hover:text-green-900">×</button>
          </div>
        )}

        {/* Uploaded Files */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Uploaded Files</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-purple-500" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No documents uploaded</p>
              <p className="text-gray-400 text-sm mt-1">Click &quot;Upload File&quot; to add documents</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <div key={doc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  {/* File Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                    ${doc.fileType === "pdf" ? "bg-red-100" :
                      doc.fileType === "docx" ? "bg-blue-100" :
                      "bg-gray-100"
                    }`}>
                    <FileText className={`h-5 w-5
                      ${doc.fileType === "pdf" ? "text-red-600" :
                        doc.fileType === "docx" ? "text-blue-600" :
                        "text-gray-600"
                      }`} />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(doc.id, doc.isActive)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      doc.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      doc.isActive ? "translate-x-7" : "translate-x-1"
                    }`} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-purple-800 text-sm">
            💡 <strong>Tip:</strong> Toggle documents on/off to control what knowledge your AI assistant uses.
            Documents are automatically processed and indexed.
          </p>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-10 text-center transition-all
                  ${dragActive
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-purple-400"
                  }
                  ${uploading ? "pointer-events-none opacity-70" : ""}
                `}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  uploading ? "bg-purple-100" : dragActive ? "bg-purple-100" : "bg-gray-100"
                }`}>
                  {uploading ? (
                    <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
                  ) : (
                    <FileUp className={`h-8 w-8 ${dragActive ? "text-purple-600" : "text-gray-400"}`} />
                  )}
                </div>
                <p className="text-gray-700 font-medium">
                  {uploading ? "Uploading your file..." : "Drop files here or click to browse"}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Supports PDF, DOCX, and TXT files (max 10MB)
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

