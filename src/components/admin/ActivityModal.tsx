"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Activity {
  id: string;
  name: string;
  description: string;
  price_per_person: number;
  duration_minutes: number;
  max_participants: number;
  image_url: string;
  is_active: boolean;
}

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activityToEdit?: Activity | null;
}

export default function ActivityModal({
  isOpen,
  onClose,
  onSuccess,
  activityToEdit,
}: ActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_per_person: 0,
    duration_minutes: 60,
    max_participants: 10,
    image_url: "",
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (activityToEdit) {
        setFormData({
          name: activityToEdit.name,
          description: activityToEdit.description || "",
          price_per_person: activityToEdit.price_per_person,
          duration_minutes: activityToEdit.duration_minutes,
          max_participants: activityToEdit.max_participants,
          image_url: activityToEdit.image_url || "",
          is_active: activityToEdit.is_active,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          price_per_person: 0,
          duration_minutes: 60,
          max_participants: 10,
          image_url: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, activityToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Saving activity...");
    const supabase = createClient();

    const payload = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (activityToEdit) {
      const { error: updateError } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", activityToEdit.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("activities").insert({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...payload,
      });
      error = insertError;
    }

    if (error) {
      toast.dismiss(toastId);
      toast.error("Error: " + error.message);
    } else {
      toast.dismiss(toastId);
      toast.success(activityToEdit ? "Activity updated!" : "Activity created!");
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const inputClass =
    "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A1A44] outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#0A1A44] p-6 text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-serif font-bold">
            {activityToEdit ? "Edit Activity" : "Add New Activity"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Activity Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Activity Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Helmet Diving"
              className={inputClass}
              required
            />
          </div>

          {/* Price and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Price per Person
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">₱</span>
                <input
                  type="number"
                  name="price_per_person"
                  value={formData.price_per_person}
                  onChange={handleChange}
                  className={`${inputClass} pl-8`}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                className={inputClass}
                min="1"
                required
              />
            </div>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Max Participants
            </label>
            <input
              type="number"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              className={inputClass}
              min="1"
              required
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Image URL
            </label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe the activity..."
              className={inputClass}
              required
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="w-5 h-5 text-[#0A1A44] border-gray-300 rounded focus:ring-2 focus:ring-[#0A1A44]"
            />
            <label className="text-sm font-medium text-gray-700">
              Activity is active and visible to customers
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0A1A44] text-white hover:bg-blue-900"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : activityToEdit
                ? "Save Changes"
                : "Create Activity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
