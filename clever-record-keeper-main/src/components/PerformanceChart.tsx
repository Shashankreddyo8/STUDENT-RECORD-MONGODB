import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables, ChartOptions, ChartType } from "chart.js";
Chart.register(...registerables);

/** ---------- Types ---------- */
interface Student {
  id: string;
  name: string;
  class?: string;
  grades: Record<string, number>;
}

interface PerformanceChartProps {
  students: Student[];
  initialMode?: "bar" | "radial";
  showLabels?: boolean;
  className?: string;
}

/** ---------- Helper: buckets calculation ---------- */
/** A: >=85, B: 70-84, C: 50-69, D: <50 */
function calcBucketsRaw(students: Student[]) {
  const buckets = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  let totalMarks = 0;
  let count = 0;
  students.forEach((s) => {
    const vals = Object.values(s.grades ?? {});
    if (!vals.length) return;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    totalMarks += sum;
    count += vals.length;
    if (avg >= 85) buckets.A++;
    else if (avg >= 70) buckets.B++;
    else if (avg >= 50) buckets.C++;
    else buckets.D++;
  });
  return { buckets, totalMarks, count };
}

/** ---------- Component ---------- */
export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  students,
  initialMode = "bar",
  showLabels = true,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const pluginRegistered = useRef(false);
  const [mode, setMode] = useState<"bar" | "radial">(initialMode);

  // Memoize bucket calculation so re-rendering doesn't recompute unnecessarily
  const { buckets, totalMarks, count } = useMemo(() => calcBucketsRaw(students), [students]);

  const totalStudents = buckets.A + buckets.B + buckets.C + buckets.D;

  // Register once: nice center-text plugin for doughnut + subtle bg card clearing plugin
  useEffect(() => {
    if (pluginRegistered.current) return;

    const centerTextPlugin = {
      id: "center-text-plugin",
      afterDraw(chart: any) {
        if (chart.config.type !== "doughnut") return;
        const { ctx, chartArea: { top, bottom, left, right } = {} } = chart;
        if (!ctx) return;
        const width = chart.width;
        const height = chart.height;
        ctx.save();
        // center text: total students
        ctx.font = `${Math.round(Math.min(width, height) / 12)}px Inter, Arial`;
        ctx.fillStyle = "#222";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cx = chart.getDatasetMeta(0).data[0].x || width / 2;
        const cy = chart.getDatasetMeta(0).data[0].y || height / 2;
        ctx.fillText(`${totalStudents}`, cx, cy - 6);
        ctx.font = `${Math.round(Math.min(width, height) / 28)}px Inter, Arial`;
        ctx.fillStyle = "#666";
        ctx.fillText("students", cx, cy + 14);
        ctx.restore();
      },
    };

    const subtleCardClear = {
      id: "card-clear-plugin",
      beforeDraw(chart: any) {
        const ctx = chart.ctx;
        const area = chart.chartArea;
        if (!area) return;
        // Draw subtle translucent white background with rounded corners to mimic card interior
        ctx.save();
        // Note: keep light and subtle to avoid blocking chart visuals
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.fillRect(area.left - 6, area.top - 6, area.right - area.left + 12, area.bottom - area.top + 12);
        ctx.restore();
      },
    };

    Chart.register(centerTextPlugin, subtleCardClear);
    pluginRegistered.current = true;
  }, [totalStudents]);

  // Build / update chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // create responsive gradients (recreate per render so they adapt to canvas size)
    const gradFor = (colors: string[]) => {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
      const step = 1 / Math.max(colors.length - 1, 1);
      colors.forEach((c, i) => g.addColorStop(i * step, c));
      return g;
    };

    const gradGreen = gradFor(["#dff8eb", "#2bb673"]);
    const gradYellow = gradFor(["#fff7d6", "#f0b429"]);
    const gradOrange = gradFor(["#ffe9d6", "#ff8a4c"]);
    const gradRed = gradFor(["#ffe5eb", "#ff5a7a"]);

    const data = {
      labels: ["A", "B", "C", "D"],
      datasets: [
        {
          label: "Students",
          data: [buckets.A, buckets.B, buckets.C, buckets.D],
          backgroundColor: [gradGreen, gradYellow, gradOrange, gradRed] as any,
          borderRadius: 12,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
          borderWidth: 0,
        },
      ],
    };

    const commonOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(255,255,255,0.98)",
          titleColor: "#111",
          bodyColor: "#333",
          borderColor: "rgba(0,0,0,0.06)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items: any) => (items && items.length ? `Bucket ${items[0].label}` : ""),
            label: (ctx) => {
              const idx = ctx.dataIndex;
              const label = ctx.label || "";
              const val = ctx.dataset.data[idx] as number;
              const total = (buckets.A + buckets.B + buckets.C + buckets.D) || 1;
              const pct = ((val / total) * 100).toFixed(1);
              return [`Count: ${val} (${pct}%)`, `A/B/C/D: ${buckets.A}/${buckets.B}/${buckets.C}/${buckets.D}`, `Total marks: ${totalMarks}`];
            },
          },
        },
  // small accessibility label
      },
    };

    // destroy previous
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const chartType: ChartType = mode === "bar" ? "bar" : "doughnut";

    chartRef.current = new Chart(ctx, {
      type: chartType,
      data,
      options: {
        ...commonOptions,
        ...(mode === "bar"
          ? {
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: "#444", font: { size: 12 } },
                },
                y: {
                  grid: { color: "rgba(0,0,0,0.04)" },
                  beginAtZero: true,
                  ticks: { stepSize: Math.max(1, Math.ceil(Math.max(...data.datasets[0].data as number[]) / 5)), color: "#444", font: { size: 11 } },
                },
              },
            }
          : {
              cutout: "62%",
              circumference: 360,
            }),
      },
    });

    // clean up on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets.A, buckets.B, buckets.C, buckets.D, mode, totalMarks]); // only re-create when necessary

  // Export image helper
  const exportImage = () => {
    if (!chartRef.current) return;
    const link = document.createElement("a");
    link.href = chartRef.current.toBase64Image("image/png", 1);
    link.download = `performance-${mode}.png`;
    link.click();
  };

  // Accessibility: keyboard toggles for modes
  const onKeyToggle = (e: React.KeyboardEvent, target: "bar" | "radial") => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMode(target);
    }
  };

  return (
    <div
      className={`p-4 bg-white rounded-2xl shadow-md ${className}`}
      style={{ minHeight: 340, display: "flex", flexDirection: "column", gap: 12 }}
      role="region"
      aria-label="Class performance chart"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Class Performance</h3>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>A/B/C/D counts • Total students {totalStudents}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showLabels && <div style={{ fontSize: 12, color: "#6b7280" }}>{`A/B/C/D: ${buckets.A}/${buckets.B}/${buckets.C}/${buckets.D}`}</div>}

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setMode("bar")}
              onKeyDown={(e) => onKeyToggle(e, "bar")}
              aria-pressed={mode === "bar"}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: mode === "bar" ? "#0f62fe" : "transparent",
                color: mode === "bar" ? "#fff" : "#475569",
                fontSize: 13,
                boxShadow: mode === "bar" ? "0 6px 18px rgba(15,98,254,0.12)" : "none",
              }}
            >
              Bar
            </button>
            <button
              onClick={() => setMode("radial")}
              onKeyDown={(e) => onKeyToggle(e, "radial")}
              aria-pressed={mode === "radial"}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: mode === "radial" ? "#0f62fe" : "transparent",
                color: mode === "radial" ? "#fff" : "#475569",
                fontSize: 13,
                boxShadow: mode === "radial" ? "0 6px 18px rgba(15,98,254,0.12)" : "none",
              }}
            >
              Radial
            </button>

            <button
              onClick={exportImage}
              title="Export chart as PNG"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.06)",
                background: "#fff",
                cursor: "pointer",
                color: "#0f172a",
                fontSize: 13,
              }}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 240, width: "100%", position: "relative" }}>
        <canvas ref={canvasRef} role="img" aria-label={`Performance chart showing ${totalStudents} students`} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Total marks: <strong style={{ color: "#111" }}>{totalMarks}</strong> • Avg per mark:{" "}
          <strong style={{ color: "#111" }}>{count ? Math.round((totalMarks / count) * 10) / 10 : 0}</strong>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* small legend pills */}
          {[
            { key: "A", color: "#2bb673" },
            { key: "B", color: "#f0b429" },
            { key: "C", color: "#ff8a4c" },
            { key: "D", color: "#ff5a7a" },
          ].map((l) => (
            <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
              <span style={{ width: 10, height: 10, borderRadius: 4, background: l.color, display: "inline-block" }} />
              <span style={{ minWidth: 18 }}>{l.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
