"use server";

import { createClient } from "@supabase/supabase-js"; // Raw client for signup
import { createClient as createServerClient } from "@/lib/supabase/server"; // Cookie client for updates
import {
  RegisterSchema,
  ProfileUpdateSchema,
  PasswordChangeSchema,
} from "@/lib/schemas";
import { z } from "zod";

type RegisterFormValues = z.infer<typeof RegisterSchema>;

// --- SIGN UP (Uses Raw Client) ---
export async function signupUser(
  rawData: RegisterFormValues,
  clientOrigin: string,
) {
  const parsed = RegisterSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid form data. Please check your inputs.",
    };
  }

  const data = parsed.data;

  // Initialize standard Supabase client (Bypasses PKCE for server-side signup)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${clientOrigin}/auth/callback`,
      data: {
        full_name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        gender: data.gender,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, session: authData.session };
}

// --- UPDATE PROFILE (Uses Server Client) ---
export async function updateUserProfile(
  rawData: z.infer<typeof ProfileUpdateSchema>,
) {
  const parsed = ProfileUpdateSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, error: "Invalid data. Please check your inputs." };
  }

  // ✅ Use createServerClient() which needs NO arguments
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// --- CHANGE PASSWORD (Uses Server Client) ---
export async function changeUserPassword(
  rawData: z.infer<typeof PasswordChangeSchema>,
) {
  const parsed = PasswordChangeSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, error: "Invalid password format." };
  }

  // ✅ Use createServerClient() which needs NO arguments
  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}
