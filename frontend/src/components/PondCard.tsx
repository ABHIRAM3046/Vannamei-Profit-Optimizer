"use client";
import { type Pond } from "@/lib/api";

import { useTranslation } from "@/lib/i18n/context";

function fcrStatus(fcr: number | null | undefined, t: (k: string) => string): { label: string; color: string; bg: string } {
  if (!fcr) return { label: t("card.na"), color: "var(--text-muted)", bg: "rgba(100,116,139,0.1)" };
  if (fcr <= 1.3) return { label: t("card.excellent"), color: "var(--fcr-excellent)", bg: "rgba(16,185,129,0.12)" };
  if (fcr <= 1.6) return { label: t("card.good"), color: "var(--fcr-good)", bg: "rgba(34,211,238,0.12)" };
  if (fcr <= 1.8) return { label: t("card.warning"), color: "var(--fcr-concerning)", bg: "rgba(245,158,11,0.12)" };
  return { label: t("card.critical"), color: "var(--fcr-critical)", bg: "rgba(239,68,68,0.12)" };
}

export default function PondCard({ pond, onClick }: { pond: Pond; onClick: () => void }) {
  const { t } = useTranslation();
  const m = pond.latest_metrics;
  const fcr = fcrStatus(m?.fcr, t);

  return (
    <div className="glass-card" onClick={onClick} style={{ padding: "1.25rem", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>{pond.name}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
            {t("card.stocked")} {new Date(pond.stocking_date).toLocaleDateString("en-IN")} • {(pond.pl_stocked / 1000).toFixed(0)}K {t("card.pls")}
          </p>
        </div>
        <div style={{ background: "var(--teal-dim)", padding: "0.3rem 0.75rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, color: "var(--teal)" }}>
          {t("card.doc")} {pond.doc || 0}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <MetricMini label={t("card.biomass")} value={m?.biomass_kg ? `${m.biomass_kg.toFixed(0)} kg` : "—"} color="var(--teal)" />
        <MetricMini label={t("card.fcr")} value={m?.fcr ? m.fcr.toFixed(2) : "—"} color={fcr.color} />
        <MetricMini label={t("card.survival")} value={m?.survival_rate ? `${m.survival_rate.toFixed(0)}%` : "—"} color="var(--cyan)" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.65rem", background: fcr.bg, color: fcr.color, padding: "0.2rem 0.5rem", borderRadius: 6, fontWeight: 600 }}>
            {t("card.fcr")}: {fcr.label}
          </span>
        </div>
        <span style={{ color: "var(--teal)", fontSize: "0.8rem", fontWeight: 500 }}>{t("view")}</span>
      </div>
    </div>
  );
}

function MetricMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
