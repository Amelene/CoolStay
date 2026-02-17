/**
 * Email Service for CoolStay Resort
 * Handles sending booking confirmation emails via Supabase Edge Function (Brevo)
 * Matches the mobile app's email service implementation
 */

import { createClient } from "@supabase/supabase-js";

interface BookingEmailData {
  guestName: string;
  guestEmail: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  infants: number;
  totalAmount: number;
  bookingId: string;
  specialRequests?: string;
}

interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
}

/**
 * Send booking confirmation email via Supabase Edge Function
 * Uses supabase.functions.invoke() like the mobile app
 * @param bookingData - The booking information to send
 * @returns Promise with success status
 */
export async function sendBookingConfirmationEmail(
  bookingData: BookingEmailData
): Promise<EmailResponse> {
  try {
    // Format dates for email
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch (error) {
        return "N/A";
      }
    };

    // Prepare email payload matching mobile app format
    const emailData = {
      userEmail: bookingData.guestEmail,
      userName: bookingData.guestName,
      bookingType: "room",
      itemName: bookingData.roomName,
      checkInDate: formatDate(bookingData.checkInDate),
      checkOutDate: formatDate(bookingData.checkOutDate),
      guestsCount: `${bookingData.adults} Adult(s), ${bookingData.children} Child(ren)${bookingData.infants > 0 ? `, ${bookingData.infants} Infant(s)` : ""}`,
      totalAmount: `₱${bookingData.totalAmount.toLocaleString()}`,
      bookingDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      specialRequests: bookingData.specialRequests,
    };

    console.log("📧 ========================================");
    console.log("📧 SENDING BOOKING CONFIRMATION EMAIL");
    console.log("📧 ========================================");
    console.log("📧 Recipient:", bookingData.guestEmail);
    console.log("📧 Guest:", bookingData.guestName);
    console.log("📧 Room:", bookingData.roomName);
    console.log("📧 Booking type: room");
    console.log("📧 Payload:", JSON.stringify(emailData, null, 2));
    console.log("📧 ========================================");

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call Supabase Edge Function using functions.invoke()
    console.log("📧 Calling Supabase Edge Function: send-booking-email");
    const { data, error } = await supabase.functions.invoke("send-booking-email", {
      body: emailData,
    });

    if (error) {
      console.error("❌ SUPABASE FUNCTION ERROR:");
      console.error("❌", error);
      console.error("❌ ========================================");
      return {
        success: false,
        error: error.message || "Supabase function error",
      };
    }

    if (data && data.success) {
      console.log("✅ EMAIL SENT SUCCESSFULLY!");
      console.log("✅ Message ID:", data.messageId);
      console.log("✅ Response:", JSON.stringify(data, null, 2));
      console.log("✅ ========================================");
      return {
        success: true,
        message: "Confirmation email sent successfully",
        messageId: data.messageId,
      };
    } else {
      console.error("❌ EMAIL SENDING FAILED:");
      console.error("❌", data);
      console.error("❌ ========================================");
      return {
        success: false,
        error: data?.error || "Failed to send email",
      };
    }
  } catch (error) {
    console.error("❌ ========================================");
    console.error("❌ EXCEPTION WHILE SENDING EMAIL:");
    console.error("❌", error);
    console.error("❌ ========================================");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send booking confirmation email with retry logic
 * @param bookingData - The booking information to send
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise with success status
 */
export async function sendBookingConfirmationEmailWithRetry(
  bookingData: BookingEmailData,
  maxRetries: number = 2
): Promise<EmailResponse> {
  let lastError: EmailResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const waitTime = 1000 * Math.pow(2, attempt - 1);
      console.log(`🔄 ========================================`);
      console.log(`🔄 RETRY ATTEMPT ${attempt + 1}/${maxRetries + 1}`);
      console.log(`🔄 Waiting ${waitTime}ms before retry...`);
      console.log(`🔄 ========================================`);
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const result = await sendBookingConfirmationEmail(bookingData);

    if (result.success) {
      if (attempt > 0) {
        console.log(`✅ Email sent successfully after ${attempt + 1} attempts`);
      }
      return result;
    }

    lastError = result;
    console.log(`⚠️ Attempt ${attempt + 1} failed:`, result.error);
  }

  return (
    lastError || {
      success: false,
      error: "Failed to send email after multiple attempts",
    }
  );
}

/**
 * Feedback Reply Email Data Interface
 */
interface FeedbackReplyEmailData {
  guestName: string;
  guestEmail: string;
  originalFeedback: string;
  rating: number;
  adminReply: string;
  roomName: string;
}

/**
 * Send feedback reply notification email to guest
 * Notifies guest when admin responds to their feedback
 * @param replyData - The feedback reply information
 * @returns Promise with success status
 */
export async function sendFeedbackReplyEmail(
  replyData: FeedbackReplyEmailData
): Promise<EmailResponse> {
  try {
    // Prepare email payload for feedback reply
    const emailData = {
      userEmail: replyData.guestEmail,
      userName: replyData.guestName,
      feedbackType: "reply",
      roomName: replyData.roomName,
      rating: replyData.rating,
      originalFeedback: replyData.originalFeedback,
      adminReply: replyData.adminReply,
      replyDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    console.log("💬 ========================================");
    console.log("💬 SENDING FEEDBACK REPLY EMAIL");
    console.log("💬 ========================================");
    console.log("💬 Recipient:", replyData.guestEmail);
    console.log("💬 Guest:", replyData.guestName);
    console.log("💬 Room:", replyData.roomName);
    console.log("💬 Rating:", replyData.rating);
    console.log("💬 Payload:", JSON.stringify(emailData, null, 2));
    console.log("💬 ========================================");

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call Supabase Edge Function for feedback reply email
    console.log("💬 Calling Supabase Edge Function: send-feedback-reply-email");
    const { data, error } = await supabase.functions.invoke(
      "send-feedback-reply-email",
      {
        body: emailData,
      }
    );

    if (error) {
      console.error("❌ SUPABASE FUNCTION ERROR:");
      console.error("❌", error);
      console.error("❌ ========================================");
      return {
        success: false,
        error: error.message || "Supabase function error",
      };
    }

    if (data && data.success) {
      console.log("✅ FEEDBACK REPLY EMAIL SENT SUCCESSFULLY!");
      console.log("✅ Message ID:", data.messageId);
      console.log("✅ Response:", JSON.stringify(data, null, 2));
      console.log("✅ ========================================");
      return {
        success: true,
        message: "Feedback reply email sent successfully",
        messageId: data.messageId,
      };
    } else {
      console.error("❌ EMAIL SENDING FAILED:");
      console.error("❌", data);
      console.error("❌ ========================================");
      return {
        success: false,
        error: data?.error || "Failed to send feedback reply email",
      };
    }
  } catch (error) {
    console.error("❌ ========================================");
    console.error("❌ EXCEPTION WHILE SENDING FEEDBACK REPLY EMAIL:");
    console.error("❌", error);
    console.error("❌ ========================================");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
