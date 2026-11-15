'use client'

import { useRef } from 'react'
import UpdateComposer from './UpdateComposer'
import UpdateTimeline from './UpdateTimeline'

export default function UpdatesTab({ project }) {
  const timelineRef = useRef(null)

  return (
    <div className="space-y-6">
      <UpdateComposer
        projectId={project.id}
        onPosted={() => timelineRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
      <UpdateTimeline updates={project.updates ?? []} scrollRef={timelineRef} />
    </div>
  )
}