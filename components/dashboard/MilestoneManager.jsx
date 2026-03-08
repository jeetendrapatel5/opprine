"use client"

import { useState } from 'react';
import axios from 'axios';
import { Plus, GripVertical, CheckCircle2, CircleDashed, ArrowRightCircle, Loader2, Trash2 } from 'lucide-react';

export default function MilestoneManager({ projectId, initialMilestones }) {
    const [milestones, setMilestones] = useState(initialMilestones || []);
    const [newTitle, setNewTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const getNextStatus = (current) => {
        if (current === 'PENDING') return 'IN_PROGRESS';
        if (current === 'IN_PROGRESS') return 'COMPLETED';
        return 'PENDING'; // Cycles back to start
    };

    const handleStatusToggle = async (milestoneId, currentStatus) => {
        const nextStatus = getNextStatus(currentStatus);
        setUpdatingId(milestoneId);

        try {
            const response = await axios.patch(`/api/milestones/${milestoneId}`, {
                status: nextStatus
            });
 
            setMilestones(prev =>
                prev.map(m => m.id === milestoneId ? { ...m, status: response.data.status } : m)
            );
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Could not update status.");
        } finally {
            setUpdatingId(null);
        }
    };

    // Status Icon Component with a "clickable" look
    const ClickableStatusIcon = ({ status, milestoneId }) => {
        const isLoading = updatingId === milestoneId;

        if (isLoading) return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;

        return (
            <button
                onClick={() => handleStatusToggle(milestoneId, status)}
                className="hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                title="Click to change status"
            >
                {status === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                {status === 'IN_PROGRESS' && <ArrowRightCircle className="w-5 h-5 text-orange-500" />}
                {status === 'PENDING' && <CircleDashed className="w-5 h-5 text-gray-300" />}
            </button>
        );
    };

    const handleAddMilestone = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setIsSubmitting(true);
        try {
            // Using axios as it is in your package.json
            const response = await axios.post('/api/milestones', {
                projectId,
                title: newTitle
            });

            // Optimistically update the UI
            setMilestones([...milestones, response.data]);
            setNewTitle("");
        } catch (error) {
            console.error("Error adding milestone:", error);
            alert("Failed to add milestone. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (milestoneId) => {
        if (!confirm("Are you sure you want to delete this milestone?")) return;

        setDeletingId(milestoneId);
        try {
            await axios.delete(`/api/milestones/${milestoneId}`);
            // Remove from UI immediately
            setMilestones(prev => prev.filter(m => m.id !== milestoneId));
        } catch (error) {
            alert("Failed to delete milestone.");
        } finally {
            setDeletingId(null);
        }
    };

    const StatusIcon = ({ status }) => {
        if (status === 'COMPLETED') return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
        if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-5 h-5 text-orange-500" />;
        return <CircleDashed className="w-5 h-5 text-gray-300" />;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Milestones</h2>

            {/* Existing Milestones List */}
            <div className="space-y-2 mb-6">
                {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg group">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />

                        {/* USE THE NEW CLICKABLE ICON */}
                        <ClickableStatusIcon status={milestone.status} milestoneId={milestone.id} />

                        <span className={`text-sm flex-1 ${milestone.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900 font-medium'}`}>
                            {milestone.title}
                        </span>

                        <button
                            onClick={() => handleDelete(milestone.id)}
                            disabled={deletingId === milestone.id}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                        >
                            {deletingId === milestone.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                        </button>

                        {/* Also make the badge clickable for better UX */}
                        <button
                            onClick={() => handleStatusToggle(milestone.id, milestone.status)}
                            className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                            {milestone.status.replace('_', ' ')}
                        </button>
                    </div>
                ))}
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddMilestone} className="flex gap-2">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Final Handoff"
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newTitle.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Step
                </button>
            </form>
        </div>
    );
}