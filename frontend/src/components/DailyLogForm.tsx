"use client";
import { useState } from "react";
import { dailyLogsAPI } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

interface Props { pondId: string; pondName: string; onBack: () => void; onSuccess: () => void; }

export default function DailyLogForm({ pondId, pondName, onBack, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    feed_given_kg: "", avg_body_weight_g: "", mortality_count: "0",
    dissolved_oxygen: "", ph: "", ammonia: "", temperature_c: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await dailyLogsAPI.create(pondId, {
        log_date: form.log_date,
        feed_given_kg: parseFloat(form.feed_given_kg) || 0,
        avg_body_weight_g: form.avg_body_weight_g ? parseFloat(form.avg_body_weight_g) : undefined,
        mortality_count: parseInt(form.mortality_count) || 0,
        dissolved_oxygen: form.dissolved_oxygen ? parseFloat(form.dissolved_oxygen) : undefined,
        ph: form.ph ? parseFloat(form.ph) : undefined,
        ammonia: form.ammonia ? parseFloat(form.ammonia) : undefined,
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : undefined,
        notes: form.notes || undefined,
      });
      setSuccess(true);
      setTimeout(onSuccess, 1000);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <div className="animate-fade-in" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t("log.success")}</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>{t("log.redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>
        {t("log.back", { name: pondName })}
      </button>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{t("log.title")}</h1>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: "1.5rem", maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={t("log.date")} type="date" value={form.log_date} onChange={v => update("log_date", v)} required />
          <Field label={t("log.feedGiven")} type="number" value={form.feed_given_kg} onChange={v => update("feed_given_kg", v)} placeholder="25.5" required />
          <Field label={t("log.abw")} type="number" value={form.avg_body_weight_g} onChange={v => update("avg_body_weight_g", v)} placeholder="15.0" />
          <Field label={t("log.mortality")} type="number" value={form.mortality_count} onChange={v => update("mortality_count", v)} placeholder="0" />
        </div>

        <div style={{ margin: "1.25rem 0 0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          {t("log.waterParams")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={t("log.do")} type="number" value={form.dissolved_oxygen} onChange={v => update("dissolved_oxygen", v)} placeholder="6.5" />
          <Field label={t("log.ph")} type="number" value={form.ph} onChange={v => update("ph", v)} placeholder="8.0" />
          <Field label={t("log.ammonia")} type="number" value={form.ammonia} onChange={v => update("ammonia", v)} placeholder="0.03" />
          <Field label={t("log.temp")} type="number" value={form.temperature_c} onChange={v => update("temperature_c", v)} placeholder="29.5" />
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label className="form-label">{t("log.notes")}</label>
          <textarea className="form-input" rows={2} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Any observations..." />
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginTop: "0.75rem" }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "1.25rem", padding: "0.75rem" }}>
          {loading ? t("log.saving") : t("log.saveLog")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, required }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} step={type === "number" ? "any" : undefined} />
    </div>
  );
}
