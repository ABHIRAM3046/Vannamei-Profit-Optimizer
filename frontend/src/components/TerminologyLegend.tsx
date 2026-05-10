"use client";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/context";

export default function TerminologyLegend() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const terms = [
    { key: "DOC", desc: t("term.doc") },
    { key: "PLs", desc: t("term.pls") },
    { key: "FCR", desc: t("term.fcr") },
    { key: "ABW", desc: t("term.abw") },
    { key: "ADG", desc: t("term.adg") },
    { key: "Biomass", desc: t("term.biomass") },
    { key: "DO", desc: t("term.do") },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="sidebar-link"
        style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", font: "inherit", marginTop: "0.5rem" }}
      >
        <span>📖</span> {t("term.title")}
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setIsOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
          <div className="glass-card animate-fade-in" style={{ position: "relative", padding: "2rem", maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>📖 {t("term.title")}</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {terms.map(term => {
                const [title, desc] = term.desc.split(":");
                return (
                  <div key={term.key} style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 700, color: "var(--teal)", marginBottom: "0.25rem" }}>{term.key} <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem" }}>— {title}</span></div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>{desc ? desc.trim() : term.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
