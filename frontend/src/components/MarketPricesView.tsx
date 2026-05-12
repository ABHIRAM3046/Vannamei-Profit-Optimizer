"use client";
import { useState, useEffect } from "react";
import { pricesAPI, type MarketPrice } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function MarketPricesView() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [countInput, setCountInput] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const data = await pricesAPI.list();
      setPrices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      await pricesAPI.scrape();
      await fetchPrices();
    } catch (err) {
      console.error("Failed to scrape prices", err);
    } finally {
      setScraping(false);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countInput || !priceInput) return;
    
    try {
      await pricesAPI.create({
        count_per_kg: parseInt(countInput),
        price_per_kg: parseFloat(priceInput)
      });
      setCountInput("");
      setPriceInput("");
      fetchPrices();
    } catch (err) {
      console.error("Failed to add price", err);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  const standardCounts = [25, 30, 40, 50, 60, 70, 80, 90, 100];
  const fullPrices = standardCounts.map(count => {
    const existing = prices.find(p => p.count_per_kg === count);
    return {
      count,
      price: existing ? existing.price_per_kg : null
    };
  });
  
  const chartData = fullPrices.filter(p => p.price !== null);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>📈 {t("market.prices") || "Market Prices"}</h1>
        <button 
          onClick={handleScrape} 
          disabled={scraping} 
          className="btn" 
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        >
          {scraping ? "Scraping..." : "🔄 Scrape AB Gains"}
        </button>
      </div>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        {t("market.desc") || "Manage expected market prices by shrimp count. These prices will automatically sync with your Harvest Planner."}
      </p>

      {chartData.length > 0 && (
        <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem", height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="count" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} />
              <Tooltip 
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--teal)", fontWeight: "bold" }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              <Line type="monotone" dataKey="price" stroke="var(--teal)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <form onSubmit={handleAddPrice} className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
        <div>
          <label className="form-label">{t("market.count") || "Count / Kg"}</label>
          <input className="form-input" type="number" required placeholder="e.g. 40" value={countInput} onChange={e => setCountInput(e.target.value)} />
        </div>
        <div>
          <label className="form-label">{t("market.price") || "Price / Kg"}</label>
          <input className="form-input" type="number" step="any" required placeholder="e.g. 350" value={priceInput} onChange={e => setPriceInput(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{t("market.count") || "Count"}</th>
              <th style={{ padding: "0.5rem", color: "var(--text-muted)", textAlign: "right" }}>{t("market.price") || "Price (₹)"}</th>
            </tr>
          </thead>
          <tbody>
            {fullPrices.map(p => (
              <tr key={p.count} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "1rem 0.5rem", fontWeight: 600 }}>{p.count}</td>
                <td style={{ padding: "1rem 0.5rem", color: p.price ? "var(--teal)" : "var(--text-muted)", textAlign: "right" }}>
                  {p.price ? `₹${p.price}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
