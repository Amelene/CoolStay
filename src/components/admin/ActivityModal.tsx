"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_per_person: 0,
    duration_minutes: 60,
    max_participants: 10,
    image_url: "",
    category: "water",
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
          category: (activityToEdit as Activity & { category?: string }).category || "water",
          is_active: activityToEdit.is_active,
        });
        setImagePreview(activityToEdit.image_url || "");
        setImageFile(null);
      } else {
        setFormData({
          name: "",
          description: "",
          price_per_person: 0,
          duration_minutes: 60,
          max_participants: 10,
          image_url: "",
          category: "water",
          is_active: true,
        });
        setImagePreview("");
        setImageFile(null);
      }
    }
  }, [isOpen, activityToEdit]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(activityToEdit?.image_url || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate image
    if (!imageFile && !formData.image_url) {
      toast.error("Please upload an activity image");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Saving activity...");
    const supabase = createClient();

    try {
      let imageUrl = formData.image_url;

      // Upload new image if file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `activity_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("room-images")
          .upload(fileName, imageFile);

        if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

        const { data: urlData } = supabase.storage
          .from("room-images")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const payload = {
        ...formData,
        image_url: imageUrl,
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

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success(activityToEdit ? "Activity updated!" : "Activity created!");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.dismiss(toastId);
      toast.error("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      // Remove leading zeros and parse as number
      const cleanedValue = value.replace(/^0+(?=\d)/, '');
      setFormData((prev) => ({
        ...prev,
        [name]: cleanedValue === '' ? 0 : parseFloat(cleanedValue) || 0,
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
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

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="water">Water Activity</option>
              <option value="spa">Spa</option>
              <option value="restaurant">Restaurant Dining</option>
            </select>
          </div>

          {/* Price and Duration - Hidden for Restaurant */}
          {formData.category !== "restaurant" && (
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
          )}

          {/* Max Participants - Hidden for Restaurant and Spa */}
          {formData.category === "water" && (
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
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Activity Image
            </label>
            
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200 group">
                <Image
                  src={imagePreview}
                  alt="Activity preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#0A1A44] hover:bg-gray-50 transition-all"
              >
                <Upload className="w-12 h-12 text-gray-400" />
                <div className="text-center">
                  <p className="font-bold text-sm text-gray-600">
                    Click to upload activity image
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
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
