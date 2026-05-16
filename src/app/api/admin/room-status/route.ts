import { logAdminAction } from "@/lib/admin-logger";
import { ROLES, ALL_STAFF_ROLES } from "@/lib/role_config";
import { authorizeRole } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ROOM_STATUSES = [
  "available",
  "occupied",
  "cleaning",
  "maintenance",
  "out_of_order",
] as const;

type RoomStatus = (typeof ROOM_STATUSES)[number];

type RoomInventoryRow = {
  id: string;
  room_type_id: string | null;
  room_number: string;
  status: RoomStatus;
};

const canManuallyUpdate = (role: string | null) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.FRONT_DESK;

const isRoomStatus = (value: unknown): value is RoomStatus =>
  typeof value === "string" &&
  ROOM_STATUSES.includes(value as RoomStatus);

async function loadRoomStatusData() {
  const supabase = await createClient();
  const { error: authError, role } = await authorizeRole(
    supabase,
    ALL_STAFF_ROLES,
  );
  if (authError) return { authError };

  const [
    { data: roomsData, error: roomsError },
    { data: typesData, error: typesError },
  ] = await Promise.all([
      supabase
        .from("room_inventory")
        .select("id, room_type_id, room_number, status")
        .order("room_number", { ascending: true }),
      supabase.from("room_types").select("id, name"),
    ]);

  if (roomsError) throw roomsError;
  if (typesError) throw typesError;

  const typeMap = new Map<string, string>();
  typesData?.forEach((type) => {
    typeMap.set(type.id, type.name);
  });

  const rooms = ((roomsData || []) as RoomInventoryRow[]).map((room) => ({
    ...room,
    categoryName:
      room.room_type_id && typeMap.has(room.room_type_id)
        ? typeMap.get(room.room_type_id)
        : "Uncategorized",
  }));

  const categories = Array.from(
    new Set(rooms.map((room) => room.categoryName || "Uncategorized")),
  );

  return {
    role,
    canUpdate: canManuallyUpdate(role),
    rooms,
    categories: ["All", ...categories],
  };
}

export async function GET() {
  try {
    const result = await loadRoomStatusData();
    if ("authError" in result && result.authError) return result.authError;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Room status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch room status" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.MANAGER,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const { roomId, status } = await request.json();

    if (typeof roomId !== "string" || !isRoomStatus(status)) {
      return NextResponse.json(
        { error: "A valid room and status are required." },
        { status: 400 },
      );
    }

    if (status === "occupied") {
      return NextResponse.json(
        { error: "Use the check-in flow to mark a room occupied." },
        { status: 400 },
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("room_inventory")
      .select("id, room_number, status")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.status === "occupied") {
      return NextResponse.json(
        {
          error:
            "Occupied rooms must be cleared through the booking check-out flow.",
        },
        { status: 409 },
      );
    }

    const { count: activeBookingCount, error: bookingError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("assigned_room_id", roomId)
      .eq("status", "checked_in");

    if (bookingError) throw bookingError;

    if ((activeBookingCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This room has an active checked-in booking. Process check-out first.",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, string> = {
      status,
      updated_at: now,
    };

    if (status === "available" && room.status === "cleaning") {
      updatePayload.last_cleaned = now;
    }

    if (
      status === "available" &&
      (room.status === "maintenance" || room.status === "out_of_order")
    ) {
      updatePayload.last_maintenance = now;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("room_inventory")
      .update(updatePayload)
      .eq("id", roomId)
      .neq("status", "occupied")
      .select("id, room_type_id, room_number, status")
      .single();

    if (updateError || !updatedRoom) {
      return NextResponse.json(
        { error: "Room status changed before this update could be saved." },
        { status: 409 },
      );
    }

    await logAdminAction(
      supabase,
      user!.id,
      "Updated Room Status",
      `Room ${room.room_number}: ${room.status} -> ${status}`,
    );

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Room status update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
