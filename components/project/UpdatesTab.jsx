'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, Clock, CheckCircle2, RefreshCcw, Eye } from 'lucide-react'

const schema = z.object({
  text: z.string().min(5, 'Update must be at least 5 characters'),
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE'])
})

const statusStyles = {
  IN_PROGRESS: { label: 'Working', icon: RefreshCcw, color: 'text-blue-600', bg: 'bg-blue-50' },
  IN_REVIEW: { label: 'Review', icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
  DONE: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

export default function UpdatesTab({ project }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { register, handleSubmit, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'IN_PROGRESS' }
  })

  const currentStatus = watch('status')

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await axios.post(`/api/projects/${project.id}/updates`, data)
      reset()
      router.refresh()
    } catch (e) {
      alert("Error saving update")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* ELEGANT INPUT FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="relative group">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50/50 focus-within:border-indigo-200">
          <textarea
            {...register('text')}
            placeholder="What's the latest update on this project?"
            className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-sm resize-none min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60">
            <div className="flex gap-1">
              {Object.entries(statusStyles).map(([key, style]) => (
                <label key={key} className="cursor-pointer">
                  <input type="radio" value={key} {...register('status')} className="hidden" />
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentStatus === key 
                      ? `${style.bg} ${style.color} ring-1 ring-inset ring-${style.color}/20` 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}>
                    {style.label}
                  </span>
                </label>
              ))}
            </div>
            <button
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-all shadow-sm hover:shadow-indigo-200 flex items-center gap-2 px-4 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {isLoading ? 'Posting...' : <><Send className="w-3.5 h-3.5" /> Post</>}
            </button>
          </div>
        </div>
      </form>

      {/* REFINED UPDATE LIST */}
      <div className="space-y-6 relative before:absolute before:inset-0 before:left-[17px] before:w-px before:bg-slate-100">
        {project.updates.map((update) => {
          const style = statusStyles[update.status]
          return (
            <div key={update.id} className="relative pl-10 group">
              <div className={`absolute left-0 top-1 w-9 h-9 rounded-full ${style.bg} border-4 border-white flex items-center justify-center shadow-sm z-10`}>
                <style.icon className={`w-4 h-4 ${style.color}`} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.color}`}>
                    {style.label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(update.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-100 p-4 rounded-2xl shadow-sm group-hover:border-slate-200 transition-colors">
                  {update.text}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}