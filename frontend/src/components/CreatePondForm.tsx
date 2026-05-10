"use client";
import { useState } from "react";
import { pondsAPI } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

interface Props { userId: string; onBack: () => void; onSuccess: () => void; }

export default function CreatePondForm({ userId, onBack, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "", area_acres: "", stocking_date: new Date().toISOString().split("T")[0],
    pl_stocked: "", salinity_ppt: "15", feed_type: "Standard Pellet",
    feed_cost_per_kg: "65", selling_price_per_kg: "350",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await pondsAPI.create(userId, {
        name: form.name,
        area_m2: parseFloat(form.area_acres) * 4046.86,
        stocking_date: form.stocking_date,
        pl_stocked: parseInt(form.pl_stocked),
        salinity_ppt: parseFloat(form.salinity_ppt),
        feed_type: form.feed_type,
        feed_cost_per_kg: parseFloat(form.feed_cost_per_kg),
        selling_price_per_kg: parseFloat(form.selling_price_per_kg),
      });
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>{t("back")}</button>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{t("create.title")}</h1>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: "1.5rem", maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">{t("create.name")}</label>
            <input className="form-input" value={form.name} onChange={e => update("name", e.target.value)} placeholder="Pond A1" required />
          </div>
          <div>
            <label className="form-label">{t("create.area")}</label>
            <input className="form-input" type="number" step="any" value={form.area_acres} onChange={e => update("area_acres", e.target.value)} placeholder="1.5" required />
          </div>
          <div>
            <label className="form-label">{t("create.stockDate")}</label>
            <input className="form-input" type="date" value={form.stocking_date} onChange={e => update("stocking_date", e.target.value)} required />
          </div>
          <div>
            <label className="form-label">{t("create.plStocked")}</label>
            <input className="form-input" type="number" value={form.pl_stocked} onChange={e => update("pl_stocked", e.target.value)} placeholder="300000" required />
          </div>
          <div>
            <label className="form-label">{t("create.salinity")}</label>
            <input className="form-input" type="number" value={form.salinity_ppt} onChange={e => update("salinity_ppt", e.target.value)} placeholder="15" />
          </div>
          <div>
            <label className="form-label">{t("create.feedType")}</label>
            <input className="form-input" value={form.feed_type} onChange={e => update("feed_type", e.target.value)} placeholder="Standard Pellet" />
          </div>
          <div>
            <label className="form-label">{t("create.feedCost")}</label>
            <input className="form-input" type="number" value={form.feed_cost_per_kg} onChange={e => update("feed_cost_per_kg", e.target.value)} placeholder="65" required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">{t("create.sellPrice")}</label>
            <input className="form-input" type="number" value={form.selling_price_per_kg} onChange={e => update("selling_price_per_kg", e.target.value)} placeholder="350" required />
          </div>
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginTop: "0.75rem" }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "1.25rem", padding: "0.75rem" }}>
          {loading ? t("create.creating") : t("create.submit")}
        </button>
      </form>
    </div>
  );
}
