import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Define styles
const styles = StyleSheet.create({
  page: { flexDirection: "column", backgroundColor: "#FFFFFF", padding: 30 },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0A1A44",
    marginBottom: 5,
  },
  subtitle: { fontSize: 10, color: "#666" },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#EEE",
    marginTop: 10,
  },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#F3F4F6",
    padding: 5,
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 5,
  },
  tableCellHeader: {
    margin: "auto",
    marginTop: 5,
    fontSize: 8,
    fontWeight: "bold",
    color: "#444",
  },
  tableCell: { margin: "auto", marginTop: 5, fontSize: 8, color: "#333" },
  badgeOut: { color: "#DC2626", fontWeight: "bold" },
  badgeIn: { color: "#16A34A", fontWeight: "bold" },
});

interface Log {
  id: string;
  usage_date: string;
  purpose: string;
  quantity_used: number;
  used_by: string;
  notes: string;
  inventory_supplies: { item_name: string; unit: string } | null;
  room_inventory: { room_number: string } | null;
}

interface InventoryReportProps {
  logs: Log[];
  generatedBy: string;
}

export default function InventoryReport({
  logs,
  generatedBy,
}: InventoryReportProps) {
  const currentDate = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CoolStay Resort</Text>
          <Text style={styles.subtitle}>Inventory Movement Report</Text>
          <Text style={styles.subtitle}>
            Generated on: {currentDate} by {generatedBy}
          </Text>
        </View>

        {/* Table Header */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableColHeader, width: "15%" }}>
              <Text style={styles.tableCellHeader}>Date</Text>
            </View>
            <View style={{ ...styles.tableColHeader, width: "25%" }}>
              <Text style={styles.tableCellHeader}>Item</Text>
            </View>
            <View style={{ ...styles.tableColHeader, width: "10%" }}>
              <Text style={styles.tableCellHeader}>Action</Text>
            </View>
            <View style={{ ...styles.tableColHeader, width: "10%" }}>
              <Text style={styles.tableCellHeader}>Qty</Text>
            </View>
            <View style={{ ...styles.tableColHeader, width: "15%" }}>
              <Text style={styles.tableCellHeader}>Location</Text>
            </View>
            <View style={{ ...styles.tableColHeader, width: "25%" }}>
              <Text style={styles.tableCellHeader}>Notes / User</Text>
            </View>
          </View>

          {/* Table Body */}
          {logs.map((log) => (
            <View style={styles.tableRow} key={log.id}>
              <View style={{ ...styles.tableCol, width: "15%" }}>
                <Text style={styles.tableCell}>
                  {new Date(log.usage_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: "25%" }}>
                <Text style={styles.tableCell}>
                  {log.inventory_supplies?.item_name || "Unknown Item"}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: "10%" }}>
                <Text
                  style={{
                    ...styles.tableCell,
                    ...(log.purpose === "Restock"
                      ? styles.badgeIn
                      : styles.badgeOut),
                  }}
                >
                  {log.purpose === "Restock" ? "IN" : "OUT"}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: "10%" }}>
                <Text style={styles.tableCell}>{log.quantity_used}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: "15%" }}>
                <Text style={styles.tableCell}>
                  {log.room_inventory?.room_number
                    ? `Room ${log.room_inventory.room_number}`
                    : "General"}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: "25%" }}>
                <Text style={styles.tableCell}>
                  {log.notes} ({log.used_by})
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
