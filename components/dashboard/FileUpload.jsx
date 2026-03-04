"use client"
import { useState } from 'react';
import { Upload, FileIcon, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function FileUpload({ projectId, onUploadSuccess }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = () => {
        // Open the Cloudinary widget
        window.cloudinary.openUploadWidget({
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            uploadPreset: 'your_unsigned_preset', // Set this in Cloudinary settings
            sources: ['local', 'url', 'google_drive'],
            multiple: false
        }, async (error, result) => {
            if (!error && result && result.event === "success") {
                setUploading(true);
                const fileData = {
                    name: result.info.original_filename,
                    url: result.info.secure_url,
                    size: result.info.bytes,
                    fileType: result.info.format
                };

                try {
                    const res = await axios.post(`/api/projects/${projectId}/files`, fileData);
                    onUploadSuccess(res.data);
                } finally {
                    setUploading(false);
                }
            }
        });
    };

    return (
        <button 
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
        >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Saving..." : "Deliver Asset"}
        </button>
    );
}