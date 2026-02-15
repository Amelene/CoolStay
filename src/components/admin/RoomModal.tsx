"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoomSchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner"; // Import

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

  const {
    register,
    handleSubmit,
    reset,
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
      } else {
        reset({
          name: "",
          description: "",
          base_price: 0,
          capacity: 2,
          total_rooms: 5,
          image_url: "",
        });
      }
    }
  }, [isOpen, roomToEdit, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: RoomFormValues) => {
    setLoading(true);
    const toastId = toast.loading("Saving room details...");
    const supabase = createClient();
    const payload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (roomToEdit) {
      const { error: updateError } = await supabase
        .from("room_types")
        .update(payload)
        .eq("id", roomToEdit.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("room_types").insert({
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
      toast.success(roomToEdit ? "Room updated!" : "Room created!");
      onSuccess();
      onClose();
    }
    setLoading(false);
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
              className={inputClass(!!errors.capacity)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Image URL
            </label>
            <input
              {...register("image_url")}
              className={inputClass(!!errors.image_url)}
            />
            {errors.image_url && (
              <p className="text-xs text-red-500 mt-1">
                {errors.image_url.message as string}
              </p>
            )}
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
