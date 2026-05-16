import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface ActivityLogReportItem {
  id: string;
  action: string;
  created_at: string;
  ip_address: string | null;
  device_info: string | null;
  users: {
    full_name: string;
    email: string;
    role: string;
  } | null;
}

export interface ActivityLogReportFilters {
  search?: string;
  role?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

interface ActivityLogsReportProps {
  logs: ActivityLogReportItem[];
  filters: ActivityLogReportFilters;
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0A1A44",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748b",
  },
  filterBox: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#334155",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerRow: {
    backgroundColor: "#0A1A44",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    padding: 6,
  },
  dateCell: {
    width: "19%",
  },
  userCell: {
    width: "22%",
  },
  actionCell: {
    width: "34%",
  },
  roleCell: {
    width: "11%",
  },
  ipCell: {
    width: "14%",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 8,
  },
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const activeFilters = (filters: ActivityLogReportFilters) => {
  const entries = [
    filters.search ? `Search: ${filters.search}` : null,
    filters.role ? `Role: ${filters.role}` : null,
    filters.action ? `Action: ${filters.action}` : null,
    filters.startDate ? `From: ${filters.startDate}` : null,
    filters.endDate ? `To: ${filters.endDate}` : null,
  ].filter(Boolean);

  return entries.length > 0 ? entries.join(" | ") : "No filters applied";
};

export default function ActivityLogsReport({
  logs,
  filters,
  generatedAt,
}: ActivityLogsReportProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>System Activity Logs</Text>
          <Text style={styles.subtitle}>
            Generated {formatDateTime(generatedAt)} - {logs.length} records
          </Text>
        </View>

        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Snapshot Filters</Text>
          <Text>{activeFilters(filters)}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.dateCell]}>Timestamp</Text>
            <Text style={[styles.cell, styles.userCell]}>User</Text>
            <Text style={[styles.cell, styles.actionCell]}>Action</Text>
            <Text style={[styles.cell, styles.roleCell]}>Role</Text>
            <Text style={[styles.cell, styles.ipCell]}>IP Address</Text>
          </View>

          {logs.map((log) => (
            <View key={log.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.dateCell]}>
                {formatDateTime(log.created_at)}
              </Text>
              <Text style={[styles.cell, styles.userCell]}>
                {log.users?.full_name || "System/Unknown"}
                {log.users?.email ? `\n${log.users.email}` : ""}
              </Text>
              <Text style={[styles.cell, styles.actionCell]}>
                {log.action}
                {log.device_info ? `\n${log.device_info}` : ""}
              </Text>
              <Text style={[styles.cell, styles.roleCell]}>
                {log.users?.role || "unknown"}
              </Text>
              <Text style={[styles.cell, styles.ipCell]}>
                {log.ip_address || "Hidden"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>CoolStay Admin Audit Trail</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
