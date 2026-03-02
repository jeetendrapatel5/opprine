// components/project/FilesTab.jsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

// Format bytes to human readable size
// 1024 → "1 KB", 1048576 → "1 MB"
function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Get a simple icon based on file type
function fileIcon(fileType) {
  if (fileType.startsWith('image/'))       return '🖼️'
  if (fileType === 'application/pdf')      return '📄'
  if (fileType.includes('spreadsheet') ||
      fileType.includes('excel'))          return '📊'
  if (fileType.includes('word') ||
      fileType.includes('document'))       return '📝'
  if (fileType.includes('zip') ||
      fileType.includes('compressed'))     return '🗜️'
  return '📁'
}

export default function FilesTab({ project }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError]                   = useState('')
  const [isDragging, setIsDragging]         = useState(false)

  // useRef gives us direct access to the hidden file input element
  const fileInputRef = useRef(null)
  const router = useRouter()

  // This function handles the actual upload logic
  // Called from both the button click and drag+drop
  const uploadFile = async (file) => {
    if (!file) return

    // Check file size — limit to 10MB
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be under 10MB')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadProgress(`Uploading ${file.name}...`)

    try {
      // FormData is how you send files in HTTP requests
      // It is different from JSON — files cannot be JSON encoded
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', project.id)

      await axios.post('/api/files', formData, {
        // Do NOT set Content-Type header manually
        // Axios sets it automatically with the correct boundary for FormData
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setUploadProgress('')
      router.refresh() // re-fetch page data to show new file

    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Try again.')
      setUploadProgress('')
    } finally {
      setIsUploading(false)
      // Reset the file input so same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handle file selected from browser dialog
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) uploadFile(file)
  }

  // Handle file dropped onto the drop zone
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  return (
    <div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : isUploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        {/* Hidden file input — triggered by clicking the drop zone */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <>
            <p className="text-2xl mb-2">⏳</p>
            <p className="text-sm text-blue-600 font-medium">{uploadProgress}</p>
            <p className="text-xs text-gray-400 mt-1">Please wait...</p>
          </>
        ) : (
          <>
            <p className="text-2xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">
              Drag and drop a file here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Max size: 10MB
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* File List */}
      {project.files.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No files uploaded yet
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
            >
              {/* File info */}
              <div className="flex items-center gap-3">
                <span className="text-xl">{fileIcon(file.fileType)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>

              {/* Download button */}
              
                <a href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Download ↗
              </a>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}