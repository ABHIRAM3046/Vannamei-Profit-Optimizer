"use client";

import { useEffect, useState } from "react";
import { pondsAPI, alertsAPI, type Pond, type Alert } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import Sidebar from "@/components/Sidebar";
import PondCard from "@/components/PondCard";
import AlertBanner from "@/components/AlertBanner";
import PondDetail from "@/components/PondDetail";
import DailyLogForm from "@/components/DailyLogForm";
import HarvestPlanner from "@/components/HarvestPlanner";
import CreatePondForm from "@/components/CreatePondForm";
import AuthScreen from "@/components/AuthScreen";
import MarketPricesView from "@/components/MarketPricesView";
import TransferWizard from "@/components/TransferWizard";

type View = "dashboard" | "pond-detail" | "daily-entry" | "harvest" | "alerts" | "create-pond" | "market-prices";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedPondId, setSelectedPondId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTransferWizard, setShowTransferWizard] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) {
      setUserId(stored);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        pondsAPI.list(userId!),
        alertsAPI.all(userId!, true),
      ]);
      setPonds(p);
      setAlerts(a);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(uid: string) {
    localStorage.setItem("userId", uid);
    setUserId(uid);
  }

  function navigateTo(view: View, pondId?: string) {
    setCurrentView(view);
    if (pondId) setSelectedPondId(pondId);
    setSidebarOpen(false);
  }

  if (!userId) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const selectedPond = ponds.find(p => p.id === selectedPondId) || null;
  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        ponds={ponds}
        currentView={currentView}
        selectedPondId={selectedPondId}
        alertCount={unreadAlerts.length}
        isOpen={sidebarOpen}
        onNavigate={navigateTo}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <div className="main-content" style={{ flex: 1 }}>
        <div style={{ display: "none" }} className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "1.5rem", cursor: "pointer" }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>🦐 Vannamei Optimizer</span>
        </div>

        <style jsx>{`
          @media (max-width: 768px) {
            .mobile-header { display: flex !important; align-items: center; gap: 1rem; padding-bottom: 1rem; }
          }
        `}</style>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <div className="spinner" />
          </div>
        ) : currentView === "dashboard" ? (
          <DashboardView
            ponds={ponds}
            alerts={unreadAlerts}
            onSelectPond={(id) => navigateTo("pond-detail", id)}
            onCreatePond={() => navigateTo("create-pond")}
            onViewAlerts={() => navigateTo("alerts")}
          />
        ) : currentView === "pond-detail" && selectedPondId ? (
          <PondDetail
            pondId={selectedPondId}
            onAddLog={() => navigateTo("daily-entry", selectedPondId)}
            onViewHarvest={() => navigateTo("harvest", selectedPondId)}
            onTransfer={() => setShowTransferWizard(true)}
            onBack={() => navigateTo("dashboard")}
          />
        ) : currentView === "daily-entry" && selectedPondId ? (
          <DailyLogForm
            pondId={selectedPondId}
            pondName={selectedPond?.name || ""}
            onBack={() => navigateTo("pond-detail", selectedPondId)}
            onSuccess={() => { loadData(); navigateTo("pond-detail", selectedPondId); }}
          />
        ) : currentView === "harvest" && selectedPondId ? (
          <HarvestPlanner
            pondId={selectedPondId}
            onBack={() => navigateTo("pond-detail", selectedPondId)}
          />
        ) : currentView === "alerts" ? (
          <AlertsView alerts={alerts} onMarkRead={(id) => {
            alertsAPI.markRead(id);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
          }} onBack={() => navigateTo("dashboard")} />
        ) : currentView === "create-pond" ? (
          <CreatePondForm
            userId={userId}
            onBack={() => navigateTo("dashboard")}
            onSuccess={() => { loadData(); navigateTo("dashboard"); }}
          />
        ) : currentView === "market-prices" ? (
          <MarketPricesView />
        ) : null}
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 35 }}
        />
      )}

      {showTransferWizard && selectedPond && (
        <TransferWizard
          sourcePond={selectedPond}
          allPonds={ponds}
          onSuccess={() => { setShowTransferWizard(false); loadData(); }}
          onCancel={() => setShowTransferWizard(false)}
        />
      )}
    </div>
  );
}

function DashboardView({ ponds, alerts, onSelectPond, onCreatePond, onViewAlerts }: {
  ponds: Pond[]; alerts: Alert[]; onSelectPond: (id: string) => void;
  onCreatePond: () => void; onViewAlerts: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, background: "linear-gradient(135deg, #00d4aa, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("dash.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t("dash.subtitle")}
          </p>
        </div>
        <button className="btn-primary" onClick={onCreatePond}>{t("dash.newPond")}</button>
      </div>

      {alerts.length > 0 && (
        <div onClick={onViewAlerts} style={{ cursor: "pointer", marginBottom: "1.5rem" }}>
          <AlertBanner alerts={alerts.slice(0, 3)} />
        </div>
      )}

      {ponds.length === 0 ? (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🦐</div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{t("dash.noPonds")}</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{t("dash.createFirst")}</p>
          <button className="btn-primary" onClick={onCreatePond}>{t("dash.createPond")}</button>
        </div>
      ) : (
        <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {ponds.map(pond => (
            <PondCard key={pond.id} pond={pond} onClick={() => onSelectPond(pond.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsView({ alerts, onMarkRead, onBack }: {
  alerts: Alert[]; onMarkRead: (id: string) => void; onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginBottom: "1rem", fontSize: "0.875rem" }}>
        {t("alerts.back")}
      </button>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>{t("alerts.title")}</h1>
      {alerts.length === 0 ? (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>{t("alerts.noAlerts")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-${alert.severity}`}
              style={{ padding: "1rem 1.25rem", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", opacity: alert.is_read ? 0.5 : 1 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>{alert.severity}</span>
                  {alert.pond_name && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• {alert.pond_name}</span>}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.95rem" }}>{alert.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>{alert.message}</p>
              </div>
              {!alert.is_read && (
                <button onClick={() => onMarkRead(alert.id)} className="btn-secondary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  {t("alerts.dismiss")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
