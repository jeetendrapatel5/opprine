// components/project/UpdatesTab.jsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const schema = z.object({
  text:   z.string().min(5, 'Update must be at least 5 characters'),
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE'])
})

// Same config used in portal — keeps UI consistent
const updateConfig = {
  IN_PROGRESS: { label: 'In Progress', icon: '🔄', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_REVIEW:   { label: 'In Review',   icon: '👀', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  DONE:        { label: 'Done',        icon: '✅', class: 'bg-green-50 text-green-700 border-green-200' },
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export default function UpdatesTab({ project }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState('')
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'IN_PROGRESS' }  // default selected status
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')

    try {
      await axios.post('/api/updates', {
        ...data,
        projectId: project.id
      })

      reset()         // clear the form
      router.refresh() // re-fetch server data to show new update

    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>

      {/* Post Update Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Post an Update
        </h3>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

          {/* Update text */}
          <div>
            <textarea
              {...register('text')}
              placeholder="What did you work on? e.g. Completed the homepage design and sent it for review..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.text && (
              <p className="text-red-500 text-xs mt-1">{errors.text.message}</p>
            )}
          </div>

          {/* Status selector + Submit button on same row */}
          <div className="flex items-center gap-3">

            <select
              {...register('status')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="IN_PROGRESS">🔄 In Progress</option>
              <option value="IN_REVIEW">👀 In Review</option>
              <option value="DONE">✅ Done</option>
            </select>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Posting...' : 'Post Update'}
            </button>

          </div>

        </form>
      </div>

      {/* Previous Updates */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Previous Updates
      </h3>

      {project.updates.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No updates posted yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {project.updates.map((update) => {
            const config = updateConfig[update.status]
            return (
              <div
                key={update.id}
                className={`rounded-xl border p-4 ${config.class}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{config.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {timeAgo(update.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {update.text}
                </p>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}