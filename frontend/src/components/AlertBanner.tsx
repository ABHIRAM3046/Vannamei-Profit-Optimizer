"use client";
import { type Alert } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation();
  if (!alerts.length) return null;
  const critical = alerts.filter(a => a.severity === "critical");
  const warnings = alerts.filter(a => a.severity === "warning");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {critical.length > 0 && (
        <div className="alert-critical" style={{ padding: "0.75rem 1rem", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{t("alerts.criticalCount", { count: critical.length })}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>— {critical[0].title}</span>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{t("view")}</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="alert-warning" style={{ padding: "0.75rem 1rem", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{t("alerts.warningCount", { count: warnings.length })}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>— {warnings[0].title}</span>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{t("view")}</span>
        </div>
      )}
    </div>
  );
}
