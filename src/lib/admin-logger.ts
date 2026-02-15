import { SupabaseClient } from "@supabase/supabase-js";

export async function logAdminAction(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  details?: string
) {
  try {
    // In a real app, you might extract IP from headers, but for now we'll keep it simple
    await supabase.from("admin_activity_logs").insert({
      user_id: userId,
      action: action, // e.g., "User Login", "Verified Payment"
      device_info: details || "Web Dashboard",
      ip_address: "127.0.0.1", // Placeholder until deployed
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // We don't throw error here to avoid blocking the main action if logging fails
  }
}
