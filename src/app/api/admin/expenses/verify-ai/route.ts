import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const MOCK_MODE = false;
    if (MOCK_MODE) {
      return NextResponse.json({ is_valid: true, rejection_reason: null });
    }

    const { base64Image, mimeType } = await request.json();

    if (!base64Image) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key is not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    });

    // 🧠 TAILORED PROMPT FOR BUSINESS EXPENSES
    const prompt = `
      You are a strict corporate financial auditor. Analyze the attached image. 
      
      Task 1: Authenticity. Is this EXPLICITLY a business expense document (e.g., a hardware store receipt, a utility bill like Meralco/Water, a grocery receipt, a payroll slip, or an official invoice)? 
      If it is a picture of a person, an animal, a random object, a selfie, or a blank screen, YOU MUST set "is_valid" to false and state "Invalid document. Please upload a clear photo of the official expense receipt, bill, or invoice."
      If it IS a valid business receipt/bill, set "is_valid" to true.
      
      Task 2: Output ONLY valid JSON matching this exact schema:
      {
        "is_valid": boolean,
        "rejection_reason": string | null
      }
    `;

    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    return NextResponse.json(JSON.parse(response.text()));
  } catch (error: unknown) {
    console.error(
      "🚨 Admin Expense AI Failed:",
      error instanceof Error ? error.message : error,
    );
    // Fallback: If AI fails during work hours, we let the Admin proceed so business isn't blocked.
    return NextResponse.json({ is_valid: true, rejection_reason: null });
  }
}
