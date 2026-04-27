import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Loader2,
  Home,
  Eye,
  EyeOff,
  Building2,
  TrendingUp,
  KeyRound,
  ArrowLeftRight,
  BedDouble,
  Bath,
  Maximize,
  X,
  Users,
  ChevronLeft,
  Menu,
  Sparkles,
  Activity,
  MapPin,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/formatPrice";
import { useAuth } from "@/hooks/useAuth";
import PropertyForm from "@/components/admin/PropertyForm";
import ContactsView from "@/components/admin/ContactsView";
import ConversationsView from "@/components/admin/ConversationsView";
import type { Propiedad } from "@/types";

type AdminView = "propiedades" | "contactos" | "conversaciones";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [activeView, setActiveView] = useState<AdminView>("propiedades");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Propiedad | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("propiedades")
      .select("*")
      .order("id", { ascending: false });
    setProperties((data as Propiedad[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchProperties();
  }, [user, fetchProperties]);

  const handleCreate = async (formData: Omit<Propiedad, "id" | "fecha_publicacion">) => {
    setSaving(true);
    const { error } = await supabase.from("propiedades").insert(formData);
    if (error) {
      alert("Error al crear: " + error.message);
    } else {
      setShowForm(false);
      await fetchProperties();
    }
    setSaving(false);
  };

  const handleUpdate = async (formData: Omit<Propiedad, "id" | "fecha_publicacion">) => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("propiedades")
      .update(formData)
      .eq("id", editing.id);
    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setEditing(null);
      setShowForm(false);
      await fetchProperties();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("propiedades").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      setDeletingId(null);
      await fetchProperties();
    }
  };

  const handleToggleDisponible = async (prop: Propiedad) => {
    await supabase
      .from("propiedades")
      .update({ disponible: !prop.disponible })
      .eq("id", prop.id);
    await fetchProperties();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const switchView = (view: AdminView) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (!user) return null;

  // Stats
  const totalProps = properties.length;
  const disponibles = properties.filter((p) => p.disponible).length;
  const noDisponibles = totalProps - disponibles;
  const ventaCount = properties.filter((p) => p.tipo_oferta?.toUpperCase() === "VENTA").length;
  const rentaCount = properties.filter((p) => p.tipo_oferta?.toUpperCase() === "RENTA").length;
  const rentaVentaCount = properties.filter((p) => p.tipo_oferta?.toUpperCase() === "RENTA Y VENTA").length;

  // Richer analytics
  const pct = (n: number) => (totalProps > 0 ? Math.round((n / totalProps) * 100) : 0);
  const disponiblePct = pct(disponibles);

  // Distribution by type
  const tipoDist = [
    { key: "casa",         label: "Casas",          count: properties.filter((p) => p.tipo === "casa").length,         color: "bg-cobalt",       icon: Home },
    { key: "departamento", label: "Departamentos",  count: properties.filter((p) => p.tipo === "departamento").length, color: "bg-purple-500",   icon: Building2 },
    { key: "terreno",      label: "Terrenos",       count: properties.filter((p) => p.tipo === "terreno").length,      color: "bg-emerald-500",  icon: MapPin },
    { key: "local",        label: "Locales",        count: properties.filter((p) => p.tipo === "local").length,        color: "bg-orange-500",   icon: Activity },
  ];

  // Top zones
  const zonaMap = new Map<string, number>();
  properties.forEach((p) => {
    if (p.zona) zonaMap.set(p.zona, (zonaMap.get(p.zona) || 0) + 1);
  });
  const topZonas = Array.from(zonaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Average price of available
  const precios = properties.filter((p) => p.disponible && p.precio > 0).map((p) => p.precio);
  const precioPromedio = precios.length > 0 ? Math.round(precios.reduce((a, b) => a + b, 0) / precios.length) : 0;
  const precioPromedioFmt = precioPromedio > 0 ? `$${precioPromedio.toLocaleString("es-MX")}` : "—";

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[hsl(220,20%,95%)] flex">
      {/* ─── Sidebar ─── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-60 bg-cobalt flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none" className="text-white flex-shrink-0">
            <rect x="4" y="8" width="12" height="20" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="20" y="4" width="12" height="24" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="10" y1="14" x2="10" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="10" x2="26" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-heading text-xs font-bold tracking-widest text-white/80 uppercase">LUCE Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 text-white/50 hover:text-white">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Propiedades */}
          <div>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] px-2 mb-2">
              Propiedades
            </p>
            <button
              onClick={() => switchView("propiedades")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeView === "propiedades"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Building2 size={15} />
              Gestión de Propiedades
            </button>
          </div>

          {/* CRM */}
          <div>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] px-2 mb-2">
              CRM
            </p>
            <button
              onClick={() => switchView("contactos")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeView === "contactos"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Users size={15} />
              Contactos
            </button>
            <button
              onClick={() => switchView("conversaciones")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 mt-1 ${
                activeView === "conversaciones"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <MessageCircle size={15} />
              Conversaciones
            </button>
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 px-4 py-4 space-y-2">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <Home size={13} /> Ver sitio web
          </a>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25 truncate max-w-[120px]">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[10px] font-medium text-white/40 hover:text-red-300 transition-colors"
            >
              <LogOut size={11} /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-cobalt flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-white/70 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="font-heading text-xs font-bold tracking-widest text-white/80 uppercase">LUCE Admin</span>
          <div className="w-8" />
        </header>

        <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">

          {/* ──────── PROPIEDADES VIEW ──────── */}
          {activeView === "propiedades" && (
            <>
              {/* ─ Welcome header ─ */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cobalt via-cobalt to-[hsl(220,70%,25%)] text-white px-6 py-7 mb-6 shadow-[0_20px_50px_-20px_rgba(28,55,140,0.5)]">
                {/* Decorative blobs */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gold uppercase tracking-[0.2em] mb-1">
                      <Sparkles size={12} /> Panel de control
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">{greeting}, Admin</h1>
                    <p className="text-xs text-white/70 mt-1 capitalize flex items-center gap-1.5">
                      <Calendar size={11} /> {fechaHoy}
                    </p>
                  </div>
                  {!showForm && (
                    <button
                      onClick={() => { setEditing(null); setShowForm(true); }}
                      className="group flex items-center gap-2 bg-white text-cobalt font-bold text-xs px-5 py-3 rounded-xl hover:bg-gold hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" /> Nueva Propiedad
                    </button>
                  )}
                </div>
              </div>

              {/* ─ Hero KPI row ─ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                {/* Total + ring chart */}
                <div className="relative bg-gradient-to-br from-white via-white to-cobalt/[0.04] rounded-3xl p-6 shadow-[0_8px_30px_-12px_rgba(28,55,140,0.18)] hover:shadow-[0_12px_40px_-12px_rgba(28,55,140,0.28)] border border-cobalt/10 overflow-hidden transition-all duration-300">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-cobalt/15 to-transparent rounded-full blur-2xl" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cobalt to-cobalt/40" />
                  <div className="relative flex items-center gap-5">
                    {/* Ring */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                        <defs>
                          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="hsl(220 70% 50%)" />
                            <stop offset="100%" stopColor="hsl(220 70% 35%)" />
                          </linearGradient>
                        </defs>
                        <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(220 20% 93%)" strokeWidth="3.5" />
                        <circle
                          cx="20" cy="20" r="16" fill="none"
                          stroke="url(#ringGrad)" strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={`${(disponiblePct / 100) * 100.53} 100.53`}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-heading text-lg font-bold text-cobalt tabular-nums leading-none">{disponiblePct}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">activo</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-cobalt/70 uppercase tracking-[0.18em]">Portafolio</p>
                      <p className="font-heading text-4xl font-bold text-foreground tabular-nums mt-1 leading-none">{totalProps}</p>
                      <div className="flex items-center gap-3 mt-2.5 text-[11px]">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {disponibles} activas
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> {noDisponibles} ocultas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average price */}
                <div className="relative bg-gradient-to-br from-white via-white to-amber-50/40 rounded-3xl p-6 shadow-[0_8px_30px_-12px_rgba(202,138,4,0.18)] hover:shadow-[0_12px_40px_-12px_rgba(202,138,4,0.3)] border border-amber-200/40 overflow-hidden transition-all duration-300">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-gold/20 to-transparent rounded-full blur-2xl" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold to-amber-300" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-[0.18em]">Precio promedio</p>
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-[0_6px_18px_-4px_rgba(202,138,4,0.5)]">
                        <TrendingUp size={18} className="text-white" />
                      </div>
                    </div>
                    <p className="font-heading text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                      {precioPromedioFmt}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-2.5 font-medium">
                      Basado en <span className="font-bold text-foreground/80">{precios.length}</span> propiedad{precios.length !== 1 ? "es" : ""} disponible{precios.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Oferta breakdown */}
                <div className="relative bg-gradient-to-br from-white via-white to-purple-50/30 rounded-3xl p-6 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] hover:shadow-[0_12px_40px_-12px_rgba(124,58,237,0.28)] border border-purple-200/40 overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold via-purple-400 to-cyan-400" />
                  <p className="text-[10px] font-bold text-purple-700/80 uppercase tracking-[0.18em] mb-3.5">Tipo de oferta</p>
                  <div className="space-y-3">
                    {[
                      { label: "Venta",         count: ventaCount,      color: "bg-gold",       gradient: "from-gold to-amber-500",       icon: TrendingUp    },
                      { label: "Renta",         count: rentaCount,      color: "bg-purple-500", gradient: "from-purple-500 to-purple-600",icon: KeyRound      },
                      { label: "Renta y Venta", count: rentaVentaCount, color: "bg-cyan-500",   gradient: "from-cyan-500 to-teal-500",    icon: ArrowLeftRight},
                    ].map((o) => {
                      const percent = pct(o.count);
                      const Icon = o.icon;
                      return (
                        <div key={o.label} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${o.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="text-[12px] font-semibold text-foreground/85">{o.label}</span>
                              <span className="font-heading text-base font-bold tabular-nums text-foreground">{o.count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted/70 overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${o.gradient} rounded-full transition-all duration-700`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─ Secondary row: Distribution + Top zones ─ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Type distribution */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_-15px_rgba(15,23,42,0.15)] hover:shadow-[0_12px_40px_-15px_rgba(15,23,42,0.2)] border border-border/40 lg:col-span-2 transition-all duration-300">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Distribución por tipo</p>
                      <p className="font-heading text-base font-bold text-foreground mt-1">Inventario actual</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cobalt/10 to-cobalt/5 flex items-center justify-center border border-cobalt/10">
                      <Activity size={16} className="text-cobalt" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tipoDist.map((t) => {
                      const Icon = t.icon;
                      const percent = pct(t.count);
                      // soft tint per type
                      const tints: Record<string, string> = {
                        casa:         "from-blue-50/80 to-white border-blue-200/50",
                        departamento: "from-purple-50/80 to-white border-purple-200/50",
                        terreno:      "from-emerald-50/80 to-white border-emerald-200/50",
                        local:        "from-orange-50/80 to-white border-orange-200/50",
                      };
                      return (
                        <div
                          key={t.key}
                          className={`relative rounded-2xl border bg-gradient-to-br ${tints[t.key] || "from-muted/40 to-white border-border/50"} p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-7 h-7 rounded-lg ${t.color} flex items-center justify-center shadow-sm`}>
                              <Icon size={13} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.label}</span>
                          </div>
                          <p className="font-heading text-2xl font-bold text-foreground tabular-nums leading-none">{t.count}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-medium">{percent}% del total</p>
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/[0.04] overflow-hidden">
                            <div className={`h-full ${t.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top zones */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_-15px_rgba(15,23,42,0.15)] hover:shadow-[0_12px_40px_-15px_rgba(15,23,42,0.2)] border border-border/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Zonas</p>
                      <p className="font-heading text-base font-bold text-foreground mt-1">Top ubicaciones</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center border border-gold/20">
                      <MapPin size={16} className="text-gold" />
                    </div>
                  </div>
                  {topZonas.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 py-6 text-center">Sin datos aún</p>
                  ) : (
                    <div className="space-y-3">
                      {topZonas.map(([zona, count], idx) => {
                        const percent = pct(count);
                        const isTop = idx === 0;
                        return (
                          <div key={zona} className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm ${
                              isTop
                                ? "bg-gradient-to-br from-gold to-amber-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-[12px] font-semibold text-foreground truncate capitalize">{zona}</span>
                                <span className="font-heading text-sm font-bold tabular-nums text-foreground">{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted/70 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${
                                  isTop ? "bg-gradient-to-r from-gold to-amber-500" : "bg-cobalt"
                                }`} style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Header + section label */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 bg-cobalt rounded-full" />
                  <h2 className="font-heading text-lg font-bold text-foreground">Propiedades</h2>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalProps}
                  </span>
                </div>
              </div>

              {/* Form */}
              {showForm && (
                <div className="bg-white rounded-3xl shadow-[0_12px_40px_-15px_rgba(15,23,42,0.18)] p-6 md:p-8 mb-8 border border-border/40 relative">
                  <button
                    onClick={() => { setShowForm(false); setEditing(null); }}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cobalt/15 to-cobalt/5 flex items-center justify-center border border-cobalt/15 shadow-sm">
                      {editing ? <Pencil size={17} className="text-cobalt" /> : <Plus size={17} className="text-cobalt" />}
                    </div>
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        {editing ? "Editar Propiedad" : "Nueva Propiedad"}
                      </h2>
                      {editing && <p className="text-xs text-muted-foreground capitalize mt-0.5">{editing.nombre}</p>}
                    </div>
                  </div>
                  <PropertyForm
                    initial={editing}
                    onSubmit={editing ? handleUpdate : handleCreate}
                    onCancel={() => { setShowForm(false); setEditing(null); }}
                    loading={saving}
                  />
                </div>
              )}

              {/* Property Cards Grid */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-cobalt" />
                </div>
              ) : properties.length === 0 ? (
                <div className="bg-gradient-to-br from-white to-muted/30 rounded-3xl shadow-[0_8px_30px_-15px_rgba(15,23,42,0.12)] border border-border/40 py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-cobalt/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 size={28} className="text-cobalt/60" />
                  </div>
                  <p className="text-base font-bold text-foreground">No hay propiedades aún</p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5">Crea tu primera propiedad para empezar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {properties.map((prop) => {
                    const portada = prop.galeria?.find((f) => f.categoria === "portada")?.url || prop.galeria?.[0]?.url || null;
                    const isDeleting = deletingId === prop.id;

                    return (
                      <div
                        key={prop.id}
                        className="bg-white rounded-3xl shadow-[0_6px_24px_-12px_rgba(15,23,42,0.15)] border border-border/40 overflow-hidden group hover:shadow-[0_16px_40px_-15px_rgba(28,55,140,0.25)] hover:-translate-y-1 hover:border-cobalt/20 transition-all duration-300"
                      >
                        <div className="relative h-44 bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
                          {portada ? (
                            <img src={portada} alt={prop.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <Building2 size={40} />
                            </div>
                          )}
                          {/* gradient overlay for legibility of badges */}
                          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

                          <div className="absolute top-3 left-3 flex gap-1.5">
                            <span className="bg-cobalt/95 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full capitalize shadow-md">{prop.tipo}</span>
                            {prop.tipo_oferta && (
                              <span className="bg-gold/95 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">{prop.tipo_oferta}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleDisponible(prop)}
                            className="absolute top-3 right-3 backdrop-blur-sm rounded-full p-2 transition-all hover:scale-110 shadow-md"
                            style={{ background: prop.disponible ? "rgba(16,185,129,0.95)" : "rgba(0,0,0,0.6)" }}
                            title={prop.disponible ? "Disponible — click para ocultar" : "No disponible — click para mostrar"}
                          >
                            {prop.disponible ? <Eye size={13} className="text-white" /> : <EyeOff size={13} className="text-white/80" />}
                          </button>
                          {prop.galeria && prop.galeria.length > 1 && (
                            <span className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                              {prop.galeria.length} fotos
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-heading text-base font-bold text-foreground capitalize line-clamp-1 mb-1.5">{prop.nombre}</h3>
                          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                            <MapPin size={11} className="text-cobalt/70" /> {prop.zona}
                          </p>
                          <div className="flex items-center gap-2 mb-4">
                            {prop.recamaras > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground/70 bg-muted/60 px-2.5 py-1 rounded-full">
                                <BedDouble size={11} className="text-cobalt" /> {prop.recamaras}
                              </span>
                            )}
                            {prop.banos > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground/70 bg-muted/60 px-2.5 py-1 rounded-full">
                                <Bath size={11} className="text-cobalt" /> {prop.banos}
                              </span>
                            )}
                            {prop.metros_cuadrados > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground/70 bg-muted/60 px-2.5 py-1 rounded-full">
                                <Maximize size={11} className="text-cobalt" /> {prop.metros_cuadrados}m²
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <span className="font-heading text-lg font-bold bg-gradient-to-r from-cobalt to-cobalt-light bg-clip-text text-transparent tabular-nums">{formatPrice(prop.precio)}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditing(prop); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                className="p-2 rounded-xl hover:bg-cobalt/10 transition-colors" title="Editar"
                              >
                                <Pencil size={14} className="text-cobalt" />
                              </button>
                              {isDeleting ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <button onClick={() => handleDelete(prop.id)} className="text-[10px] font-bold text-white bg-destructive rounded-lg px-2.5 py-1.5 hover:bg-destructive/80 transition-colors shadow-sm">Eliminar</button>
                                  <button onClick={() => setDeletingId(null)} className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1.5">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeletingId(prop.id)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors" title="Eliminar">
                                  <Trash2 size={14} className="text-destructive/70" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ──────── CONTACTOS VIEW ──────── */}
          {activeView === "contactos" && (
            <ContactsView
              onOpenProperty={(prop) => {
                const full = properties.find((p) => p.id === prop.id);
                if (full) {
                  setEditing(full);
                  setShowForm(true);
                  setActiveView("propiedades");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  setActiveView("propiedades");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            />
          )}

          {/* ──────── CONVERSACIONES VIEW ──────── */}
          {activeView === "conversaciones" && <ConversationsView />}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
