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
  Sun,
  Sunset,
  Moon,
  UserPlus,
  Activity,
  MapPin,
  Calendar,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Hotel,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/formatPrice";
import { useAuth } from "@/hooks/useAuth";
import PropertyForm from "@/components/admin/PropertyForm";
import ContactsView from "@/components/admin/ContactsView";
import ConversationsView from "@/components/admin/ConversationsView";
import CreateUserModal from "@/components/admin/CreateUserModal";
import MfaSetupModal from "@/components/admin/MfaSetupModal";
import ContenidoView from "@/components/admin/ContenidoView";
import type { Propiedad } from "@/types";

type AdminView = "propiedades" | "contactos" | "conversaciones" | "contenido";

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
  const [showUserForm, setShowUserForm] = useState(false);
  const [showMfa, setShowMfa] = useState(false);

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

  // Lock the page scroll while the property form modal is open.
  useEffect(() => {
    document.body.style.overflow = showForm ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  /**
   * Cierra el formulario. No cambia de vista a propósito: el formulario es un
   * modal que se sobrepone, así que al cerrarlo el usuario se queda donde
   * estaba (Contenido para Redes, Contactos o Propiedades) sin perder nada de
   * lo que tuviera en pantalla.
   */
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleCreate = async (formData: Omit<Propiedad, "id" | "fecha_publicacion">) => {
    setSaving(true);
    const { error } = await supabase.from("propiedades").insert(formData);
    if (error) {
      alert("Error al crear: " + error.message);
    } else {
      closeForm();
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
      closeForm();
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
    const next = !prop.disponible;
    // Optimistic update — flip just this card in local state. Avoids the
    // full refetch (which toggled `loading`, collapsed the grid to a
    // spinner, and snapped the scroll back to the top of the page).
    setProperties((prev) =>
      prev.map((p) => (p.id === prop.id ? { ...p, disponible: next } : p)),
    );
    const { error } = await supabase
      .from("propiedades")
      .update({ disponible: next })
      .eq("id", prop.id);
    if (error) {
      // Revert on failure so the UI stays truthful.
      setProperties((prev) =>
        prev.map((p) => (p.id === prop.id ? { ...p, disponible: prop.disponible } : p)),
      );
    }
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
    { key: "penthouse",    label: "Penthouses",     count: properties.filter((p) => p.tipo === "penthouse").length,    color: "bg-rose-500",     icon: Hotel },
    { key: "terreno",      label: "Terrenos",       count: properties.filter((p) => p.tipo === "terreno").length,      color: "bg-emerald-500",  icon: MapPin },
    { key: "local",        label: "Locales",        count: properties.filter((p) => p.tipo === "local").length,        color: "bg-orange-500",   icon: Activity },
  ];

  // Top zones (by municipio)
  const zonaMap = new Map<string, number>();
  properties.forEach((p) => {
    const m = p.municipio || p.zona;
    if (m) zonaMap.set(m, (zonaMap.get(m) || 0) + 1);
  });
  const topZonas = Array.from(zonaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Average price of available
  const precios = properties.filter((p) => p.disponible && p.precio > 0).map((p) => p.precio);
  const precioPromedio = precios.length > 0 ? Math.round(precios.reduce((a, b) => a + b, 0) / precios.length) : 0;
  const precioPromedioFmt = precioPromedio > 0 ? `$${precioPromedio.toLocaleString("es-MX")}` : "—";

  // Display name — read from the user's Supabase Auth metadata
  // (full_name / name / display_name), falling back to the email handle.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.display_name as string) ||
    (user.email ? user.email.split("@")[0] : "Admin");
  // Show only the first name in the greeting.
  const displayName = fullName.trim().split(/\s+/)[0];
  // Only an "owner" may create new users.
  const isOwner = meta.role === "owner";

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Welcome banner theme that follows the time of day:
  // día → cielo soleado · atardecer → puesta de sol · noche → cielo nocturno.
  const dayPhase: "day" | "sunset" | "night" =
    hour >= 6 && hour < 17 ? "day" : hour >= 17 && hour < 20 ? "sunset" : "night";
  const PHASE = {
    day: {
      gradient: "from-[hsl(204,74%,44%)] via-[hsl(214,66%,30%)] to-[hsl(221,70%,20%)]",
      glow: "bg-amber-300/35",
      icon: Sun,
    },
    sunset: {
      gradient: "from-[hsl(20,80%,48%)] via-[hsl(330,44%,32%)] to-[hsl(245,56%,20%)]",
      glow: "bg-orange-400/40",
      icon: Sunset,
    },
    night: {
      gradient: "from-[hsl(230,52%,17%)] via-[hsl(238,58%,11%)] to-[hsl(220,72%,7%)]",
      glow: "bg-indigo-300/20",
      icon: Moon,
    },
  }[dayPhase];
  const PhaseIcon = PHASE.icon;

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
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 flex flex-col overflow-hidden bg-gradient-to-b from-[hsl(220,52%,17%)] via-cobalt to-[hsl(220,66%,8%)] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Decorative gold glow + faint grid for depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-16 h-60 w-60 rounded-full bg-gold/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cobalt-light/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "2.5rem 2.5rem",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none" className="text-white">
              <rect x="4" y="8" width="12" height="20" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="20" y="4" width="12" height="24" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="10" y1="14" x2="10" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
              <line x1="26" y1="10" x2="26" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-heading text-sm font-bold tracking-[0.2em] text-white uppercase">LUCE</span>
          <span className="font-heading text-[10px] font-semibold tracking-[0.2em] text-gold uppercase">Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 text-white/50 hover:text-white">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="relative flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {/* Propiedades */}
          <div>
            <p className="text-[10px] font-bold text-gold/70 uppercase tracking-[0.18em] px-3 mb-2.5">
              Propiedades
            </p>
            <NavItem
              active={activeView === "propiedades"}
              icon={Building2}
              label="Gestión de Propiedades"
              onClick={() => switchView("propiedades")}
            />
          </div>

          {/* CRM */}
          <div>
            <p className="text-[10px] font-bold text-gold/70 uppercase tracking-[0.18em] px-3 mb-2.5">
              CRM
            </p>
            <div className="space-y-1.5">
              <NavItem
                active={activeView === "contactos"}
                icon={Users}
                label="Contactos"
                onClick={() => switchView("contactos")}
              />
              <NavItem
                active={activeView === "conversaciones"}
                icon={MessageCircle}
                label="Conversaciones"
                onClick={() => switchView("conversaciones")}
              />
            </div>
          </div>

          {/* Marketing */}
          <div>
            <p className="text-[10px] font-bold text-gold/70 uppercase tracking-[0.18em] px-3 mb-2.5">
              Marketing
            </p>
            <NavItem
              active={activeView === "contenido"}
              icon={Sparkles}
              label="Contenido para Redes"
              onClick={() => switchView("contenido")}
            />
          </div>
        </nav>

        {/* Bottom */}
        <div className="relative border-t border-white/10 px-4 py-4 space-y-2.5">
          {isOwner && (
            <button
              onClick={() => setShowUserForm(true)}
              className="group w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white/70 hover:text-white transition-all duration-200"
            >
              <UserPlus size={15} className="text-gold/80 group-hover:text-gold transition-colors" />
              Crear nuevo usuario
            </button>
          )}
          <button
            onClick={() => setShowMfa(true)}
            className="group w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white/70 hover:text-white transition-all duration-200"
          >
            <ShieldCheck size={15} className="text-gold/80 group-hover:text-gold transition-colors" />
            Seguridad (2FA)
          </button>
          <span className="block px-1 text-[10px] text-white/30 truncate">{user.email}</span>
          <div className="flex items-stretch gap-2">
            <a
              href="/"
              target="_blank"
              className="group flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white/65 hover:text-white transition-all duration-200"
            >
              <Home size={15} className="text-gold/80 group-hover:text-gold transition-colors" />
              Ver sitio web
            </a>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-semibold text-red-300 hover:text-red-200 transition-all duration-200"
            >
              <LogOut size={15} /> Salir
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
              {/* ─ Welcome header — background follows the time of day ─ */}
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${PHASE.gradient} text-white px-6 py-7 mb-6 shadow-[0_20px_50px_-20px_rgba(28,55,140,0.5)]`}>
                {/* Sun / sunset / moon glow */}
                <div className={`absolute -top-16 -right-12 w-60 h-60 rounded-full ${PHASE.glow} blur-3xl pointer-events-none`} />
                <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                {/* Night sky — scattered stars */}
                {dayPhase === "night" && (
                  <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                    {[
                      [12, 22], [28, 55], [44, 30], [62, 68], [74, 18],
                      [86, 48], [55, 14], [38, 78], [92, 80], [20, 84],
                    ].map(([x, y], i) => (
                      <span
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: i % 3 === 0 ? 3 : 2,
                          height: i % 3 === 0 ? 3 : 2,
                          opacity: i % 2 === 0 ? 0.8 : 0.45,
                        }}
                      />
                    ))}
                  </div>
                )}
                {/* Phase icon — large, faint, in the corner */}
                <PhaseIcon
                  size={120}
                  strokeWidth={1.1}
                  className="absolute -top-6 right-6 text-white/10 pointer-events-none"
                />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">{greeting}, {displayName}</h1>
                    <p className="text-xs text-white/70 mt-1.5 capitalize flex items-center gap-1.5">
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
                            <div className="h-3.5 rounded-full bg-muted/70 overflow-hidden">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {tipoDist.map((t) => {
                      const Icon = t.icon;
                      const percent = pct(t.count);
                      // soft tint per type
                      const tints: Record<string, string> = {
                        casa:         "from-blue-50/80 to-white border-blue-200/50",
                        departamento: "from-purple-50/80 to-white border-purple-200/50",
                        penthouse:    "from-rose-50/80 to-white border-rose-200/50",
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
                        className="group bg-card rounded-[2.5rem] overflow-hidden border border-border/40 shadow-[0_15px_40px_-15px_rgba(15,23,42,0.2)] hover:shadow-[0_25px_50px_-15px_rgba(28,55,140,0.3)] hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="relative h-56 overflow-hidden">
                          {portada ? (
                            <img src={portada} alt={prop.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground/40">
                              <Building2 size={40} />
                            </div>
                          )}
                          {/* Top gradient overlay — legibility for the tags */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/40 to-transparent pointer-events-none"
                          />
                          {/* Tags row — tipo (left) + tipo_oferta (right), editorial style */}
                          <div className="absolute top-5 inset-x-5 sm:inset-x-6 flex items-start justify-between gap-3 pointer-events-none">
                            <span
                              className="font-heading text-[11px] sm:text-[13px] font-bold tracking-[0.14em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] truncate max-w-[55%]"
                              title={prop.tipo}
                            >
                              {prop.tipo}
                            </span>
                            {prop.tipo_oferta && (
                              <div className="flex items-center gap-2 min-w-0 max-w-[55%] justify-end">
                                <span
                                  className="font-heading text-[11px] sm:text-[13px] font-extrabold tracking-[0.16em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] truncate text-right"
                                  title={prop.tipo_oferta}
                                >
                                  {prop.tipo_oferta}
                                </span>
                                <span className="h-px w-5 bg-white/80 flex-shrink-0 hidden md:block" />
                              </div>
                            )}
                          </div>
                          {/* Photo count — bottom left */}
                          {prop.galeria && prop.galeria.length > 1 && (
                            <span className="absolute bottom-4 left-5 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                              {prop.galeria.length} fotos
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-heading text-sm font-semibold text-foreground mb-2 capitalize line-clamp-1">{prop.nombre}</h3>
                          <div className="flex items-center gap-1.5 text-gold mb-3">
                            <MapPin size={14} />
                            <span className="text-sm font-medium">
                              {[prop.municipio, prop.estado].filter(Boolean).join(", ") || prop.zona}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            {prop.recamaras > 0 && (
                              <span className="flex items-center gap-1">
                                <BedDouble size={14} className="text-gold" /> {prop.recamaras} Rec
                              </span>
                            )}
                            {prop.banos > 0 && (
                              <span className="flex items-center gap-1">
                                <Bath size={14} className="text-gold" /> {prop.banos} Baños
                              </span>
                            )}
                            {prop.metros_cuadrados > 0 && (
                              <span className="flex items-center gap-1">
                                <Maximize size={14} className="text-gold" /> {prop.metros_cuadrados} m²
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <span className="font-heading text-base font-bold text-foreground tabular-nums">{formatPrice(prop.precio)}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleDisponible(prop)}
                                className="p-2 rounded-xl transition-colors hover:bg-muted"
                                title={prop.disponible ? "Disponible — click para ocultar" : "Oculta — click para mostrar"}
                              >
                                {prop.disponible
                                  ? <Eye size={14} className="text-emerald-600" />
                                  : <EyeOff size={14} className="text-muted-foreground" />}
                              </button>
                              <button
                                onClick={() => { setEditing(prop); setShowForm(true); }}
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
              advisorName={fullName}
              onOpenProperty={(prop) => {
                const full = properties.find((p) => p.id === prop.id);
                if (full) {
                  setEditing(full);
                  setShowForm(true);
                } else {
                  // La propiedad ya no existe: mandamos al listado.
                  setActiveView("propiedades");
                }
              }}
            />
          )}

          {/* ──────── CONVERSACIONES VIEW ──────── */}
          {activeView === "conversaciones" && <ConversationsView advisorName={fullName} />}

          {/* ──────── CONTENIDO PARA REDES VIEW ──────── */}
          {activeView === "contenido" && (
            <ContenidoView
              properties={properties}
              advisorName={fullName}
              onEditProperty={(p) => {
                setEditing(p);
                setShowForm(true);
              }}
            />
          )}

        </main>
      </div>

      {/* ──────── CREATE USER — MODAL ──────── */}
      {showUserForm && <CreateUserModal onClose={() => setShowUserForm(false)} />}
      {showMfa && <MfaSetupModal onClose={() => setShowMfa(false)} />}

      {/* ──────── PROPERTY FORM — MODAL ──────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-cobalt/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          onClick={() => closeForm()}
        >
          <div
            className="relative w-full max-w-3xl my-auto bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(15,23,42,0.55)] border border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => closeForm()}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="p-6 md:p-8">
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
                advisorName={fullName}
                advisorEmail={user.email ?? ""}
                onSubmit={editing ? handleUpdate : handleCreate}
                onCancel={() => closeForm()}
                loading={saving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sidebar navigation item ── */
interface NavItemProps {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

const NavItem = ({ active, icon: Icon, label, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
      active
        ? "bg-white/[0.13] text-white shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]"
        : "text-white/55 hover:text-white hover:bg-white/[0.06]"
    }`}
  >
    {/* Gold left-accent bar */}
    <span
      aria-hidden="true"
      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-gold transition-all duration-300 ${
        active ? "h-7 opacity-100" : "h-0 opacity-0"
      }`}
    />
    <Icon
      size={16}
      strokeWidth={2.1}
      className={`transition-colors ${active ? "text-gold" : "text-white/55 group-hover:text-white"}`}
    />
    {label}
  </button>
);

export default AdminDashboard;
