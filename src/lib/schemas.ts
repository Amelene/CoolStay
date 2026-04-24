import { z } from "zod";

// --- VALIDATION PATTERNS ---
// Strict PH Phone: Matches 09171234567 or +639171234567
const phoneRegex = /^(09|\+639)\d{9}$/;

// Strict Name: Allows letters, spaces, dots, hyphens, apostrophes. NO NUMBERS.
const nameRegex = /^[a-zA-Z\s\-\.\']+$/;
const nameError =
  "Must contain only letters, spaces, or valid punctuation (., -, '). No numbers allowed.";

// --- USER REGISTRATION SCHEMA ---
export const RegisterSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .regex(nameRegex, "First name: " + nameError),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .regex(nameRegex, "Last name: " + nameError),
    gender: z.enum(["male", "female", "other"] as const),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .regex(phoneRegex, "Invalid PH phone number (e.g., 0917...)"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(
        /[0-9!@#$%^&*]/,
        "Password must contain at least one number or special char",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// --- ADMIN: STAFF SCHEMA ---
export const StaffSchema = z.object({
  employee_id: z.string().min(1, "Employee ID is required"),
  first_name: z
    .string()
    .min(2, "First Name is required")
    .regex(nameRegex, "First Name: " + nameError),
  last_name: z
    .string()
    .min(2, "Last Name is required")
    .regex(nameRegex, "Last Name: " + nameError),
  middle_name: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(phoneRegex, "Invalid PH phone number"),
  department: z.string().min(1, "Department is required"),
  position: z
    .string()
    .min(1, "Position is required")
    .regex(/^[a-zA-Z\s\-\.]+$/, "Position should not contain numbers"),
  status: z.enum(["active", "inactive", "terminated"] as const),
  salary: z.coerce.number().min(0, "Salary cannot be negative"),
  hire_date: z.string().min(1, "Date is required"),
});

// --- ADMIN: ROOM SCHEMA ---
export const RoomSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters"),
  base_price: z.coerce.number().min(1, "Price must be greater than 0"),
  total_rooms: z.coerce.number().int().min(1, "Must have at least 1 room"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  image_url: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
});

// --- EVENT INQUIRY SCHEMA ---
export const EventInquirySchema = z.object({
  fullName: z
    .string()
    .min(2, "Name is required")
    .regex(nameRegex, "Name: " + nameError),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(phoneRegex, "Invalid PH phone number"), // Upgraded from simple .min(10)
  eventType: z.enum([
    "Wedding",
    "Corporate",
    "Social",
    "Birthday",
    "Other",
  ] as const),
  date: z.string().min(1, "Preferred date is required"),
  guestCount: z.coerce
    .number()
    .int()
    .min(10, "Minimum of 10 guests for events")
    .max(150, "Maximum of 150 guests allowed for events"),
  message: z.string().optional(),
});

export const ProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .regex(nameRegex, "Name: " + nameError),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid PH phone number (e.g., 0917...)"),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
});

export const PasswordChangeSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(
        /[0-9!@#$%^&*]/,
        "Must contain at least one number or special char",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
