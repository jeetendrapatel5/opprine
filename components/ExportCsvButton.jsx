'use client'

import { Download } from 'lucide-react'

function toCsvValue(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export default function ExportCsvButton({ invoices }) {
  function handleExport() {
    const headers = ['Invoice', 'Client', 'Project', 'Amount', 'Currency', 'Status', 'Due Date', 'Created']
    const rows = invoices.map((inv) => [
      inv.number,
      inv.project?.client?.name ?? '',
      inv.project?.name ?? '',
      inv.amount,
      inv.currency,
      inv.status,
      inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      new Date(inv.createdAt).toISOString().slice(0, 10),
    ])
    const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={invoices.length === 0}
      className="inline-flex items-center gap-1.5 border border-fp-border text-fp-text-secondary text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-fp-surface hover:text-fp-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-3.5 h-3.5" />
      Export
    </button>
  )
}