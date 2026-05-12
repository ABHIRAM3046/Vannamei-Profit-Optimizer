"use client";
import { useEffect, useState } from "react";
import { analyticsAPI, iotAPI, type Analytics, type FeedRecommendation, type SensorReading } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import TrendCharts from "./TrendCharts";
import IoTSetupCard from "./IoTSetupCard";

interface Props { pondId: string; onAddLog: () => void; onViewHarvest: () => void; onTransfer: () => void; onBack: () => void; }

function fcrColor(fcr: number | null | undefined): string {
  if (!fcr) return "var(--text-muted)";
  if (fcr <= 1.3) return "var(--fcr-excellent)";
  if (fcr <= 1.6) return "var(--fcr-good)";
  if (fcr <= 1.8) return "var(--fcr-concerning)";
  return "var(--fcr-critical)";
}

export default function PondDetail({ pondId, onAddLog, onViewHarvest, onTransfer, onBack }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<Analytics | null>(null);
  const [telemetry, setTelemetry] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    analyticsAPI.get(pondId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    // Try to get latest telemetry
    iotAPI.latestTelemetry(pondId)
      .then(setTelemetry)
      .catch(() => { /* ignore 404 if no device */ });
  }, [pondId]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}><div className="spinner" /></div>;
  if (error) return <div className="glass-card" style={{ padding: "2rem", textAlign: "center", color: "var(--red)" }}>{error}</div>;
  if (!data) return null;

  const m = data.current_metrics;

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>
        {t("detail.backToDash")}
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{data.pond_name}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{t("detail.doc")} <strong style={{ color: "var(--teal)" }}>{data.doc}</strong></p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onTransfer}>🔄 {t("transfer.title") || "Transfer PLs"}</button>
          <button className="btn-secondary" onClick={onViewHarvest}>{t("detail.harvestPlan")}</button>
          <button className="btn-primary" onClick={onAddLog}>{t("detail.addLog")}</button>
        </div>
      </div>

      <IoTSetupCard pondId={pondId} />

      {telemetry && (
        <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--cyan)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>🌊 Live Water Quality</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Updated {new Date(telemetry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>DO (mg/L)</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: (telemetry.dissolved_oxygen || 0) < 4 ? "var(--red)" : "var(--cyan)" }}>
                {telemetry.dissolved_oxygen?.toFixed(2) || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>pH</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: ((telemetry.ph || 7) < 7 || (telemetry.ph || 7) > 8.5) ? "var(--orange)" : "var(--teal)" }}>
                {telemetry.ph?.toFixed(2) || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Temp (°C)</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{telemetry.temperature_c?.toFixed(1) || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Ammonia (mg/L)</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: (telemetry.ammonia || 0) > 0.1 ? "var(--red)" : "var(--green)" }}>
                {telemetry.ammonia?.toFixed(3) || "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard accent="teal" label={t("card.biomass")} value={m.biomass_kg ? `${m.biomass_kg.toFixed(0)}` : "—"} unit="kg" icon="🏋️" />
        <StatCard accent="cyan" label={t("card.fcr")} value={m.fcr ? m.fcr.toFixed(2) : "—"} unit="" icon="📊"
          valueColor={fcrColor(m.fcr)} badge={m.fcr ? (m.fcr <= 1.3 ? t("card.excellent") : m.fcr <= 1.6 ? t("card.good") : m.fcr <= 1.8 ? t("card.warning") : t("card.critical")) : undefined} />
        <StatCard accent="green" label={t("card.survival")} value={m.survival_rate ? `${m.survival_rate.toFixed(1)}` : "—"} unit="%" icon="💚" />
        <StatCard accent="purple" label={t("detail.adg")} value={m.adg ? `${m.adg.toFixed(3)}` : "—"} unit="g/day" icon="📈" />
        <StatCard accent="orange" label={t("detail.abw")} value={m.avg_body_weight_g ? `${m.avg_body_weight_g.toFixed(1)}` : "—"} unit="g" icon="⚖️" />
        <StatCard accent="cyan" label={t("detail.totalFeed")} value={m.total_feed_kg ? `${m.total_feed_kg.toFixed(0)}` : "—"} unit="kg" icon="🍽️" />
      </div>

      {/* Alerts */}
      {data.active_alerts.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-secondary)" }}>{t("detail.activeAlerts")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.active_alerts.map(alert => (
              <div key={alert.id} className={`alert-${alert.severity}`} style={{ padding: "0.75rem 1rem", borderRadius: 10 }}>
                <h3 style={{ fontWeight: 600, fontSize: "0.85rem" }}>{alert.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.2rem" }}>{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed Recommendation */}
      <FeedRecPanel rec={data.feed_recommendation} t={t} />

      {/* Charts */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-secondary)" }}>{t("detail.trends")}</h2>
        <TrendCharts trends={data.trends} />
      </div>
    </div>
  );
}

function StatCard({ accent, label, value, unit, icon, valueColor, badge }: {
  accent: string; label: string; value: string; unit: string; icon: string; valueColor?: string; badge?: string;
}) {
  return (
    <div className={`stat-card ${accent}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: valueColor || "var(--text-primary)" }}>{value}</span>
        {unit && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>{unit}</span>}
      </div>
      {badge && (
        <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 6, marginTop: "0.5rem", display: "inline-block",
          background: valueColor ? `${valueColor}20` : "var(--teal-dim)", color: valueColor || "var(--teal)" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function FeedRecPanel({ rec, t }: { rec: FeedRecommendation; t: (k: string) => string }) {
  const changeColor = rec.change_percent > 0 ? "var(--green)" : rec.change_percent < 0 ? "var(--orange)" : "var(--text-secondary)";
  const changeIcon = rec.change_percent > 0 ? "↑" : rec.change_percent < 0 ? "↓" : "→";

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {t("detail.feedRec")}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("detail.recommended")}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--teal)" }}>{rec.recommended_feed_kg.toFixed(1)} <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>kg</span></div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("detail.change")}</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: changeColor }}>{changeIcon} {Math.abs(rec.change_percent).toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("detail.frequency")}</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{rec.feeding_frequency}× <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{t("detail.perDay")}</span></div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {rec.reasons.map((r, i) => (
          <p key={i} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{r}</p>
        ))}
      </div>
    </div>
  );
}
