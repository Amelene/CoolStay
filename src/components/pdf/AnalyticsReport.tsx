"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [{ src: "https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf" }],
});

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#334155" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    borderBottom: "2px solid #0A1A44",
    paddingBottom: 12,
  },
  brand: { fontSize: 24, color: "#0A1A44", fontWeight: "bold" },
  date: { fontSize: 10, color: "#64748B", marginTop: 8 },
  meta: { fontSize: 9, color: "#64748B", textAlign: "right", lineHeight: 1.4 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    color: "#0A1A44",
    marginBottom: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  narrativeBox: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  narrativeTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0A1A44",
    marginBottom: 5,
  },
  narrativeText: { fontSize: 9, lineHeight: 1.45, color: "#475569" },
  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    padding: 9,
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
  kpiSubValue: { fontSize: 8, color: "#64748B", marginTop: 2 },
  moneyRow: { flexDirection: "row", alignItems: "baseline" },
  moneyPrefix: {
    fontSize: 8,
    color: "#64748B",
    fontWeight: "bold",
    marginRight: 4,
  },
  moneyValue: { fontSize: 16, color: "#0A1A44", fontWeight: "bold" },
  moneyValueSmall: { fontSize: 9, color: "#0A1A44", fontWeight: "bold" },
  positive: { color: "#15803D" },
  negative: { color: "#DC2626" },
  table: { width: "100%", borderTop: "1px solid #E2E8F0" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
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
  twoColumnGrid: { flexDirection: "row", gap: 14 },
  halfSection: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 8,
  },
});

export interface ReportData {
  title: string;
  generatedAt: string;
  range: string;
  kpi: {
    revenue: number;
    expenses?: number;
    payroll?: number;
    netProfit?: number;
    currentMonthRevenue?: number;
    currentMonthLabel?: string;
    bookings: number;
    occupancy: number;
    rating: number;
  };
  revenueData: { name: string; total: number }[];
  roomData: { name: string; bookings: number }[];
}

const formatMoney = (value = 0) => Number(value || 0).toLocaleString("en-US");

function MoneyText({
  value,
  size = "large",
  tone,
}: {
  value?: number;
  size?: "large" | "small";
  tone?: "positive" | "negative";
}) {
  const toneStyle =
    tone === "positive"
      ? styles.positive
      : tone === "negative"
        ? styles.negative
        : undefined;

  return (
    <View style={styles.moneyRow}>
      <Text style={styles.moneyPrefix}>PHP</Text>
      <Text
        style={
          toneStyle
            ? [
                size === "large" ? styles.moneyValue : styles.moneyValueSmall,
                toneStyle,
              ]
            : size === "large"
              ? styles.moneyValue
              : styles.moneyValueSmall
        }
      >
        {formatMoney(value)}
      </Text>
    </View>
  );
}

export default function AnalyticsReport({ data }: { data: ReportData }) {
  const expenses = data.kpi.expenses ?? 0;
  const payroll = data.kpi.payroll ?? 0;
  const netProfit = data.kpi.netProfit ?? data.kpi.revenue - expenses - payroll;
  const profitMargin =
    data.kpi.revenue > 0 ? (netProfit / data.kpi.revenue) * 100 : 0;
  const topRevenuePeriod = [...data.revenueData].sort(
    (a, b) => b.total - a.total,
  )[0];
  const topRoom = [...data.roomData].sort((a, b) => b.bookings - a.bookings)[0];
  const bookingCount = Math.max(data.kpi.bookings, 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CoolStay Resort</Text>
            <Text style={styles.date}>Executive Performance Report</Text>
          </View>
          <View style={styles.meta}>
            <Text>Generated: {data.generatedAt}</Text>
            <Text>Period: {data.range}</Text>
          </View>
        </View>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeTitle}>Performance Snapshot</Text>
          <Text style={styles.narrativeText}>
            This report summarizes confirmed revenue, operating costs, payroll,
            booking volume, guest activity, and room demand for the selected
            period. Net profit is calculated as revenue minus expenses and
            payroll.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <MoneyText value={data.kpi.revenue} />
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Expenses</Text>
              <MoneyText value={expenses} />
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Payroll</Text>
              <MoneyText value={payroll} />
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Profit</Text>
              <MoneyText
                value={netProfit}
                tone={netProfit >= 0 ? "positive" : "negative"}
              />
              <Text style={styles.kpiSubValue}>
                Margin: {profitMargin.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
              <Text style={styles.kpiValue}>{data.kpi.bookings}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Active Guests</Text>
              <Text style={styles.kpiValue}>{data.kpi.occupancy}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg Rating</Text>
              <Text style={styles.kpiValue}>{data.kpi.rating} / 5.0</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>
                {data.kpi.currentMonthLabel || "Current Month"}
              </Text>
              <MoneyText value={data.kpi.currentMonthRevenue ?? 0} />
            </View>
          </View>
        </View>

        <View style={styles.twoColumnGrid}>
          <View style={styles.halfSection}>
            <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.colName}>Period</Text>
                <Text style={styles.colValue}>Revenue</Text>
                <Text style={styles.colMeta}>Share</Text>
              </View>
              {data.revenueData.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colName}>{item.name}</Text>
                  <View style={styles.colValue}>
                    <MoneyText value={item.total} size="small" />
                  </View>
                  <Text style={styles.colMeta}>
                    {data.kpi.revenue > 0
                      ? `${Math.round((item.total / data.kpi.revenue) * 100)}%`
                      : "0%"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.halfSection}>
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
                    {Math.round((item.bookings / bookingCount) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.narrativeBox, { marginTop: 12 }]}>
          <Text style={styles.narrativeTitle}>Highlights</Text>
          <Text style={styles.narrativeText}>
            Strongest revenue period: {topRevenuePeriod?.name || "N/A"} with
            PHP {formatMoney(topRevenuePeriod?.total || 0)}. Most-booked room:
            {" "}
            {topRoom?.name || "N/A"} ({topRoom?.bookings || 0} bookings).
          </Text>
        </View>

        <Text style={styles.footer}>
          Confidential - Generated by CoolStay Admin System
        </Text>
      </Page>
    </Document>
  );
}
