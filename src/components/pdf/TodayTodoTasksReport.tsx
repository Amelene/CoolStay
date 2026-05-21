"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type TodoTaskReportItem = {
  id: string;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  room_number?: string | null;
  staff_name: string;
  staff_position: string;
};

type TodayTodoTasksReportProps = {
  generatedAt: string;
  tasks: TodoTaskReportItem[];
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: "#1E293B",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottom: "2px solid #0A1A44",
    paddingBottom: 12,
    marginBottom: 18,
  },
  brand: {
    fontSize: 22,
    color: "#0A1A44",
    fontWeight: "bold",
  },
  title: {
    marginTop: 4,
    fontSize: 12,
    color: "#475569",
    textTransform: "uppercase",
  },
  meta: {
    marginTop: 8,
    fontSize: 9,
    color: "#64748B",
  },
  summary: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0A1A44",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0A1A44",
    color: "white",
    padding: 7,
    fontSize: 8,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #E2E8F0",
    padding: 7,
  },
  task: { width: "34%" },
  assignee: { width: "22%" },
  room: { width: "12%" },
  priority: { width: "12%" },
  notes: { width: "20%" },
  taskTitle: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  muted: {
    color: "#64748B",
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTop: "1px solid #E2E8F0",
    paddingTop: 8,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 8,
  },
});

export default function TodayTodoTasksReport({
  generatedAt,
  tasks,
}: TodayTodoTasksReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CoolStay Resort</Text>
          <Text style={styles.title}>{"Today's To Do Tasks"}</Text>
          <Text style={styles.meta}>Generated: {generatedAt}</Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Pending tasks due today: {tasks.length}
          </Text>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.task}>Task</Text>
            <Text style={styles.assignee}>Assigned To</Text>
            <Text style={styles.room}>Room</Text>
            <Text style={styles.priority}>Priority</Text>
            <Text style={styles.notes}>Notes</Text>
          </View>
          {tasks.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.task}>No To Do tasks due today.</Text>
              <Text style={styles.assignee}>-</Text>
              <Text style={styles.room}>-</Text>
              <Text style={styles.priority}>-</Text>
              <Text style={styles.notes}>-</Text>
            </View>
          ) : (
            tasks.map((task, index) => (
              <View
                key={task.id}
                style={[
                  styles.row,
                  { backgroundColor: index % 2 === 0 ? "white" : "#F8FAFC" },
                ]}
              >
                <View style={styles.task}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.muted}>Due: {task.due_date || "-"}</Text>
                </View>
                <View style={styles.assignee}>
                  <Text>{task.staff_name}</Text>
                  <Text style={styles.muted}>{task.staff_position}</Text>
                </View>
                <Text style={styles.room}>{task.room_number || "-"}</Text>
                <Text style={styles.priority}>
                  {task.priority.toUpperCase()}
                </Text>
                <Text style={styles.notes}>{task.description || "-"}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Confidential Task Document - Generated via CoolStay Admin
        </Text>
      </Page>
    </Document>
  );
}
