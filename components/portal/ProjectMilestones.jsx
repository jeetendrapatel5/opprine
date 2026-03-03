import { CheckCircle2, CircleDashed, ArrowRightCircle } from 'lucide-react'

export default function ProjectMilestones({ milestones }) {
  // If the freelancer hasn't added milestones yet, render nothing.
  if (!milestones || milestones.length === 0) return null;

  // Calculate overall progress for the progress bar
  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
  const progressPercentage = Math.round((completedCount / milestones.length) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Project Timeline</h2>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          {progressPercentage}% Complete
        </span>
      </div>

      {/* High-level progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {/* The Vertical Stepper */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.status === 'COMPLETED';
          const isInProgress = milestone.status === 'IN_PROGRESS';
          const isPending = milestone.status === 'PENDING';
          const isLast = index === milestones.length - 1;

          return (
            <div key={milestone.id} className="relative flex items-start gap-4">
              
              {/* Vertical connecting line (skip on last item) */}
              {!isLast && (
                <div 
                  className={`absolute left-3 top-8 bottom-[-24px] w-px ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Status Icon */}
              <div className="relative z-10 bg-white pt-1">
                {isCompleted && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                {isInProgress && <ArrowRightCircle className="w-6 h-6 text-orange-500" />}
                {isPending && <CircleDashed className="w-6 h-6 text-gray-300" />}
              </div>

              {/* Milestone Content */}
              <div className="flex-1 pt-1">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-gray-900 line-through opacity-70' : 
                  isInProgress ? 'text-gray-900' : 
                  'text-gray-500'
                }`}>
                  {milestone.title}
                </p>
                {isInProgress && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">Currently working on this</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}