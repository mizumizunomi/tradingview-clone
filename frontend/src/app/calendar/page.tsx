"use client";
import { useState } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { CALENDAR_EVENTS } from "@/lib/calendarData";
import { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";
import { Calendar, Filter, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

const IMPACT_CONFIG = {
  high: { label: "High", color: "#ef5350", bg: "#ef535020", dot: "🔴" },
  medium: { label: "Medium", color: "#f59e0b", bg: "#f59e0b20", dot: "🟡" },
  low: { label: "Low", color: "#26a69a", bg: "#26a69a20", dot: "🟢" },
};

const COUNTRIES = ["All", "US", "EU", "UK", "CA", "DE", "JP", "AU", "CH"];

function groupByDate(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {};
  events.forEach((e) => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  return groups;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function ActualBadge({ actual, forecast }: { actual?: string; forecast?: string }) {
  if (!actual) return <span className="text-[11px]" style={{ color: "var(--tv-muted)" }}>—</span>;
  const better = forecast && actual > forecast;
  const worse = forecast && actual < forecast;
  return (
    <div className="flex items-center gap-1">
      <span className={cn("text-[11px] font-bold font-mono", better ? "text-[#26a69a]" : worse ? "text-[#ef5350]" : "")}>
        {actual}
      </span>
      {better && <TrendingUp className="h-3 w-3 text-[#26a69a]" />}
      {worse && <TrendingDown className="h-3 w-3 text-[#ef5350]" />}
      {!better && !worse && <Minus className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />}
    </div>
  );
}

export default function CalendarPage() {
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [countryFilter, setCountryFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = CALENDAR_EVENTS
    .filter((e) => impactFilter === "all" || e.impact === impactFilter)
    .filter((e) => countryFilter === "All" || e.country === countryFilter)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const grouped = groupByDate(filtered);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <Calendar className="h-5 w-5 text-[#2962ff]" />
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--tv-text-light)" }}>Economic Calendar</h1>
            <p className="text-xs" style={{ color: "var(--tv-muted)" }}>Upcoming economic events and data releases</p>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors"
            style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)", background: showFilters ? "var(--tv-bg3)" : "transparent" }}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            <ChevronDown className={cn("h-3 w-3 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-4 px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
            <div className="flex items-center gap-1">
              <span className="text-[11px] mr-1" style={{ color: "var(--tv-muted)" }}>Impact:</span>
              {(["all", "high", "medium", "low"] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => setImpactFilter(i)}
                  className="px-2 py-0.5 rounded text-[11px] transition-colors capitalize"
                  style={{
                    background: impactFilter === i ? "#2962ff" : "var(--tv-bg3)",
                    color: impactFilter === i ? "white" : "var(--tv-text)",
                  }}
                >
                  {i === "all" ? "All" : IMPACT_CONFIG[i].dot + " " + IMPACT_CONFIG[i].label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] mr-1" style={{ color: "var(--tv-muted)" }}>Country:</span>
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCountryFilter(c)}
                  className="px-2 py-0.5 rounded text-[11px] transition-colors"
                  style={{
                    background: countryFilter === c ? "#2962ff" : "var(--tv-bg3)",
                    color: countryFilter === c ? "white" : "var(--tv-text)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Events list */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date}>
              {/* Date header */}
              <div
                className="sticky top-0 z-10 flex items-center gap-2 px-6 py-2 border-b"
                style={{
                  background: "var(--tv-bg2)",
                  borderColor: "var(--tv-border)",
                  borderLeft: date === today ? "3px solid #2962ff" : "3px solid transparent",
                }}
              >
                <span className="text-xs font-bold" style={{ color: date === today ? "#2962ff" : "var(--tv-text-light)" }}>
                  {formatDate(date)}
                </span>
                {date === today && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2962ff] text-white font-bold">TODAY</span>
                )}
                <span className="text-[10px]" style={{ color: "var(--tv-muted)" }}>({events.length} events)</span>
              </div>

              {/* Event rows */}
              <table className="w-full">
                <thead className="border-b" style={{ borderColor: "var(--tv-border)" }}>
                  <tr>
                    {["Time", "Country", "Impact", "Event", "Forecast", "Previous", "Actual"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--tv-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => {
                    const imp = IMPACT_CONFIG[evt.impact];
                    return (
                      <tr
                        key={evt.id}
                        className="border-b hover:bg-[var(--tv-bg3)] transition-colors"
                        style={{ borderColor: "var(--tv-border)" }}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--tv-text)" }}>{evt.time}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="text-base">{evt.flag}</span>
                            <span style={{ color: "var(--tv-muted)" }}>{evt.country}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: imp.bg, color: imp.color }}
                          >
                            <span className="text-[8px]">●</span>
                            {imp.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-medium" style={{ color: "var(--tv-text-light)" }}>{evt.event}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--tv-text)" }}>{evt.forecast || "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--tv-muted)" }}>{evt.previous || "—"}</td>
                        <td className="px-4 py-2.5">
                          <ActualBadge actual={evt.actual} forecast={evt.forecast} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
