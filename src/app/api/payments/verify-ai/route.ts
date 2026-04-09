import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    // 🛠️ DEFENSE/DEMO BYPASS
    // If you are presenting and Google's API goes down, change this to "true"
    // to bypass the AI and let your presentation continue smoothly.
    const MOCK_MODE = false;
    if (MOCK_MODE) {
      console.log("⚠️ MOCK MODE ENABLED: Bypassing AI Verification");
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
    if (!apiKey) {
      throw new Error("API Key is not configured on the server.");
    }

    console.log(`🔍 System: Verifying if image is a valid e-receipt...`);

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      You are a strict financial auditor gatekeeper. Analyze the attached image. 
      
      Task 1: Authenticity. Is this EXPLICITLY a digital payment receipt or transaction screenshot (e.g., GCash, Maya, Bank Transfer, PayPal, or any banking app)? 
      If it is a picture of a person, an animal, a random object, a meme, or a blank screen, YOU MUST set "is_valid" to false and state "Invalid document. Please upload a clear screenshot of your payment receipt."
      If it IS a valid payment receipt, set "is_valid" to true.
      
      Task 2: Output ONLY valid JSON matching this exact schema. Do not use markdown blocks.
      {
        "is_valid": boolean,
        "rejection_reason": string | null
      }
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("🔍 System Decision:", text);

    return NextResponse.json(JSON.parse(text));
  } catch (error: unknown) {
    console.error(
      "🚨 Verification API Failed:",
      error instanceof Error ? error.message : error,
    );

    // 🛡️ STRICT FAIL-CLOSED STRATEGY
    // If the API crashes, we DO NOT let the image through.
    return NextResponse.json({
      is_valid: false,
      rejection_reason:
        "The automated verification system is currently offline. Please try again later.",
    });
  }
}
