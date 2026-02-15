/**
 * Email Service for CoolStay Resort
 * Handles sending booking confirmation emails via Supabase Edge Function (Brevo)
 */

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
}

/**
 * Send booking confirmation email via Supabase Edge Function
 * @param bookingData - The booking information to send
 * @returns Promise with success status
 */
export async function sendBookingConfirmationEmail(
  bookingData: BookingEmailData
): Promise<EmailResponse> {
  try {
    // Calculate number of nights
    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format dates for email
    const formattedCheckIn = checkIn.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedCheckOut = checkOut.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Prepare email payload matching Supabase Edge Function format
    const emailPayload = {
      userEmail: bookingData.guestEmail,
      userName: bookingData.guestName,
      bookingType: "room", // or "cottage" depending on room type
      itemName: bookingData.roomName,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      guestsCount: `${bookingData.adults} Adult(s), ${bookingData.children} Child(ren)${bookingData.infants > 0 ? `, ${bookingData.infants} Infant(s)` : ''}`,
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
    console.log("📧 To:", bookingData.guestEmail);
    console.log("📧 Guest:", bookingData.guestName);
    console.log("📧 Room:", bookingData.roomName);
    console.log("📧 Check-in:", formattedCheckIn);
    console.log("📧 Check-out:", formattedCheckOut);
    console.log("📧 Nights:", nights);
    console.log("📧 Guests:", `${bookingData.adults} adults, ${bookingData.children} children, ${bookingData.infants} infants`);
    console.log("📧 Total Amount: ₱", bookingData.totalAmount.toLocaleString());
    console.log("📧 Booking ID:", bookingData.bookingId);
    console.log("📧 ========================================");

    // Call Supabase Edge Function
    console.log("📧 Calling Supabase Edge Function...");
    const response = await fetch(
      "https://flpudkhcaesncvfsioqx.supabase.co/functions/v1/send-booking-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      }
    );

    console.log("📧 Response Status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ EMAIL SERVICE ERROR:");
      console.error("❌ Status:", response.status);
      console.error("❌ Error:", errorText);
      console.error("❌ ========================================");
      return {
        success: false,
        error: `Email service returned ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    console.log("✅ EMAIL SENT SUCCESSFULLY!");
    console.log("✅ Response:", JSON.stringify(result, null, 2));
    console.log("✅ ========================================");

    return {
      success: true,
      message: "Booking confirmation email sent successfully",
    };
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
