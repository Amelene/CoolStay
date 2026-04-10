"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#334155",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brand: { fontSize: 24, fontWeight: "bold", color: "#0A1A44" },
  subBrand: { fontSize: 10, color: "#64748B" },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0A1A44",
  },
  statusPaid: { color: "#16a34a", fontWeight: "bold" },
  statusPending: { color: "#ca8a04", fontWeight: "bold" },

  section: {
    marginBottom: 15,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: { fontSize: 10, color: "#64748B", textTransform: "uppercase" },
  value: { fontSize: 12, fontWeight: "bold" },

  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    paddingBottom: 5,
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: { flexDirection: "row", marginBottom: 8 },
  col1: { width: "50%" },
  col2: { width: "25%", textAlign: "right" },
  col3: { width: "25%", textAlign: "right" },

  totalSection: { marginTop: 20, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "50%",
    marginBottom: 5,
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0A1A44",
    borderTop: "2px solid #0A1A44",
    paddingTop: 5,
    marginTop: 5,
  },

  depositBox: {
    marginTop: 30,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 4,
  },
  depositTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0A1A44",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  depositText: {
    fontSize: 10,
    color: "#64748B",
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
  },
});

// Helper to format currency
const formatCurrency = (num: number) =>
  `PHP ${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

interface Payment {
  amount: number;
  status: string;
  payment_method: string;
  description?: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  total_amount: number;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  security_deposit_status?: string;
  users?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  room_types?: {
    name: string;
  } | null;
}

interface ReceiptProps {
  booking: Booking;
  payments: Payment[];
}

export default function BookingReceipt({ booking, payments }: ReceiptProps) {
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const balance = booking.total_amount - totalPaid;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CoolStay Resort</Text>
            <Text style={styles.subBrand}>Bulakan, Bulacan Philippines</Text>
            <Text style={styles.subBrand}>
              reservations@coolwavesresort.com | +63 9053 976 300
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceTitle}>Official Receipt</Text>
            <Text style={{ fontSize: 10, marginTop: 5 }}>
              Ref: {booking.id.substring(0, 8).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 10 }}>
              Date: {new Date().toLocaleDateString()}
            </Text>
            <Text
              style={[
                styles.value,
                balance <= 0 ? styles.statusPaid : styles.statusPending,
                { marginTop: 5 },
              ]}
            >
              {balance <= 0 ? "FULLY PAID" : "PARTIAL PAYMENT"}
            </Text>
          </View>
        </View>

        {/* GUEST DETAILS */}
        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 5 }]}>Bill To:</Text>
          <Text style={styles.value}>
            {booking.users?.full_name || "Guest"}
          </Text>
          <Text style={{ fontSize: 10 }}>{booking.users?.email}</Text>
          <Text style={{ fontSize: 10 }}>{booking.users?.phone}</Text>
        </View>

        {/* BOOKING DETAILS */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Accommodation</Text>
              <Text style={styles.value}>{booking.room_types?.name}</Text>
            </View>
            <View>
              <Text style={styles.label}>Check In</Text>
              <Text style={styles.value}>
                {new Date(booking.check_in_date).toLocaleDateString()}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Check Out</Text>
              <Text style={styles.value}>
                {new Date(booking.check_out_date).toLocaleDateString()}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Guests</Text>
              <Text style={styles.value}>{booking.guests_count} Pax</Text>
            </View>
          </View>
        </View>

        {/* PAYMENT HISTORY TABLE */}
        <Text style={[styles.label, { marginTop: 10 }]}>Payment History</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.label, styles.col1]}>Description / Method</Text>
          <Text style={[styles.label, styles.col2]}>Date</Text>
          <Text style={[styles.label, styles.col3]}>Amount</Text>
        </View>

        {payments
          .filter((p) => p.status === "completed")
          .map((p, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col1, { fontSize: 10 }]}>
                {p.payment_method.toUpperCase()} Payment{" "}
                {p.description ? `(${p.description})` : ""}
              </Text>
              <Text style={[styles.col2, { fontSize: 10 }]}>
                {new Date(p.created_at).toLocaleDateString()}
              </Text>
              <Text style={[styles.col3, { fontSize: 10 }]}>
                {formatCurrency(p.amount)}
              </Text>
            </View>
          ))}

        {/* TOTALS */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Total Booking Cost:</Text>
            <Text style={styles.value}>
              {formatCurrency(booking.total_amount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Total Paid:</Text>
            <Text style={styles.value}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandTotal}>Balance Due:</Text>
            <Text
              style={[
                styles.grandTotal,
                { color: balance > 0 ? "#dc2626" : "#0A1A44" },
              ]}
            >
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>

        {/* ✅ SECURITY DEPOSIT CALLOUT */}
        <View style={styles.depositBox}>
          <Text style={styles.depositTitle}>
            Important: Cash Security Deposit
          </Text>
          <Text style={styles.depositText}>
            A refundable incidental deposit of PHP 1,000.00 is required upon
            check-in. This must be paid in CASH at the front desk and is
            completely separate from your room balance. The deposit will be
            fully refunded upon check-out, subject to a room damage inspection.
          </Text>
          <Text
            style={[styles.depositTitle, { marginTop: 6, color: "#ca8a04" }]}
          >
            Status:{" "}
            {booking.security_deposit_status
              ? booking.security_deposit_status.toUpperCase()
              : "PENDING AT CHECK-IN"}
          </Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Thank you for staying with CoolStay Resort! This is a system-generated
          receipt.
        </Text>
      </Page>
    </Document>
  );
}
