"use client";

import { Button } from "@/components/ui/Button";
import { RoomSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface RoomType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  capacity: number;
  total_rooms: number;
  image_url: string;
}

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roomToEdit?: RoomType | null;
}

type RoomFormValues = z.infer<typeof RoomSchema>;

export default function RoomModal({
  isOpen,
  onClose,
  onSuccess,
  roomToEdit,
}: RoomModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RoomSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      base_price: 0,
      capacity: 2,
      total_rooms: 5,
      image_url: "",
    },
  });

  // Handle number input to remove leading zeros
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanedValue = value.replace(/^0+(?=\d)/, '');
    setValue(name as keyof RoomFormValues, cleanedValue === '' ? 0 : parseFloat(cleanedValue) || 0);
  };

  useEffect(() => {
    if (isOpen) {
      if (roomToEdit) {
        reset({
          name: roomToEdit.name,
          description: roomToEdit.description || "",
          base_price: roomToEdit.base_price,
          capacity: roomToEdit.capacity,
          total_rooms: roomToEdit.total_rooms,
          image_url: roomToEdit.image_url || "",
        });
        setImagePreview(roomToEdit.image_url || "");
        setImageFile(null);
      } else {
        reset({
          name: "",
          description: "",
          base_price: 0,
          capacity: 2,
          total_rooms: 5,
          image_url: "",
        });
        setImagePreview("");
        setImageFile(null);
      }
    }
  }, [isOpen, roomToEdit, reset]);

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
    setImagePreview(roomToEdit?.image_url || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: RoomFormValues) => {
    // Validate image
    if (!imageFile && !data.image_url) {
      toast.error("Please upload a room image");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Saving room details...");

    try {
      const formData = new FormData();
      if (roomToEdit) formData.set("id", roomToEdit.id);
      formData.set("name", data.name);
      formData.set("description", data.description || "");
      formData.set("base_price", String(data.base_price));
      formData.set("capacity", String(data.capacity));
      formData.set("total_rooms", String(data.total_rooms));
      formData.set("image_url", data.image_url || "");
      if (imageFile) formData.set("image", imageFile);

      const response = await fetch("/api/admin/rooms", {
        method: roomToEdit ? "PATCH" : "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Failed to save room");
      }

      toast.dismiss(toastId);
      toast.success(roomToEdit ? "Room updated!" : "Room created!");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.dismiss(toastId);
      toast.error(
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full p-3 bg-gray-50 border ${
      hasError ? "border-red-500" : "border-gray-200"
    } rounded-xl focus:ring-2 focus:ring-[#0A1A44] outline-none transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#0A1A44] p-6 text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-serif font-bold">
            {roomToEdit ? "Edit Room Details" : "Add New Room"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 overflow-y-auto"
        >
          {/* Form Content Unchanged */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Room Name
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Deluxe Ocean View"
              className={inputClass(!!errors.name)}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Price (Night)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">₱</span>
                <input
                  type="number"
                  {...register("base_price")}
                  onChange={handleNumberInput}
                  className={`${inputClass(!!errors.base_price)} pl-8`}
                />
              </div>
              {errors.base_price && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.base_price.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Total Units
              </label>
              <input
                type="number"
                {...register("total_rooms")}
                onChange={handleNumberInput}
                className={inputClass(!!errors.total_rooms)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Max Capacity
            </label>
            <input
              type="number"
              {...register("capacity")}
              onChange={handleNumberInput}
              className={inputClass(!!errors.capacity)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Room Image
            </label>
            
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200 group">
                <Image
                  src={imagePreview}
                  alt="Room preview"
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
                    Click to upload room image
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

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              {...register("description")}
              className={inputClass(!!errors.description)}
            />
          </div>

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
                : roomToEdit
                ? "Save Changes"
                : "Create Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
