import { logAdminAction } from "@/lib/admin-logger";
import { authorizeAdminOrFrontDesk } from "@/lib/role-auth";
import { RoomSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RoomInventoryStatus =
  | "available"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "out_of_order";

type RoomInventoryRow = {
  id: string;
  room_number: string;
  status: RoomInventoryStatus;
};

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const roomCode = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5) || "ROOM";

const parseRoomForm = (formData: FormData) => {
  const parsed = RoomSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    base_price: formData.get("base_price"),
    total_rooms: formData.get("total_rooms"),
    capacity: formData.get("capacity"),
    image_url: formData.get("image_url") || "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid room data",
      data: null,
    };
  }

  return { error: null, data: parsed.data };
};

const uploadRoomImage = async (
  admin: ReturnType<typeof getAdmin>,
  image: FormDataEntryValue | null,
) => {
  if (!(image instanceof File) || image.size === 0) return null;

  const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `rooms/${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage
    .from("room-images")
    .upload(fileName, image, {
      contentType: image.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return admin.storage.from("room-images").getPublicUrl(fileName).data
    .publicUrl;
};

const getExistingRoomNumbers = async (admin: ReturnType<typeof getAdmin>) => {
  const { data, error } = await admin
    .from("room_inventory")
    .select("room_number");

  if (error) throw error;
  return new Set((data || []).map((room) => room.room_number));
};

const createInventoryRows = async (
  admin: ReturnType<typeof getAdmin>,
  roomTypeId: string,
  roomName: string,
  count: number,
) => {
  if (count <= 0) return;

  const existingNumbers = await getExistingRoomNumbers(admin);
  const prefix = roomCode(roomName);
  const rows = [];
  let candidateIndex = 1;

  while (rows.length < count) {
    const roomNumber = `${prefix}-${String(candidateIndex).padStart(2, "0")}`;
    candidateIndex += 1;

    if (existingNumbers.has(roomNumber)) continue;

    existingNumbers.add(roomNumber);
    rows.push({
      room_type_id: roomTypeId,
      room_number: roomNumber,
      floor_number: 1,
      status: "available",
    });
  }

  const { error } = await admin.from("room_inventory").insert(rows);
  if (error) throw error;
};

const syncInventoryCount = async (
  admin: ReturnType<typeof getAdmin>,
  roomTypeId: string,
  roomName: string,
  desiredCount: number,
) => {
  const { data, error } = await admin
    .from("room_inventory")
    .select("id, room_number, status")
    .eq("room_type_id", roomTypeId)
    .order("room_number", { ascending: true });

  if (error) throw error;

  const inventory = (data || []) as RoomInventoryRow[];
  const delta = desiredCount - inventory.length;

  if (delta > 0) {
    await createInventoryRows(admin, roomTypeId, roomName, delta);
    return;
  }

  if (delta >= 0) return;

  const removable = [...inventory]
    .reverse()
    .filter((room) => room.status === "available");
  const removeCount = Math.abs(delta);

  if (removable.length < removeCount) {
    throw new Error(
      "Cannot reduce total units because some physical rooms are active, occupied, or unavailable.",
    );
  }

  const idsToDelete = removable.slice(0, removeCount).map((room) => room.id);
  const { error: deleteError } = await admin
    .from("room_inventory")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) throw deleteError;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeAdminOrFrontDesk(supabase);
    if (authError) return authError;

    const admin = getAdmin();
    const { data, error } = await admin
      .from("room_types")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Rooms GET error:", error);
    return NextResponse.json(
      { error: "Failed to load rooms" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } =
      await authorizeAdminOrFrontDesk(supabase);
    if (authError) return authError;

    const formData = await request.formData();
    const parsed = parseRoomForm(formData);
    if (parsed.error || !parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const admin = getAdmin();
    const imageUrl =
      (await uploadRoomImage(admin, formData.get("image"))) ||
      parsed.data.image_url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Please upload a room image." },
        { status: 400 },
      );
    }

    const id = `rm_${slugify(parsed.data.name)}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const { data: room, error } = await admin
      .from("room_types")
      .insert({
        id,
        name: parsed.data.name,
        description: parsed.data.description || "",
        base_price: parsed.data.base_price,
        max_price: parsed.data.base_price,
        capacity: parsed.data.capacity,
        total_rooms: parsed.data.total_rooms,
        amenities: [],
        image_url: imageUrl,
        is_active: true,
        category: "room",
        price_night: parsed.data.base_price,
        price_overnight: parsed.data.base_price,
        price_day: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      await createInventoryRows(
        admin,
        id,
        parsed.data.name,
        parsed.data.total_rooms,
      );
    } catch (inventoryError) {
      await admin.from("room_types").delete().eq("id", id);
      throw inventoryError;
    }

    await logAdminAction(
      supabase,
      user!.id,
      "Created Room Type",
      `Room: ${parsed.data.name}`,
    );

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save room" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } =
      await authorizeAdminOrFrontDesk(supabase);
    if (authError) return authError;

    const formData = await request.formData();
    const id = String(formData.get("id") || "");

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    const parsed = parseRoomForm(formData);
    if (parsed.error || !parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const admin = getAdmin();
    const { data: existingRoom, error: existingError } = await admin
      .from("room_types")
      .select("id, image_url")
      .eq("id", id)
      .single();

    if (existingError || !existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const imageUrl =
      (await uploadRoomImage(admin, formData.get("image"))) ||
      parsed.data.image_url ||
      existingRoom.image_url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Please upload a room image." },
        { status: 400 },
      );
    }

    const { data: room, error } = await admin
      .from("room_types")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || "",
        base_price: parsed.data.base_price,
        max_price: parsed.data.base_price,
        capacity: parsed.data.capacity,
        total_rooms: parsed.data.total_rooms,
        image_url: imageUrl,
        category: "room",
        price_night: parsed.data.base_price,
        price_overnight: parsed.data.base_price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await syncInventoryCount(
      admin,
      id,
      parsed.data.name,
      parsed.data.total_rooms,
    );

    await logAdminAction(
      supabase,
      user!.id,
      "Updated Room Type",
      `Room: ${parsed.data.name}`,
    );

    return NextResponse.json(room);
  } catch (error) {
    console.error("Rooms PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save room" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } =
      await authorizeAdminOrFrontDesk(supabase);
    if (authError) return authError;

    const { id } = await request.json();
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    const admin = getAdmin();

    const { count: activeBookingCount, error: activeBookingError } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("room_type_id", id)
      .in("status", ["pending", "confirmed", "checked_in"]);

    if (activeBookingError) throw activeBookingError;

    if ((activeBookingCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a room type with pending, confirmed, or checked-in bookings.",
        },
        { status: 409 },
      );
    }

    const { data: room, error: roomError } = await admin
      .from("room_types")
      .select("name")
      .eq("id", id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { count: bookingHistoryCount, error: bookingHistoryError } =
      await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("room_type_id", id);

    if (bookingHistoryError) throw bookingHistoryError;

    if ((bookingHistoryCount || 0) > 0) {
      const { error: disableError } = await admin
        .from("room_types")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (disableError) throw disableError;

      await logAdminAction(
        supabase,
        user!.id,
        "Archived Room Type",
        `Room: ${room.name}`,
      );

      return NextResponse.json({ success: true, archived: true });
    }

    const { error: inventoryError } = await admin
      .from("room_inventory")
      .delete()
      .eq("room_type_id", id);

    if (inventoryError) throw inventoryError;

    const { error } = await admin.from("room_types").delete().eq("id", id);
    if (error) throw error;

    await logAdminAction(
      supabase,
      user!.id,
      "Deleted Room Type",
      `Room: ${room.name}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rooms DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete room" },
      { status: 500 },
    );
  }
}
