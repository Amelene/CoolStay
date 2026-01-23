import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import { createClient } from "@/lib/supabase/server"; // Use Server Client
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  // 1. Check Server-Side Session (Strict)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Routing Logic based on Role
    // (Assuming 'role' is in metadata, or we default to dashboard)
    const role = user.user_metadata?.role || "guest";

    if (role === "admin" || role === "front_desk") {
      redirect("/admin/dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  // 3. If No User (or Session Expired), Show Landing Page
  return (
    <main className="font-sans">
      <Navbar />
      <Hero />
    </main>
  );
}
