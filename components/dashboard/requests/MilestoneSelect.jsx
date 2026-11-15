// components/dashboard/requests/MilestoneSelect.jsx
// "For milestone" picker (shadcn Select). The value is a milestone id, or ''
// for the whole project: Radix does not allow '' as an item value, so the
// whole-project item uses a placeholder value that is mapped back here.

'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { labelClass, pickerPopoverClass, pickerTriggerClass, thinScrollbar } from './request-ui'

const WHOLE_PROJECT = 'whole-project'

export default function MilestoneSelect({ id, label, value, onChange, milestones, disabled }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Select
        value={value || WHOLE_PROJECT}
        onValueChange={(next) => onChange(next === WHOLE_PROJECT ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={pickerTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cn(pickerPopoverClass, thinScrollbar)} collisionPadding={12}>
          <SelectItem value={WHOLE_PROJECT}>Whole project</SelectItem>
          {milestones.map((milestone) => (
            <SelectItem key={milestone.id} value={milestone.id} className="[overflow-wrap:anywhere]">
              {milestone.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}