import { FileIcon, Download, ExternalLink } from 'lucide-react'

export default function FileDeliverables({ files }) {
  if (files.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No files delivered yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {files.map((file) => (
        <div key={file.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 transition-colors">
              <FileIcon className="w-5 h-5 text-blue-600 group-hover:text-white" />
            </div>
            <div className="max-w-[140px] md:max-w-none">
              <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                {(file.size / 1024).toFixed(1)} KB • {file.fileType}
              </p>
            </div>
          </div>
          <a 
            href={file.url} 
            target="_blank" 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-gray-500" />
          </a>
        </div>
      ))}
    </div>
  )
}