"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import AddTaskModal from "@/components/admin/tasks/AddTaskModal";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  room_id: string | null;
  room_inventory?: {
    room_number: string;
  } | null;
  staff: {
    first_name: string;
    last_name: string;
    position: string;
  };
};

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/admin/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const originalTasks = [...tasks];
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t,
      ),
    );

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Task updated");
    } catch (error) {
      console.error(error);
      setTasks(originalTasks);
      toast.error("Could not update task status");
    }
  };

  const columns = {
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  // 🔒 Priority colors removed here!

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            Task Board
          </h1>
          <p className="text-slate-500 text-sm">
            Assign and track operational duties for your staff.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Assign Task
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200 min-h-125">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Clock className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-700 text-lg">To Do</h3>
              <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                {columns.pending.length}
              </span>
            </div>
            <div className="space-y-3">
              {columns.pending.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={() => updateTaskStatus(task.id, "in_progress")}
                  actionLabel="Start Task"
                />
              ))}
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 min-h-125">
            <div className="flex items-center gap-2 mb-4 px-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-blue-800 text-lg">In Progress</h3>
              <span className="ml-auto bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                {columns.in_progress.length}
              </span>
            </div>
            <div className="space-y-3">
              {columns.in_progress.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={() => updateTaskStatus(task.id, "completed")}
                  actionLabel="Mark Done"
                />
              ))}
            </div>
          </div>

          <div className="bg-green-50/50 p-4 rounded-3xl border border-green-100 min-h-125">
            <div className="flex items-center gap-2 mb-4 px-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-green-800 text-lg">Completed</h3>
              <span className="ml-auto bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                {columns.completed.length}
              </span>
            </div>
            <div className="space-y-3">
              {columns.completed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={() => updateTaskStatus(task.id, "pending")}
                  actionLabel="Reopen"
                  isCompleted
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTasks}
      />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onMove: () => void;
  actionLabel: string;
  isCompleted?: boolean;
}

function TaskCard({
  task,
  onMove,
  actionLabel,
  isCompleted = false,
}: TaskCardProps) {
  return (
    <div
      className={`bg-white p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${isCompleted ? "border-green-200 opacity-75" : "border-slate-200"}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-2">
          {/* 🔒 Priority Badge COMPLETELY REMOVED! */}
          {task.room_inventory?.room_number && (
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              🏠 {task.room_inventory.room_number}
            </span>
          )}
        </div>

        {task.due_date && (
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
            Due: {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      <h4
        className={`font-bold text-slate-800 mb-1 ${isCompleted ? "line-through text-slate-500" : ""}`}
      >
        {task.title}
      </h4>
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0A1A44] text-white flex items-center justify-center text-[10px] font-bold">
            {task.staff.first_name[0]}
            {task.staff.last_name[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700">
              {task.staff.first_name}
            </span>
            <span className="text-[9px] text-slate-400">
              {task.staff.position}
            </span>
          </div>
        </div>

        <button
          onClick={onMove}
          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors"
        >
          {actionLabel} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
