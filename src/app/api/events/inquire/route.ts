import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { EventInquirySchema } from "@/lib/schemas"; // <--- 1. Import the Schema

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 2. 🔒 VALIDATE INPUT (The "Bouncer")
    // If the data is bad (e.g. wrong phone format), this returns an error immediately.
    const validation = EventInquirySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.format() },
        { status: 400 },
      );
    }

    // 3. Use the CLEAN data (validation.data)
    const validData = validation.data;

    const supabase = await createClient();

    // Insert into 'event_inquiries' table
    const { error } = await supabase.from("event_inquiries").insert({
      full_name: validData.fullName,
      email: validData.email,
      phone: validData.phone,
      event_type: validData.eventType,
      preferred_date: validData.date,
      guest_count: validData.guestCount,
      message: validData.message,
      status: "new",
    });

    if (error) throw error;

    // 🔒 NEW: Trigger Admin Notification for Event Inquiry
    await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      title: "New Event Inquiry",
      message: `${validData.fullName} inquired about a ${validData.eventType} for ${validData.guestCount} guests.`,
      type: "inquiry",
      is_read: false,
      created_at: new Date().toISOString(),
      // user_id is null here since they might not be logged in
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Event inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 },
    );
  }
}
