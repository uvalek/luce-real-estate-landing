import { useState, useEffect, useCallback, useRef } from "react";
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
  Building2,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contacto, Propiedad } from "@/types";

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
  propiedad_interesada: null,
};

const formatBudget = (n: number) => {
  if (!n) return "";
  return n.toLocaleString("es-MX");
};
const parseBudget = (s: string) => {
  const d = s.replace(/[^0-9]/g, "");
  return d ? parseInt(d, 10) : 0;
};

// ─── Column definitions ───────────────────────────────────────────────
interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
}

const COLUMNS: ColumnDef[] = [
  { key: "select",     label: "",            defaultWidth: 40,  minWidth: 40 },
  { key: "nombre",     label: "Nombre",      defaultWidth: 180, minWidth: 100 },
  { key: "correo",     label: "Correo",      defaultWidth: 200, minWidth: 120 },
  { key: "etapa",      label: "Etapa",       defaultWidth: 150, minWidth: 100 },
  { key: "telefono",   label: "Teléfono",    defaultWidth: 140, minWidth: 100 },
  { key: "credito",    label: "Crédito",     defaultWidth: 110, minWidth: 80 },
  { key: "zona",       label: "Zona",        defaultWidth: 160, minWidth: 100 },
  { key: "propiedad",  label: "Propiedad",   defaultWidth: 220, minWidth: 140 },
  { key: "presupuesto",label: "Presupuesto", defaultWidth: 140, minWidth: 100 },
  { key: "visita",     label: "Visita",      defaultWidth: 130, minWidth: 90 },
  { key: "creacion",   label: "Creación",    defaultWidth: 130, minWidth: 90 },
  { key: "acciones",   label: "Acciones",    defaultWidth: 100, minWidth: 90 },
];

const WIDTHS_STORAGE_KEY = "crm:contactos:column-widths:v1";

