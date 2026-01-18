"use server";

import { createClient } from "@supabase/supabase-js";
import { RegisterSchema } from "@/lib/schemas";
import { z } from "zod";

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export async function signupUser(
  rawData: RegisterFormValues,
  clientOrigin: string,
) {
  // 1. SECURITY: Validate input immediately
  const parsed = RegisterSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid form data. Please check your inputs.",
    };
  }

  const data = parsed.data;

  // 2. Initialize standard Supabase client (Bypasses PKCE)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 3. Perform Sign Up
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
