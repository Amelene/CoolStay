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
  colName: { width: "30%" },
  colCategory: { width: "20%" },
  colStock: { width: "16%", textAlign: "center" },
  colMovement: { width: "11%", textAlign: "center" },
  colStatus: { width: "12%", textAlign: "right" },
  historyTable: { width: "100%", marginTop: 18 },
  historyDate: { width: "22%", paddingRight: 10 },
  historyType: { width: "12%", paddingLeft: 6, paddingRight: 4 },
  historyQty: { width: "14%", textAlign: "right" },
  historyBalance: { width: "18%", textAlign: "right", paddingRight: 8 },
  historyNotes: { width: "34%", paddingLeft: 6 },

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
  stock_in?: number;
  stock_out?: number;
}

export interface CurrentStockReportData {
  generatedAt: string;
  generatedBy: string;
  filterLabel?: string; // shown when downloading a filtered view
  summary: {
    totalItems: number;
    lowStockCount: number;
    totalStockIn?: number;
    totalStockOut?: number;
  };
  items: InventoryItem[];
  history?: {
    id: string;
    usage_date: string;
    purpose: string;
    quantity_used: number;
    used_by?: string;
    notes?: string | null;
  }[];
}

export default function CurrentStockReport({
  data,
}: {
  data: CurrentStockReportData;
}) {
  const item = data.items[0];
  const openingBalance = item
    ? item.current_stock -
      (data.summary.totalStockIn ?? 0) +
      (data.summary.totalStockOut ?? 0)
    : 0;
  const historyRows = (data.history || []).reduce<{
    balance: number;
    rows: {
      log: NonNullable<CurrentStockReportData["history"]>[number];
      isIn: boolean;
      quantity: number;
      balance: number;
    }[];
  }>(
    (acc, log) => {
      const isIn = log.purpose === "Restock";
      const quantity = Number(log.quantity_used || 0);
      const balance = isIn
        ? acc.balance + quantity
        : acc.balance - quantity;

      return {
        balance,
        rows: [...acc.rows, { log, isIn, quantity, balance }],
      };
    },
    { balance: openingBalance, rows: [] },
  ).rows;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CoolStay Resort</Text>
            <Text style={styles.title}>Current Stock Report</Text>
            {data.filterLabel && (
              <Text style={{ fontSize: 8, color: "#0077B6", marginTop: 4 }}>
                Filter: {data.filterLabel}
              </Text>
            )}
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
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Stock In</Text>
            <Text style={[styles.summaryValue, { color: "#15803D" }]}>
              {data.summary.totalStockIn ?? 0}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Stock Out</Text>
            <Text style={[styles.summaryValue, { color: "#DC2626" }]}>
              {data.summary.totalStockOut ?? 0}
            </Text>
          </View>
        </View>

        {/* INVENTORY TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Item Name</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colStock}>Current Level</Text>
            <Text style={styles.colMovement}>In</Text>
            <Text style={styles.colMovement}>Out</Text>
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
              <Text style={styles.colMovement}>{item.stock_in ?? 0}</Text>
              <Text style={styles.colMovement}>{item.stock_out ?? 0}</Text>
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

        {historyRows.length > 0 && (
          <View style={styles.historyTable}>
            <Text
              style={{
                fontSize: 11,
                color: "#0A1A44",
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              Transaction History
            </Text>
            <View style={styles.tableHeader}>
              <Text style={styles.historyDate}>Date</Text>
              <Text style={styles.historyType}>Type</Text>
              <Text style={styles.historyQty}>Quantity</Text>
              <Text style={styles.historyBalance}>Balance</Text>
              <Text style={styles.historyNotes}>Remarks</Text>
            </View>
            {historyRows.map(({ log, isIn, quantity, balance }, i) => {
              return (
                <View
                  key={log.id}
                  style={[
                    styles.tableRow,
                    { backgroundColor: i % 2 === 0 ? "white" : "#F8FAFC" },
                  ]}
                >
                  <Text style={styles.historyDate}>
                    {new Date(log.usage_date).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={styles.historyType}>{isIn ? "IN" : "OUT"}</Text>
                  <Text style={styles.historyQty}>
                    {isIn ? "+" : "-"}
                    {quantity} {item?.unit || ""}
                  </Text>
                  <Text style={styles.historyBalance}>
                    {balance} {item?.unit || ""}
                  </Text>
                  <Text style={styles.historyNotes}>
                    {log.notes || log.used_by || "No remarks"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          Confidential Inventory Document • Generated via CoolStay Admin
        </Text>
      </Page>
    </Document>
  );
}
