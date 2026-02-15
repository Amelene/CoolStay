"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (Optional: Using standard fonts for reliability)
Font.register({
  family: "Helvetica",
  fonts: [{ src: "https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf" }],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottom: "2px solid #0A1A44",
    paddingBottom: 10,
  },
  brand: { fontSize: 24, color: "#0A1A44", fontWeight: "bold" },
  date: { fontSize: 10, color: "#666", marginTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    color: "#0A1A44",
    marginBottom: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F5F8FA",
    borderRadius: 4,
    border: "1px solid #E2E8F0",
  },
  kpiLabel: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  kpiValue: { fontSize: 16, color: "#0A1A44", fontWeight: "bold" },
  table: { width: "100%", borderTop: "1px solid #E2E8F0" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottom: "1px solid #E2E8F0",
  },
  tableHeader: {
    fontWeight: "bold",
    color: "#0A1A44",
    backgroundColor: "#F8FAFC",
  },
  colName: { width: "50%" },
  colValue: { width: "25%", textAlign: "right" },
  colMeta: { width: "25%", textAlign: "right", color: "#64748B" },
});

// Define the shape of data this report needs
export interface ReportData {
  title: string;
  generatedAt: string;
  range: string;
  kpi: {
    revenue: number;
    bookings: number;
    occupancy: number;
    rating: number;
  };
  revenueData: { name: string; total: number }[];
  roomData: { name: string; bookings: number }[];
}

export default function AnalyticsReport({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CoolStay Resort</Text>
            <Text style={styles.date}>Executive Performance Report</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>Generated: {data.generatedAt}</Text>
            <Text>Period: {data.range}</Text>
          </View>
        </View>

        {/* KPI SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={styles.kpiValue}>
                ₱{data.kpi.revenue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
              <Text style={styles.kpiValue}>{data.kpi.bookings}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg Rating</Text>
              <Text style={styles.kpiValue}>{data.kpi.rating} / 5.0</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Active Guests</Text>
              <Text style={styles.kpiValue}>{data.kpi.occupancy}</Text>
            </View>
          </View>
        </View>

        {/* REVENUE TABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colName}>Period</Text>
              <Text style={styles.colValue}>Revenue</Text>
              <Text style={styles.colMeta}>Trend</Text>
            </View>
            {data.revenueData.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colName}>{item.name}</Text>
                <Text style={styles.colValue}>
                  ₱{item.total.toLocaleString()}
                </Text>
                <Text style={styles.colMeta}>-</Text>
              </View>
            ))}
          </View>
        </View>

        {/* POPULAR ROOMS TABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Performance</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colName}>Room Type</Text>
              <Text style={styles.colValue}>Bookings</Text>
              <Text style={styles.colMeta}>Share</Text>
            </View>
            {data.roomData.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colName}>{item.name}</Text>
                <Text style={styles.colValue}>{item.bookings}</Text>
                <Text style={styles.colMeta}>
                  {Math.round((item.bookings / data.kpi.bookings) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <Text
          style={{
            position: "absolute",
            bottom: 30,
            left: 40,
            right: 40,
            textAlign: "center",
            color: "#999",
            fontSize: 8,
          }}
        >
          Confidential - Generated by CoolStay Admin System
        </Text>
      </Page>
    </Document>
  );
}
