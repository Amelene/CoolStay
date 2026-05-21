"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Data Types ──────────────────────────────────────────────────────────────

export interface DayHeader {
  weekday: string; // "MON"
  dayNum: number; // 19
  monthShort: string; // "May"
  isToday: boolean;
}

export interface ScheduleStaffRow {
  name: string;
  position: string;
  department: string;
  shifts: Array<"morning" | "mid" | "night" | "off">;
}

interface StaffScheduleReportProps {
  /** Optional override — if omitted, derived automatically from dayHeaders */
  weekLabel?: string;
  dayHeaders: DayHeader[];
  rows: ScheduleStaffRow[];
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds "May 18 – May 24, 2026" from the first and last DayHeader.
 * Always shows both month names so the range is unambiguous.
 */
function deriveWeekLabel(dayHeaders: DayHeader[], year: number): string {
  if (!dayHeaders.length) return "";
  const first = dayHeaders[0];
  const last = dayHeaders[dayHeaders.length - 1];
  return `${first.monthShort} ${first.dayNum} – ${last.monthShort} ${last.dayNum}, ${year}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DEPT_COLOR: Record<string, string> = {
  "Front Desk": "#F472B6", // pink-400
  Housekeeping: "#2DD4BF", // teal-400
  Maintenance: "#FB923C", // orange-400
  Management: "#818CF8", // indigo-400
  Security: "#94A3B8", // slate-400
};

const SHIFT_DISPLAY: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  morning: {
    label: "AM  6–2",
    bg: "#FFFBEB",
    color: "#B45309",
    border: "#FCD34D",
  },
  mid: {
    label: "MID 2–10",
    bg: "#EFF6FF",
    color: "#1D4ED8",
    border: "#93C5FD",
  },
  night: {
    label: "NGT 10–6",
    bg: "#F5F3FF",
    color: "#6D28D9",
    border: "#C4B5FD",
  },
};

// A4 Landscape content width = 841.89 - 60 (padding) = 781.89 ≈ 782pt
const COL_NAME = 138;
const COL_DAY = 92; // 7 × 92 = 644; 138 + 644 = 782 ✓

// ─── Palette ──────────────────────────────────────────────────────────────────

const NAVY = "#0D1B4B";
const NAVY_MID = "#1A2E6B";
const NAVY_LIGHT = "#243580";
const ACCENT = "#3B82F6"; // blue-500
const ACCENT_BG = "#EFF6FF"; // blue-50
const TODAY_COL = "#DBEAFE"; // blue-100
const TODAY_HDR = "#1D4ED8"; // blue-700

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 30,
    paddingTop: 22,
    paddingBottom: 34,
    backgroundColor: "#F8FAFF",
    fontFamily: "Helvetica",
    fontSize: 9,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "column",
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 7,
    color: "#93C5FD",
    letterSpacing: 2.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  weekLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "right",
  },
  weekBadge: {
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  weekBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  genLabel: {
    fontSize: 6,
    color: "#93C5FD",
    textAlign: "right",
    marginTop: 5,
  },

  // ── Table header row ──────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY_MID,
    borderRadius: 6,
    marginBottom: 3,
    overflow: "hidden",
  },
  thName: {
    width: COL_NAME,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "flex-end",
    borderRightWidth: 1,
    borderRightColor: NAVY_LIGHT,
  },
  thNameText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#93C5FD",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  thDay: {
    width: COL_DAY,
    paddingVertical: 8,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: NAVY_LIGHT,
  },
  thDayToday: {
    backgroundColor: TODAY_HDR,
  },
  thDayWeekday: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: "#7DD3FC",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  thDayWeekdayToday: {
    color: "#BFDBFE",
  },
  thDayNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 1.1,
    marginTop: 1,
  },
  thDayMon: {
    fontSize: 6,
    color: "#60A5FA",
    marginTop: 2,
  },
  thDayMonToday: {
    color: "#BFDBFE",
  },

  // ── Staff rows ────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 40,
  },
  rowAlt: {
    backgroundColor: "#F1F5F9",
  },

  // Name cell
  cellName: {
    width: COL_NAME,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 2,
    borderRightColor: "#E2E8F0",
  },
  deptBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginRight: 9,
  },
  staffName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0F172A",
  },
  staffRole: {
    fontSize: 6,
    color: "#64748B",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Day cell
  cellDay: {
    width: COL_DAY,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    padding: 5,
  },
  cellDayToday: {
    backgroundColor: TODAY_COL,
  },
  shiftPill: {
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 76,
    alignItems: "center",
    borderWidth: 1,
  },
  shiftText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textAlign: "center",
  },
  offDot: {
    width: 18,
    height: 3,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
  },

  // ── Department legend strip ───────────────────────────────────────────────
  deptLegend: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 0,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  deptLegendLabel: {
    fontSize: 6.5,
    color: "#64748B",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginRight: 2,
  },
  deptDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    marginRight: 3,
  },
  deptItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  deptItemText: {
    fontSize: 6.5,
    color: "#475569",
  },

  // ── Shift legend ──────────────────────────────────────────────────────────
  legend: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingTop: 7,
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#CBD5E1",
    alignItems: "center",
  },
  legendLabel: {
    fontSize: 6.5,
    color: "#64748B",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginRight: 2,
  },
  legendPill: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
  },
  legendPillText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  legendTodayNote: {
    fontSize: 6.5,
    color: TODAY_HDR,
    fontFamily: "Helvetica-Bold",
    marginLeft: 6,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 12,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#CBD5E1",
    paddingTop: 5,
  },
  footerLeft: {
    fontSize: 6.5,
    color: "#94A3B8",
  },
  footerRight: {
    fontSize: 6.5,
    color: "#94A3B8",
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffScheduleReport({
  weekLabel,
  dayHeaders,
  rows,
  generatedAt,
  year = new Date().getFullYear(),
}: StaffScheduleReportProps & { year?: number }) {
  const resolvedWeekLabel = weekLabel ?? deriveWeekLabel(dayHeaders, year);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Text style={s.brand}>COOLSTAY</Text>
            <Text style={s.subtitle}>Weekly Staff Schedule</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.weekLabel}>{resolvedWeekLabel}</Text>
            <View style={s.weekBadge}>
              <Text style={s.weekBadgeText}>Current Week</Text>
            </View>
            <Text style={s.genLabel}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* ── COLUMN HEADERS ── */}
        <View style={s.tableHeader} fixed>
          <View style={s.thName}>
            <Text style={s.thNameText}>Staff Member</Text>
          </View>
          {dayHeaders.map((d, i) => (
            <View key={i} style={[s.thDay, d.isToday ? s.thDayToday : {}]}>
              <Text
                style={[s.thDayWeekday, d.isToday ? s.thDayWeekdayToday : {}]}
              >
                {d.weekday}
              </Text>
              <Text style={s.thDayNum}>{d.dayNum}</Text>
              <Text style={[s.thDayMon, d.isToday ? s.thDayMonToday : {}]}>
                {d.monthShort}
              </Text>
            </View>
          ))}
        </View>

        {/* ── STAFF ROWS ── */}
        {rows.map((staff, ri) => (
          <View
            key={ri}
            style={[s.row, ri % 2 !== 0 ? s.rowAlt : {}]}
            wrap={false}
          >
            {/* Name + Role */}
            <View style={s.cellName}>
              <View
                style={[
                  s.deptBar,
                  { backgroundColor: DEPT_COLOR[staff.department] ?? ACCENT },
                ]}
              />
              <View>
                <Text style={s.staffName}>{staff.name}</Text>
                <Text style={s.staffRole}>{staff.position}</Text>
              </View>
            </View>

            {/* Shift cells */}
            {staff.shifts.map((shift, di) => {
              const cfg = SHIFT_DISPLAY[shift];
              const isToday = dayHeaders[di]?.isToday ?? false;
              return (
                <View
                  key={di}
                  style={[s.cellDay, isToday ? s.cellDayToday : {}]}
                >
                  {cfg ? (
                    <View
                      style={[
                        s.shiftPill,
                        { backgroundColor: cfg.bg, borderColor: cfg.border },
                      ]}
                    >
                      <Text style={[s.shiftText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.offDot} />
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* ── DEPARTMENT LEGEND ── */}
        <View style={s.deptLegend}>
          <Text style={s.deptLegendLabel}>Depts:</Text>
          {Object.entries(DEPT_COLOR).map(([dept, color]) => (
            <View key={dept} style={s.deptItem}>
              <View style={[s.deptDot, { backgroundColor: color }]} />
              <Text style={s.deptItemText}>{dept}</Text>
            </View>
          ))}
        </View>

        {/* ── SHIFT LEGEND ── */}
        <View style={s.legend}>
          <Text style={s.legendLabel}>Shifts:</Text>
          {Object.values(SHIFT_DISPLAY).map((cfg) => (
            <View
              key={cfg.label}
              style={[
                s.legendPill,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <Text style={[s.legendPillText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          ))}
          <View
            style={[
              s.legendPill,
              {
                backgroundColor: "#F8FAFC",
                borderColor: "#E2E8F0",
                marginLeft: 4,
              },
            ]}
          >
            <Text style={[s.legendPillText, { color: "#94A3B8" }]}>OFF</Text>
          </View>
          <Text style={s.legendTodayNote}>
            ★ Today&apos;s column highlighted in blue
          </Text>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            CoolStay Hotel Management System · Confidential · Do not distribute
          </Text>
          <Text
            style={s.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
