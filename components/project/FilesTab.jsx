"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation' // THE MISSING IMPORT
import { FileIcon, ExternalLink, Trash2, Clock, Loader2, Upload } from 'lucide-react'
import axios from 'axios'

// Helper: Format bytes to human readable size
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Helper: Get a simple icon based on file type
function fileIcon(fileType) {
  if (!fileType) return '📁'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊'
  if (fileType.includes('word') || fileType.includes('document')) return '📝'
  if (fileType.includes('zip') || fileType.includes('compressed')) return '🗜️'
  return '📁'
}

export default function FilesTab({ project }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const router = useRouter() // Now correctly defined

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    
    // Create FormData for the upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', project.id)

    try {
      // Assuming you have an API route at /api/projects/[id]/files
      await axios.post(`/api/projects/${project.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Refresh the server components to show the new file
      router.refresh() 
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload file. Check your API route.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Deliverables</h3>
            <p className="text-xs text-gray-500 mt-1">Upload files to share them with your client.</p>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Asset
              </>
            )}
          </button>
        </div>
      </div>

      {/* File List Grid */}
      <div className="grid gap-3">
        {project.files?.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400 font-medium">No assets delivered yet.</p>
          </div>
        ) : (
          project.files?.map((file) => (
            <div key={file.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg">
                  {fileIcon(file.fileType)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{file.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">
                    <span>{formatSize(file.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                  title="View/Download"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}