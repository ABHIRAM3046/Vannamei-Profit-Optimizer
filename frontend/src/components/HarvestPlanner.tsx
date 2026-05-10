"use client";
import { useEffect, useState } from "react";
import { harvestAPI, type HarvestPlan, type HarvestScenario } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useTranslation } from "@/lib/i18n/context";

export default function HarvestPlanner({ pondId, onBack }: { pondId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<HarvestPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    harvestAPI.plan(pondId).then(setPlan).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [pondId]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}><div className="spinner" /></div>;
  if (error) return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>← Back</button>
      <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}><p style={{ color: "var(--orange)" }}>{error}</p></div>
    </div>
  );
  if (!plan) return null;

  const chartData = plan.scenarios.map(s => ({
    label: s.days_from_now === 0 ? t("harvest.now") : t("harvest.plusDays", { days: s.days_from_now }),
    profit: Math.round(s.total_profit),
    isOptimal: s.days_from_now === plan.optimal_harvest_day,
  }));

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>{t("back")}</button>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>{t("harvest.title")}</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        {plan.pond_name} • {t("sidebar.doc")} {plan.current_doc}
      </p>

      {/* Recommendation */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid var(--teal)" }}>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>{plan.recommendation}</p>
      </div>

      {/* Key Numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card teal">
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("harvest.profitNow")}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--teal)", marginTop: "0.5rem" }}>₹{plan.harvest_now_profit.toLocaleString("en-IN")}</div>
        </div>
        <div className="stat-card green">
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("harvest.optimalProfit")}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--green)", marginTop: "0.5rem" }}>₹{plan.optimal_profit.toLocaleString("en-IN")}</div>
        </div>
        <div className="stat-card orange">
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("harvest.extra")}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--orange)", marginTop: "0.5rem" }}>
            +₹{(plan.optimal_profit - plan.harvest_now_profit).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("harvest.moreDays", { days: plan.optimal_harvest_day })}</div>
        </div>
      </div>

      {/* Profit Chart */}
      <div className="glass-card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{t("harvest.projectedProfit")}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: "#0a192f", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8 }}
              formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Profit"]} />
            <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isOptimal ? "#00d4aa" : "rgba(14,165,233,0.5)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Table */}
      <div className="glass-card" style={{ padding: "1rem", overflow: "auto" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{t("harvest.scenarios")}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {[t("harvest.tableHarvest"), t("harvest.tableAbw"), t("harvest.tableBiomass"), t("harvest.tableSurvival"), t("harvest.tableFeedCost"), t("harvest.tableRevenue"), t("harvest.tableProfit"), t("harvest.tableFcr")].map(h => (
                <th key={h} style={{ textAlign: "right", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.scenarios.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: s.days_from_now === plan.optimal_harvest_day ? "rgba(0,212,170,0.08)" : "transparent" }}>
                <td style={{ padding: "0.5rem", fontWeight: 600, color: s.days_from_now === plan.optimal_harvest_day ? "var(--teal)" : "var(--text-primary)" }}>
                  {s.days_from_now === 0 ? t("harvest.now") : t("harvest.plusDays", { days: s.days_from_now })}
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>{s.projected_abw_g.toFixed(1)}</td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>{s.projected_biomass_kg.toFixed(0)}</td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>{s.projected_survival.toFixed(0)}%</td>
                <td style={{ textAlign: "right", padding: "0.5rem", color: "var(--orange)" }}>₹{s.total_feed_cost.toLocaleString("en-IN")}</td>
                <td style={{ textAlign: "right", padding: "0.5rem", color: "var(--cyan)" }}>₹{s.total_revenue.toLocaleString("en-IN")}</td>
                <td style={{ textAlign: "right", padding: "0.5rem", fontWeight: 700, color: s.total_profit > 0 ? "var(--green)" : "var(--red)" }}>₹{s.total_profit.toLocaleString("en-IN")}</td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>{s.projected_fcr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
