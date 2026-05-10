"use client";
import { type Pond } from "@/lib/api";
import { useTranslation, type Language } from "@/lib/i18n/context";
import TerminologyLegend from "./TerminologyLegend";

type View = "dashboard" | "pond-detail" | "daily-entry" | "harvest" | "alerts" | "create-pond" | "market-prices";

interface Props {
  ponds: Pond[];
  currentView: View;
  selectedPondId: string | null;
  alertCount: number;
  isOpen: boolean;
  onNavigate: (view: View, pondId?: string) => void;
  onClose: () => void;
}

export default function Sidebar({ ponds, currentView, selectedPondId, alertCount, isOpen, onNavigate, onClose }: Props) {
  const { t, lang, setLang, languages } = useTranslation();

  return (
    <nav className={`sidebar ${isOpen ? "open" : ""}`}>
      <div style={{ padding: "1.5rem 1.25rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🦐</span>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, background: "linear-gradient(135deg, #00d4aa, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Vannamei
            </h2>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Profit Optimizer</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0.5rem 0" }}>
        <div style={{ padding: "0 1rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{t("sidebar.main")}</span>
        </div>

        <button className={`sidebar-link ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")} style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
          <span>📊</span> {t("dashboard")}
        </button>

        <button className={`sidebar-link ${currentView === "market-prices" ? "active" : ""}`}
          onClick={() => onNavigate("market-prices")} style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
          <span>📈</span> {t("market.prices") || "Market Prices"}
        </button>

        <button className={`sidebar-link ${currentView === "alerts" ? "active" : ""}`}
          onClick={() => onNavigate("alerts")} style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
          <span>🔔</span> {t("sidebar.alerts")}
          {alertCount > 0 && (
            <span style={{ marginLeft: "auto", background: "var(--red)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 20, minWidth: 20, textAlign: "center" }}>
              {alertCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: "0.75rem 0" }}>
        <div style={{ padding: "0 1rem", marginBottom: "0.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{t("sidebar.ponds")}</span>
          <button onClick={() => onNavigate("create-pond")}
            style={{ background: "none", border: "none", color: "var(--teal)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>+</button>
        </div>

        {ponds.map(pond => {
          const isSelected = currentView === "pond-detail" && selectedPondId === pond.id;
          const fcr = pond.latest_metrics?.fcr;
          const fcrColor = !fcr ? "var(--text-muted)" : fcr <= 1.3 ? "var(--fcr-excellent)" : fcr <= 1.6 ? "var(--fcr-good)" : fcr <= 1.8 ? "var(--fcr-concerning)" : "var(--fcr-critical)";

          return (
            <button key={pond.id} className={`sidebar-link ${isSelected ? "active" : ""}`}
              onClick={() => onNavigate("pond-detail", pond.id)}
              style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: fcrColor, flexShrink: 0 }} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pond.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{t("sidebar.doc")} {pond.doc || 0}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: "1rem", left: 0, right: 0, padding: "0 1rem" }}>
        <div style={{ marginBottom: "0.75rem", padding: "0" }}>
          <TerminologyLegend />
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as Language)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", fontSize: "0.85rem", outline: "none" }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => { localStorage.removeItem("userId"); window.location.reload(); }}
          style={{ width: "100%", background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "0.5rem", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>
          {t("sidebar.logout")}
        </button>
      </div>
    </nav>
  );
}
