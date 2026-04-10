import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authorizeRole } from "@/lib/role-auth";
import { ROLES } from "@/lib/role_config";
import { logAdminAction } from "@/lib/admin-logger";

// GET: Fetch all expenses with the name of the admin who recorded them
export async function GET() {
  try {
    const supabase = await createClient();

    // 🚨 Strict Security: Only Admins and Front Desk can view expenses
    const { error: authError } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select(
        `
        *,
        users:recorded_by ( full_name )
      `,
      )
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(expenses);
  } catch (err: unknown) {
    console.error("Expenses API Error (GET):", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Log a new expense
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 🚨 Strict Security: Only Admins and Front Desk can log expenses
    const { error: authError, user } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;
    if (!user) throw new Error("User not found");

    const body = await request.json();
    const { amount, category, description, expense_date, receipt_url } = body;

    // Validate inputs
    if (!amount || !category || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Insert the expense into the ledger
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        amount: Number(amount),
        category,
        description,
        expense_date: expense_date || new Date().toISOString().split("T")[0],
        receipt_url: receipt_url || null,
        recorded_by: user.id, // Securely grabbed from the verified token, not the client payload
      })
      .select()
      .single();

    if (error) throw error;

    // 🛡️ THE AUDIT TRAIL
    await logAdminAction(
      supabase,
      user.id,
      "Logged Expense",
      `Category: ${category} | Amount: ₱${amount} | Desc: ${description}`,
    );

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error("Expenses API Error (POST):", err);
    let message = "Transaction Failed";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
