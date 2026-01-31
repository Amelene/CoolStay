"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register standard font
Font.register({
  family: "Helvetica",
  fonts: [{ src: "https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf" }],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: "2px solid #0A1A44",
    paddingBottom: 10,
  },
  brand: { fontSize: 24, color: "#0A1A44", fontWeight: "bold" },
  title: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  meta: { fontSize: 9, textAlign: "right", color: "#64748B" },

  // Summary Section
  summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryValue: { fontSize: 14, color: "#0A1A44", fontWeight: "bold" },

  // Table
  table: { width: "100%", marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0A1A44",
    color: "white",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #E2E8F0",
    padding: 8,
    alignItems: "center",
  },
  colName: { width: "40%" },
  colCategory: { width: "25%" },
  colStock: { width: "20%", textAlign: "center" },
  colStatus: { width: "15%", textAlign: "right" },

  statusLow: { color: "#DC2626", fontWeight: "bold" },
  statusGood: { color: "#16A34A" },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 8,
    borderTop: "1px solid #E2E8F0",
    paddingTop: 10,
  },
});

export interface InventoryItem {
  item_name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export interface CurrentStockReportData {
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalItems: number;
    lowStockCount: number;
  };
  items: InventoryItem[];
}

export default function CurrentStockReport({
  data,
}: {
  data: CurrentStockReportData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CoolStay Resort</Text>
            <Text style={styles.title}>Current Stock Report</Text>
          </View>
          <View style={styles.meta}>
            <Text>Generated: {data.generatedAt}</Text>
            <Text>By: {data.generatedBy}</Text>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Items Tracked</Text>
            <Text style={styles.summaryValue}>{data.summary.totalItems}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Low Stock Alerts</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color: data.summary.lowStockCount > 0 ? "#DC2626" : "#16A34A",
                },
              ]}
            >
              {data.summary.lowStockCount}
            </Text>
          </View>
        </View>

        {/* INVENTORY TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Item Name</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colStock}>Current Level</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>

          {data.items.map((item, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                { backgroundColor: i % 2 === 0 ? "white" : "#F8FAFC" },
              ]}
            >
              <Text style={styles.colName}>{item.item_name}</Text>
              <Text style={styles.colCategory}>{item.category}</Text>
              <Text style={styles.colStock}>
                {item.current_stock} {item.unit}
              </Text>
              <Text
                style={[
                  styles.colStatus,
                  item.current_stock <= item.minimum_stock
                    ? styles.statusLow
                    : styles.statusGood,
                ]}
              >
                {item.current_stock === 0
                  ? "OUT OF STOCK"
                  : item.current_stock <= item.minimum_stock
                    ? "LOW STOCK"
                    : "Good"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Confidential Inventory Document • Generated via CoolStay Admin
        </Text>
      </Page>
    </Document>
  );
}
