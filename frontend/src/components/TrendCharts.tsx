"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { type TrendData } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

export default function TrendCharts({ trends }: { trends: TrendData }) {
  const { t } = useTranslation();
  if (!trends.dates.length) return <p style={{ color: "var(--text-muted)", textAlign: "center" }}>{t("chart.noData")}</p>;

  const data = trends.dates.map((d, i) => ({
    date: new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    biomass: trends.biomass[i],
    fcr: trends.fcr[i],
    survival: trends.survival[i],
    adg: trends.adg[i],
    abw: trends.abw[i],
    feed: trends.feed_daily[i],
  }));

  const chartStyle = { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "0.75rem 0" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1rem" }}>
      <ChartPanel title={t("chart.growth")} data={data} dataKey="abw" color="#00d4aa" unit="g" style={chartStyle} />
      <ChartPanel title={t("chart.biomass")} data={data} dataKey="biomass" color="#0ea5e9" unit="kg" style={chartStyle} />
      <ChartPanel title={t("chart.fcr")} data={data} dataKey="fcr" color="#f59e0b" unit="" style={chartStyle} />
      <ChartPanel title={t("chart.survival")} data={data} dataKey="survival" color="#10b981" unit="%" style={chartStyle} />
      <ChartPanel title={t("chart.dailyFeed")} data={data} dataKey="feed" color="#8b5cf6" unit="kg" style={chartStyle} />
      <ChartPanel title={t("chart.adg")} data={data} dataKey="adg" color="#22d3ee" unit="g/day" style={chartStyle} />
    </div>
  );
}

function ChartPanel({ title, data, dataKey, color, unit, style }: {
  title: string; data: Record<string, unknown>[]; dataKey: string; color: string; unit: string; style: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", padding: "0 1rem", marginBottom: "0.5rem" }}>{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: "#0a192f", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8, fontSize: "0.8rem" }}
            labelStyle={{ color: "#94a3b8" }} formatter={(v: number) => [`${v?.toFixed(2)} ${unit}`, title]} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
