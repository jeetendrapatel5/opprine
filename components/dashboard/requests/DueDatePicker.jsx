// components/dashboard/requests/DueDatePicker.jsx
// Due-date field: a button that opens the shadcn Calendar in a Popover.
//
// `value` / `onChange` use "YYYY-MM-DD" strings ('' = no date), exactly what
// the API takes. Days before today and more than ~2 years ahead are disabled,
// mirroring the server rule (the server is the real check).

'use client'

import { useId, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ActionButton, labelClass, pickerPopoverClass, pickerTriggerClass } from './request-ui'
import {
  MAX_DUE_DAYS_AHEAD,
  formatInputDate,
  parseDateInput,
  startOfDay,
  toDateInputValue,
} from './request-format'

const PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]

export default function DueDatePicker({ id, label, value, onChange, disabled }) {
  const labelId = useId()
  const [open, setOpen] = useState(false)

  const selected = parseDateInput(value)
  const today = startOfDay()
  const latest = startOfDay(MAX_DUE_DAYS_AHEAD)

  function choose(next) {
    onChange(next ? toDateInputValue(next) : '')
    setOpen(false)
  }

  return (
    <div>
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            // The name is the label plus the shown date, so screen readers hear both.
            aria-labelledby={`${labelId} ${id}`}
            className={cn(pickerTriggerClass, 'flex items-center rounded-lg border')}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-fp-text-secondary" aria-hidden="true" />
            <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-fp-text-secondary')}>
              {selected ? formatInputDate(value) : 'No due date'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          className={cn(pickerPopoverClass, 'w-auto overflow-hidden p-0')}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            selected={selected}
            onSelect={choose}
            defaultMonth={selected && selected >= today ? selected : today}
            startMonth={today}
            endMonth={latest}
            disabled={[{ before: today }, { after: latest }]}
            className="p-3 [--cell-size:--spacing(9)]"
            classNames={{
              weekday: 'flex-1 text-[10px] font-semibold uppercase tracking-wider text-fp-text-secondary select-none',
              caption_label: 'text-sm font-semibold text-fp-text-primary select-none',
              disabled: 'text-fp-text-tertiary opacity-60',
              outside: 'text-fp-text-tertiary aria-selected:text-fp-text-tertiary',
            }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-fp-border px-3 py-2">
            <ActionButton variant="ghost" className="h-7 px-2" disabled={!selected} onClick={() => choose(undefined)}>
              Clear
            </ActionButton>
            <div className="flex items-center gap-1">
              {PRESETS.map((preset) => (
                <ActionButton
                  key={preset.label}
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => choose(startOfDay(preset.days))}
                >
                  {preset.label}
                </ActionButton>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}