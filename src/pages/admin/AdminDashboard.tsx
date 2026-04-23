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
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cobalt via-cobalt to-[hsl(220,70%,25%)] text-white px-6 py-6 mb-6 shadow-lg">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Total + ring chart */}
                <div className="relative bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cobalt/5 to-transparent rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-4">
                    {/* Ring */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(220 20% 92%)" strokeWidth="4" />
                        <circle
                          cx="20" cy="20" r="16" fill="none"
                          stroke="hsl(220 70% 45%)" strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${(disponiblePct / 100) * 100.53} 100.53`}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-heading text-base font-bold text-foreground tabular-nums leading-none">{disponiblePct}%</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">activo</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Portafolio</p>
                      <p className="font-heading text-3xl font-bold text-foreground tabular-nums mt-0.5">{totalProps}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {disponibles} activas
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> {noDisponibles} ocultas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average price */}
                <div className="relative bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gold/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Precio promedio</p>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-sm">
                        <TrendingUp size={16} className="text-white" />
                      </div>
                    </div>
                    <p className="font-heading text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-tight">
                      {precioPromedioFmt}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5">
                      Basado en {precios.length} propiedad{precios.length !== 1 ? "es" : ""} disponible{precios.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Oferta breakdown */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04]">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">Tipo de oferta</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Venta",         count: ventaCount,      color: "bg-gold",       icon: TrendingUp    },
                      { label: "Renta",         count: rentaCount,      color: "bg-purple-500", icon: KeyRound      },
                      { label: "Renta y Venta", count: rentaVentaCount, color: "bg-cyan-500",   icon: ArrowLeftRight},
                    ].map((o) => {
                      const percent = pct(o.count);
                      const Icon = o.icon;
                      return (
                        <div key={o.label} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg ${o.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <Icon size={13} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-0.5">
                              <span className="text-[11px] font-semibold text-foreground/80">{o.label}</span>
                              <span className="font-heading text-sm font-bold tabular-nums text-foreground">{o.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${o.color} rounded-full transition-all duration-700`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─ Secondary row: Distribution + Top zones ─ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                {/* Type distribution */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Distribución por tipo</p>
                      <p className="font-heading text-sm font-bold text-foreground mt-0.5">Inventario actual</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Activity size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tipoDist.map((t) => {
                      const Icon = t.icon;
                      const percent = pct(t.count);
                      return (
                        <div key={t.key} className="relative rounded-xl border border-border/50 p-3 hover:border-border hover:shadow-sm transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-md ${t.color} flex items-center justify-center`}>
                              <Icon size={11} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.label}</span>
                          </div>
                          <p className="font-heading text-xl font-bold text-foreground tabular-nums leading-none">{t.count}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{percent}% del total</p>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-xl overflow-hidden">
                            <div className={`h-full ${t.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top zones */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Zonas</p>
                      <p className="font-heading text-sm font-bold text-foreground mt-0.5">Top ubicaciones</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                  {topZonas.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 py-6 text-center">Sin datos aún</p>
                  ) : (
                    <div className="space-y-2.5">
                      {topZonas.map(([zona, count], idx) => {
                        const percent = pct(count);
                        return (
                          <div key={zona} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              idx === 0 ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-[11px] font-semibold text-foreground truncate capitalize">{zona}</span>
                                <span className="font-heading text-xs font-bold tabular-nums text-foreground/80">{count}</span>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-cobalt rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
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
                <div className="bg-white rounded-xl shadow-sm p-5 md:p-7 mb-8 border border-black/[0.04] relative">
                  <button
                    onClick={() => { setShowForm(false); setEditing(null); }}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-cobalt/10 flex items-center justify-center">
                      {editing ? <Pencil size={16} className="text-cobalt" /> : <Plus size={16} className="text-cobalt" />}
                    </div>
                    <div>
                      <h2 className="font-heading text-base font-bold text-foreground">
                        {editing ? "Editar Propiedad" : "Nueva Propiedad"}
                      </h2>
                      {editing && <p className="text-xs text-muted-foreground capitalize">{editing.nombre}</p>}
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
                <div className="bg-white rounded-xl shadow-sm border border-black/[0.04] py-16 text-center">
                  <Building2 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No hay propiedades aún</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Crea tu primera propiedad para empezar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {properties.map((prop) => {
                    const portada = prop.galeria?.find((f) => f.categoria === "portada")?.url || prop.galeria?.[0]?.url || null;
                    const isDeleting = deletingId === prop.id;

                    return (
                      <div key={prop.id} className="bg-white rounded-xl shadow-sm border border-black/[0.04] overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="relative h-40 bg-muted overflow-hidden">
                          {portada ? (
                            <img src={portada} alt={prop.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <Building2 size={36} />
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                            <span className="bg-cobalt/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded capitalize">{prop.tipo}</span>
                            {prop.tipo_oferta && (
                              <span className="bg-gold/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">{prop.tipo_oferta}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleDisponible(prop)}
                            className="absolute top-2.5 right-2.5 backdrop-blur-sm rounded-full p-1.5 transition-colors"
                            style={{ background: prop.disponible ? "rgba(16,185,129,0.85)" : "rgba(0,0,0,0.5)" }}
                            title={prop.disponible ? "Disponible — click para ocultar" : "No disponible — click para mostrar"}
                          >
                            {prop.disponible ? <Eye size={13} className="text-white" /> : <EyeOff size={13} className="text-white/80" />}
                          </button>
                          {prop.galeria && prop.galeria.length > 1 && (
                            <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              {prop.galeria.length} fotos
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-heading text-sm font-bold text-foreground capitalize line-clamp-1 mb-1">{prop.nombre}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{prop.zona}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                            {prop.recamaras > 0 && <span className="flex items-center gap-1"><BedDouble size={12} /> {prop.recamaras}</span>}
                            {prop.banos > 0 && <span className="flex items-center gap-1"><Bath size={12} /> {prop.banos}</span>}
                            {prop.metros_cuadrados > 0 && <span className="flex items-center gap-1"><Maximize size={12} /> {prop.metros_cuadrados}m²</span>}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-border/60">
                            <span className="font-heading text-sm font-bold text-cobalt">{formatPrice(prop.precio)}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditing(prop); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                className="p-2 rounded-lg hover:bg-cobalt/10 transition-colors" title="Editar"
                              >
                                <Pencil size={14} className="text-cobalt" />
                              </button>
                              {isDeleting ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <button onClick={() => handleDelete(prop.id)} className="text-[10px] font-bold text-white bg-destructive rounded px-2 py-1 hover:bg-destructive/80 transition-colors">Eliminar</button>
                                  <button onClick={() => setDeletingId(null)} className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-1">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeletingId(prop.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Eliminar">
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
