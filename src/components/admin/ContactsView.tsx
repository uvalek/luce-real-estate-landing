import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  UserPlus,
  Users,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contacto } from "@/types";

const ETAPAS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  { value: "contactado", label: "Contactado", color: "bg-purple-100 text-purple-700" },
  { value: "visita programada", label: "Visita programada", color: "bg-amber-100 text-amber-700" },
  { value: "negociacion", label: "Negociación", color: "bg-orange-100 text-orange-700" },
  { value: "cerrado", label: "Cerrado", color: "bg-emerald-100 text-emerald-700" },
  { value: "perdido", label: "Perdido", color: "bg-red-100 text-red-700" },
];

type ContactoForm = Omit<Contacto, "id" | "created_at">;

const emptyForm: ContactoForm = {
  nombre: "",
  correo: "",
  etapa_seguimiento: "nuevo",
  telefono: "",
  tipo_credito: "",
  zona_interes: "",
  presupuesto_max: 0,
  fecha_visita: null,
};

const formatBudget = (n: number) => {
  if (!n) return "";
  return n.toLocaleString("es-MX");
};
const parseBudget = (s: string) => {
  const d = s.replace(/[^0-9]/g, "");
  return d ? parseInt(d, 10) : 0;
};

const ContactsView = () => {
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contacto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<ContactoForm>(emptyForm);
  const [presupuestoDisplay, setPresupuestoDisplay] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .order("created_at", { ascending: false });
    setContacts((data as Contacto[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setPresupuestoDisplay("");
    setShowForm(true);
  };

  const openEdit = (c: Contacto) => {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      correo: c.correo,
      etapa_seguimiento: c.etapa_seguimiento,
      telefono: c.telefono,
      tipo_credito: c.tipo_credito,
      zona_interes: c.zona_interes,
      presupuesto_max: c.presupuesto_max,
      fecha_visita: c.fecha_visita,
    });
    setPresupuestoDisplay(formatBudget(c.presupuesto_max));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("contactos")
        .update(form)
        .eq("id", editing.id);
      if (error) alert("Error: " + error.message);
    } else {
      const { error } = await supabase.from("contactos").insert(form);
      if (error) alert("Error: " + error.message);
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    await fetchContacts();
  };

  const handleDelete = async (id: number) => {
    await supabase.from("contactos").delete().eq("id", id);
    setDeletingId(null);
    await fetchContacts();
  };

  const set = (field: keyof ContactoForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.correo || "").toLowerCase().includes(q) ||
      (c.telefono || "").includes(q) ||
      (c.zona_interes || "").toLowerCase().includes(q)
    );
  });

  // Stats
  const totalContacts = contacts.length;
  const etapaCounts = ETAPAS.map((e) => ({
    ...e,
    count: contacts.filter((c) => c.etapa_seguimiento === e.value).length,
  }));

  const inputClass =
    "w-full border border-border/80 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 placeholder:text-muted-foreground/50 transition-all";

  return (
    <div>
      {/* Stats row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-black/[0.04]">
          <Users size={14} className="text-cobalt" />
          <span className="text-xs font-bold text-foreground">{totalContacts}</span>
          <span className="text-[10px] text-muted-foreground">contactos</span>
        </div>
        {etapaCounts.filter((e) => e.count > 0).map((e) => (
          <div key={e.value} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${e.color}`}>
            {e.count} {e.label}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contacto..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border/60 rounded-lg outline-none focus:ring-2 focus:ring-cobalt/20"
          />
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-cobalt text-white font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-cobalt-light transition-colors shadow-sm"
          >
            <UserPlus size={15} /> Nuevo Contacto
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-6 border border-black/[0.04] relative">
          <button
            onClick={() => { setShowForm(false); setEditing(null); }}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-cobalt/10 flex items-center justify-center">
              {editing ? <Pencil size={14} className="text-cobalt" /> : <Plus size={14} className="text-cobalt" />}
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {editing ? "Editar Contacto" : "Nuevo Contacto"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Juan Pérez" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Correo</label>
                <input type="email" value={form.correo || ""} onChange={(e) => set("correo", e.target.value)} placeholder="juan@email.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Teléfono</label>
                <input value={form.telefono || ""} onChange={(e) => set("telefono", e.target.value)} placeholder="+52 222 000 0000" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Etapa</label>
                <select value={form.etapa_seguimiento} onChange={(e) => set("etapa_seguimiento", e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
                  {ETAPAS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Tipo de crédito</label>
                <select value={form.tipo_credito || ""} onChange={(e) => set("tipo_credito", e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
                  <option value="">Sin especificar</option>
                  <option value="bancario">bancario</option>
                  <option value="infonavit">infonavit</option>
                  <option value="fovissste">fovissste</option>
                  <option value="contado">contado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Zona de interés</label>
                <input value={form.zona_interes || ""} onChange={(e) => set("zona_interes", e.target.value)} placeholder="Apizaco, Tlaxcala" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Presupuesto máx.</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={presupuestoDisplay}
                    onChange={(e) => {
                      const n = parseBudget(e.target.value);
                      set("presupuesto_max", n);
                      setPresupuestoDisplay(n ? formatBudget(n) : "");
                    }}
                    placeholder="1,500,000"
                    className={inputClass + " pl-7 tabular-nums"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Fecha de visita</label>
                <input
                  type="datetime-local"
                  value={form.fecha_visita ? form.fecha_visita.slice(0, 16) : ""}
                  onChange={(e) => set("fecha_visita", e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-cobalt text-white font-semibold text-xs px-6 py-2.5 rounded-lg hover:bg-cobalt-light transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editing ? "Guardar" : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-cobalt" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-black/[0.04] py-14 text-center">
          <Users size={36} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{search ? "Sin resultados" : "No hay contactos"}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">{search ? "Intenta con otro término" : "Agrega tu primer contacto"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-black/[0.04] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Nombre</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Correo</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Etapa</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Teléfono</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Crédito</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Zona</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">Presupuesto</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">Visita</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Creación</th>
                <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((c) => {
                const etapa = ETAPAS.find((e) => e.value === c.etapa_seguimiento);
                const isDeleting = deletingId === c.id;

                return (
                  <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{c.nombre}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {c.correo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${etapa?.color || "bg-gray-100 text-gray-600"}`}>
                        {etapa?.label || c.etapa_seguimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs tabular-nums">
                      {c.telefono || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs capitalize">
                      {c.tipo_credito || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {c.zona_interes || "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs tabular-nums">
                      {c.presupuesto_max ? `$${c.presupuesto_max.toLocaleString("es-MX")}` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                      {c.fecha_visita
                        ? new Date(c.fecha_visita).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-[11px] tabular-nums">
                      {new Date(c.created_at).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "America/Mexico_City",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-2 rounded-lg hover:bg-cobalt/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} className="text-cobalt" />
                        </button>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-[10px] font-bold text-white bg-destructive rounded px-2 py-1 hover:bg-destructive/80"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-[10px] text-muted-foreground px-1.5 py-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(c.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} className="text-destructive/60" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