const loadSavedWidths = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(WIDTHS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

interface ContactsViewProps {
  onOpenProperty?: (prop: Propiedad) => void;
}

const ContactsView = ({ onOpenProperty }: ContactsViewProps = {}) => {
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [allPropiedades, setAllPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contacto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<ContactoForm>(emptyForm);
  const [presupuestoDisplay, setPresupuestoDisplay] = useState("");

  // ─── Selection state ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ─── Column widths state ─────────────────────────────────────────
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = loadSavedWidths();
    const initial: Record<string, number> = {};
    COLUMNS.forEach((col) => {
      initial[col.key] = saved[col.key] ?? col.defaultWidth;
    });
    return initial;
  });

  // Persist widths
  useEffect(() => {
    try {
      localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      /* ignore */
    }
  }, [columnWidths]);

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const col = COLUMNS.find((c) => c.key === key);
    if (!col) return;
    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth: columnWidths[key] ?? col.defaultWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const ref = resizingRef.current;
      if (!ref) return;
      const delta = ev.clientX - ref.startX;
      const col = COLUMNS.find((c) => c.key === ref.key);
      const minW = col?.minWidth ?? 50;
      const newWidth = Math.max(minW, ref.startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [ref.key]: newWidth }));
    };

    const onUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ─── Fetch ───────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .order("created_at", { ascending: false });
    setContacts((data as Contacto[]) || []);
    setLoading(false);
  }, []);

  const fetchPropiedades = useCallback(async () => {
    const { data } = await supabase
      .from("propiedades")
      .select("id, nombre, tipo, zona, disponible")
      .order("nombre", { ascending: true });
    const all = (data as Propiedad[]) || [];
    setAllPropiedades(all);
    setPropiedades(all.filter((p) => p.disponible));
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchPropiedades();
  }, [fetchContacts, fetchPropiedades]);

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
      propiedad_interesada: c.propiedad_interesada,
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetchContacts();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("contactos").delete().in("id", ids);
    if (error) {
      alert("Error al eliminar: " + error.message);
    }
    setBulkDeleting(false);
    setShowBulkConfirm(false);
    setConfirmInput("");
    setSelectedIds(new Set());
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

  // ─── Selection helpers ───────────────────────────────────────────
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleIds = filteredContacts.map((c) => c.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // Stats
  const totalContacts = contacts.length;
  const etapaCounts = ETAPAS.map((e) => ({
    ...e,
    count: contacts.filter((c) => c.etapa_seguimiento === e.value).length,
  }));

  const selectedCount = selectedIds.size;

  const inputClass =
    "w-full border border-border/80 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 placeholder:text-muted-foreground/50 transition-all";

  const thClass = "relative text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 select-none";
  const tdClass = "px-4 py-3 align-middle overflow-hidden whitespace-nowrap text-ellipsis";

  const totalTableWidth = COLUMNS.reduce((sum, c) => sum + (columnWidths[c.key] ?? c.defaultWidth), 0);

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

      {/* Selection Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-cobalt/5 border border-cobalt/20 rounded-lg px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-cobalt" />
            <span className="text-xs font-semibold text-cobalt">
              {selectedCount} fila{selectedCount > 1 ? "s" : ""} seleccionada{selectedCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded transition-colors"
            >
              Deseleccionar
            </button>
            <button
              onClick={() => { setConfirmInput(""); setShowBulkConfirm(true); }}
              className="flex items-center gap-1.5 bg-destructive text-white text-[11px] font-bold px-3 py-1.5 rounded hover:bg-destructive/90 transition-colors"
            >
              <Trash2 size={12} /> Eliminar {selectedCount}
            </button>
          </div>
        </div>
      )}

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
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Propiedad interesada</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
                  <select
                    value={form.propiedad_interesada ?? ""}
                    onChange={(e) => set("propiedad_interesada", e.target.value ? Number(e.target.value) : null)}
                    className={inputClass + " pl-9 appearance-none cursor-pointer"}
                  >
                    <option value="">Sin especificar</option>
                    {propiedades.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.zona} ({p.tipo})
                      </option>
                    ))}
                  </select>
                </div>
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
          <table
            className="text-sm border-separate border-spacing-0"
            style={{ width: totalTableWidth, tableLayout: "fixed" }}
          >
            <colgroup>
              {COLUMNS.map((col) => (
                <col key={col.key} style={{ width: columnWidths[col.key] ?? col.defaultWidth }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-muted/30">
                {COLUMNS.map((col, idx) => {
                  const isLast = idx === COLUMNS.length - 1;
                  const isSelect = col.key === "select";
                  return (
                    <th
                      key={col.key}
                      className={`${thClass} border-b border-border/50 ${isSelect ? "px-3" : ""}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {isSelect ? (
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                            onChange={toggleAll}
                            className="w-3.5 h-3.5 accent-cobalt cursor-pointer"
                            aria-label="Seleccionar todos"
                          />
                        ) : col.key === "acciones" ? (
                          <span className="ml-auto">{col.label}</span>
                        ) : (
                          <span className="truncate">{col.label}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div
                          onMouseDown={(e) => handleResizeStart(e, col.key)}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group z-10"
                          title="Arrastra para redimensionar"
                        >
                          <div className="absolute top-1/2 right-0 -translate-y-1/2 h-1/2 w-px bg-border/60 group-hover:bg-cobalt group-hover:w-0.5 transition-all" />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((c) => {
                const etapa = ETAPAS.find((e) => e.value === c.etapa_seguimiento);
                const isDeleting = deletingId === c.id;
                const isSelected = selectedIds.has(c.id);
                const prop = c.propiedad_interesada ? allPropiedades.find((p) => p.id === c.propiedad_interesada) : null;

                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border/30 last:border-0 transition-colors ${
                      isSelected ? "bg-cobalt/[0.04]" : "hover:bg-muted/20"
                    }`}
                  >
                    <td className={`${tdClass} px-3 border-b border-border/30`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        className="w-3.5 h-3.5 accent-cobalt cursor-pointer"
                        aria-label={`Seleccionar ${c.nombre}`}
                      />
                    </td>
                    <td className={`${tdClass} border-b border-border/30`}>
                      <span className="font-medium text-foreground">{c.nombre}</span>
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs`}>
                      {c.correo || "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30`}>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${etapa?.color || "bg-gray-100 text-gray-600"}`}>
                        {etapa?.label || c.etapa_seguimiento}
                      </span>
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs tabular-nums`}>
                      {c.telefono || "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs capitalize`}>
                      {c.tipo_credito || "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs`}>
                      {c.zona_interes || "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-xs`}>
                      {!c.propiedad_interesada ? (
                        <span className="text-muted-foreground">—</span>
                      ) : prop && onOpenProperty ? (
                        <button
                          type="button"
                          onClick={() => onOpenProperty(prop)}
                          className="inline-flex items-center gap-1 bg-cobalt/5 text-cobalt font-medium px-2 py-0.5 rounded hover:bg-cobalt/15 hover:underline transition-colors cursor-pointer max-w-full"
                          title={`Abrir "${prop.nombre}" en Propiedades`}
                        >
                          <Building2 size={10} className="flex-shrink-0" />
                          <span className="truncate">{prop.nombre}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-cobalt/5 text-cobalt font-medium px-2 py-0.5 rounded max-w-full">
                          <Building2 size={10} className="flex-shrink-0" />
                          <span className="truncate">{prop?.nombre || `#${c.propiedad_interesada}`}</span>
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs tabular-nums`}>
                      {c.presupuesto_max ? `$${c.presupuesto_max.toLocaleString("es-MX")}` : "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-xs`}>
                      {c.fecha_visita
                        ? new Date(c.fecha_visita).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className={`${tdClass} border-b border-border/30 text-muted-foreground text-[11px] tabular-nums`}>
                      {new Date(c.created_at).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "America/Mexico_City",
                      })}
                    </td>
                    <td className={`${tdClass} border-b border-border/30`}>
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

      {/* Bulk Delete Confirmation Modal */}
      {showBulkConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !bulkDeleting && setShowBulkConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-base font-bold text-foreground mb-1">
                  Eliminar {selectedCount} contacto{selectedCount > 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta acción no se puede deshacer. Para confirmar, escribe <span className="font-bold text-foreground tabular-nums">{selectedCount}</span> en el campo de abajo.
                </p>
              </div>
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkDeleting}
                className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground flex-shrink-0 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary of selected */}
            <div className="bg-muted/40 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Contactos a eliminar:
              </p>
              <ul className="space-y-0.5">
                {contacts
                  .filter((c) => selectedIds.has(c.id))
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.id} className="text-xs text-foreground/80 truncate">
                      • {c.nombre}
                    </li>
                  ))}
                {selectedCount > 8 && (
                  <li className="text-[11px] text-muted-foreground italic pt-1">
                    …y {selectedCount - 8} más
                  </li>
                )}
              </ul>
            </div>

            <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1.5">
              Escribe "{selectedCount}" para confirmar
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={String(selectedCount)}
              autoFocus
              disabled={bulkDeleting}
              className={`w-full border-2 rounded-lg px-4 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none transition-all tabular-nums font-bold ${
                confirmInput === String(selectedCount)
                  ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                  : "border-border/80 focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmInput === String(selectedCount) && !bulkDeleting) {
                  handleBulkDelete();
                }
              }}
            />

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleBulkDelete}
                disabled={confirmInput !== String(selectedCount) || bulkDeleting}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white font-semibold text-xs px-5 py-3 rounded-lg hover:bg-destructive/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {bulkDeleting ? "Eliminando..." : `Eliminar ${selectedCount} fila${selectedCount > 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkDeleting}
                className="px-5 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
