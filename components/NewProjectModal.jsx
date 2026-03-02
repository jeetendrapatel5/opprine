'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const schema = z.object({
  name:        z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  clientName:  z.string().min(2, 'Client name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email'),
})

export default function NewProjectModal({ userId }) {
  const [isOpen, setIsOpen]     = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')

    try {
      await axios.post('/api/projects', {
        ...data,
        userId
      })

      // Close modal and reset form
      setIsOpen(false)
      reset()

      // Refresh the page to show new project
      // router.refresh() tells Next.js to re-fetch server data
      router.refresh()

    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Button that opens modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + New Project
      </button>

      {/* Modal — only renders when isOpen is true */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          {/* Dark overlay behind modal */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)} // click outside to close
          />

          {/* Modal box */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 z-10">

            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Create New Project
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  {...register('name')}
                  placeholder="Website Redesign"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Brief description of the project"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <hr className="border-gray-100" />

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Client Details
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  {...register('clientName')}
                  placeholder="Rahul Sharma"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email
                </label>
                <input
                  {...register('clientEmail')}
                  type="email"
                  placeholder="rahul@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{errors.clientEmail.message}</p>}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}