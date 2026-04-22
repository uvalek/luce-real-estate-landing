import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Loader2,
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
import type { OpcionAtributo } from "@/lib/atributos";

// Fallback defaults in case the config table is empty
const DEFAULT_ETAPAS: OpcionAtributo[] = [
  { id: -1, campo: "etapa_seguimiento", valor: "nuevo", etiqueta: "Nuevo", color: "bg-blue-100 text-blue-700", orden: 0 },
  { id: -2, campo: "etapa_seguimiento", valor: "contactado", etiqueta: "Contactado", color: "bg-purple-100 text-purple-700", orden: 1 },
  { id: -3, campo: "etapa_seguimiento", valor: "visita programada", etiqueta: "Visita programada", color: "bg-amber-100 text-amber-700", orden: 2 },
  { id: -4, campo: "etapa_seguimiento", valor: "negociacion", etiqueta: "Negociación", color: "bg-orange-100 text-orange-700", orden: 3 },
  { id: -5, campo: "etapa_seguimiento", valor: "cerrado", etiqueta: "Cerrado", color: "bg-emerald-100 text-emerald-700", orden: 4 },
  { id: -6, campo: "etapa_seguimiento", valor: "perdido", etiqueta: "Perdido", color: "bg-red-100 text-red-700", orden: 5 },
];

const DEFAULT_CREDITOS: OpcionAtributo[] = [
  { id: -7, campo: "tipo_credito", valor: "bancario", etiqueta: "Bancario", color: "bg-slate-100 text-slate-700", orden: 0 },
  { id: -8, campo: "tipo_credito", valor: "infonavit", etiqueta: "Infonavit", color: "bg-rose-100 text-rose-700", orden: 1 },
  { id: -9, campo: "tipo_credito", valor: "fovissste", etiqueta: "Fovissste", color: "bg-teal-100 text-teal-700", orden: 2 },
  { id: -10, campo: "tipo_credito", valor: "contado", etiqueta: "Contado", color: "bg-emerald-100 text-emerald-700", orden: 3 },
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
  resizable?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "select",     label: "",            defaultWidth: 40,  minWidth: 40,  resizable: false },
  { key: "nombre",     label: "Nombre",      defaultWidth: 180, minWidth: 100, resizable: true },
  { key: "correo",     label: "Correo",      defaultWidth: 220, minWidth: 120, resizable: true },
  { key: "etapa",      label: "Etapa",       defaultWidth: 180, minWidth: 120, resizable: true },
  { key: "telefono",   label: "Teléfono",    defaultWidth: 150, minWidth: 100, resizable: true },
  { key: "credito",    label: "Crédito",     defaultWidth: 120, minWidth: 80,  resizable: true },
  { key: "zona",       label: "Zona",        defaultWidth: 160, minWidth: 100, resizable: true },
  { key: "propiedad",  label: "Propiedad",   defaultWidth: 240, minWidth: 140, resizable: true },
  { key: "presupuesto",label: "Presupuesto", defaultWidth: 150, minWidth: 100, resizable: true },
  { key: "visita",     label: "Fecha visita",defaultWidth: 180, minWidth: 130, resizable: true },
  { key: "creacion",   label: "Creación",    defaultWidth: 150, minWidth: 110, resizable: true },
  { key: "acciones",   label: "Acciones",    defaultWidth: 80,  minWidth: 70,  resizable: false },
];

const WIDTHS_STORAGE_KEY = "crm:contactos:column-widths:v2";

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

type EditableField =
  | "nombre"
  | "correo"
  | "telefono"
  | "etapa_seguimiento"
  | "tipo_credito"
  | "zona_interes"
  | "propiedad_interesada"
  | "presupuesto_max"
  | "fecha_visita";

const ContactsView = ({ onOpenProperty }: ContactsViewProps = {}) => {
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [allPropiedades, setAllPropiedades] = useState<Propiedad[]>([]);
  const [etapas, setEtapas] = useState<OpcionAtributo[]>(DEFAULT_ETAPAS);
  const [creditos, setCreditos] = useState<OpcionAtributo[]>(DEFAULT_CREDITOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<ContactoForm>(emptyForm);
  const [presupuestoDisplay, setPresupuestoDisplay] = useState("");

  // ─── Inline cell editing ─────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ id: number; field: EditableField } | null>(null);
  const [cellDraft, setCellDraft] = useState<string>("");

  // ─── Selection / delete confirmation ─────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[] | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ─── Column widths ───────────────────────────────────────────────
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = loadSavedWidths();
    const initial: Record<string, number> = {};
    COLUMNS.forEach((col) => {
      initial[col.key] = saved[col.key] ?? col.defaultWidth;
    });
    // Force the select column to always be its default (non-resizable)
    initial.select = COLUMNS[0].defaultWidth;
    return initial;
  });

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
    if (!col || col.resizable === false) return;
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
      const c = COLUMNS.find((cc) => cc.key === ref.key);
      const minW = c?.minWidth ?? 50;
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

  const fetchOpciones = useCallback(async () => {
    const { data } = await supabase
      .from("crm_atributo_opciones")
      .select("*")
      .order("orden", { ascending: true });
    const all = (data as OpcionAtributo[]) || [];
    const etapasDB = all.filter((o) => o.campo === "etapa_seguimiento");
    const creditosDB = all.filter((o) => o.campo === "tipo_credito");
    if (etapasDB.length > 0) setEtapas(etapasDB);
    if (creditosDB.length > 0) setCreditos(creditosDB);
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchPropiedades();
    fetchOpciones();
  }, [fetchContacts, fetchPropiedades, fetchOpciones]);

  const openNew = () => {
    setForm(emptyForm);
    setPresupuestoDisplay("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("contactos").insert(form);
    if (error) alert("Error: " + error.message);

    setSaving(false);
    setShowForm(false);
    await fetchContacts();
  };

  // ─── Inline cell edit helpers ────────────────────────────────────
  const startEdit = (id: number, field: EditableField, initialValue: string) => {
    setEditingCell({ id, field });
    setCellDraft(initialValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setCellDraft("");
  };

  const saveCell = async (overrideValue?: string) => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const current = contacts.find((c) => c.id === id);
    if (!current) {
      cancelEdit();
      return;
    }

    // Use explicit override when provided (e.g. select onChange). Otherwise fall back to state.
    const draft = overrideValue !== undefined ? overrideValue : cellDraft;

    let newValue: unknown = draft;
    if (field === "presupuesto_max") {
      newValue = parseBudget(draft);
    } else if (field === "propiedad_interesada") {
      newValue = draft ? Number(draft) : null;
    } else if (field === "fecha_visita") {
      newValue = draft ? new Date(draft).toISOString() : null;
    } else if (field === "nombre") {
      const trimmed = draft.trim();
      if (!trimmed) {
        cancelEdit();
        return;
      }
      newValue = trimmed;
    } else {
      // text fields: treat empty as null
      newValue = draft === "" ? null : draft;
    }

    // Skip if unchanged
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((current as any)[field] === newValue) {
      cancelEdit();
      return;
    }

    // Optimistic UI
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? ({ ...c, [field]: newValue } as Contacto) : c)),
    );
    cancelEdit();

    const { error } = await supabase
      .from("contactos")
      .update({ [field]: newValue })
      .eq("id", id);
    if (error) {
      alert("Error al guardar: " + error.message);
      await fetchContacts(); // revert
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!confirmDeleteIds || confirmDeleteIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("contactos").delete().in("id", confirmDeleteIds);
    if (error) alert("Error al eliminar: " + error.message);
    setBulkDeleting(false);
    setConfirmDeleteIds(null);
    setConfirmInput("");
    // Clear selection of deleted
    setSelectedIds((prev) => {
      const next = new Set(prev);
      confirmDeleteIds.forEach((id) => next.delete(id));
      return next;
    });
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
  const etapaCounts = etapas.map((e) => ({
    ...e,
    count: contacts.filter((c) => c.etapa_seguimiento === e.valor).length,
  }));

  const selectedCount = selectedIds.size;

  const inputClass =
    "w-full border border-border/80 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 placeholder:text-muted-foreground/50 transition-all";

  const thClass = "relative text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 select-none";
  const tdBase = "align-middle border-b border-border/30 overflow-hidden";

  // Inline input classes (compact, fills cell)
  const cellInputClass =
    "w-full h-full min-h-[38px] px-3 py-1.5 text-xs bg-white border-2 border-cobalt rounded outline-none ring-2 ring-cobalt/20 text-foreground";

  const totalTableWidth = COLUMNS.reduce((sum, c) => sum + (columnWidths[c.key] ?? c.defaultWidth), 0);

  // ─── Format helpers ──────────────────────────────────────────────
  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Mexico_City",
    });
  };

  const toDateTimeLocalInput = (iso: string | null): string => {
    if (!iso) return "";
    // Convert ISO (UTC) to local datetime-local input format (yyyy-MM-ddTHH:mm)
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Key handlers for inline inputs
  const handleCellKey = (e: React.KeyboardEvent, isTextarea = false) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter" && !isTextarea) {
      e.preventDefault();
      saveCell();
    }
  };

  // Bulk delete initiation
  const startBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteIds(Array.from(selectedIds));
    setConfirmInput("");
  };
  const startRowDelete = (id: number) => {
    setConfirmDeleteIds([id]);
    setConfirmInput("");
  };

  const pendingDeleteCount = confirmDeleteIds?.length ?? 0;
  const pendingContacts = confirmDeleteIds
    ? contacts.filter((c) => confirmDeleteIds.includes(c.id))
    : [];

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
          <div key={e.valor} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${e.color || "bg-gray-100 text-gray-700"}`}>
            {e.count} {e.etiqueta}
          </div>
        ))}
      </div>

      {/* Header + search */}
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

      {/* Selection bar */}
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
              onClick={startBulkDelete}
              className="flex items-center gap-1.5 bg-destructive text-white text-[11px] font-bold px-3 py-1.5 rounded hover:bg-destructive/90 transition-colors"
            >
              <Trash2 size={12} /> Eliminar {selectedCount}
            </button>
          </div>
        </div>
      )}

      {/* Create form (inline) */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-6 border border-black/[0.04] relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-cobalt/10 flex items-center justify-center">
              <Plus size={14} className="text-cobalt" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Nuevo Contacto</h3>
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
                  {etapas.map((e) => (
                    <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Tipo de crédito</label>
                <select value={form.tipo_credito || ""} onChange={(e) => set("tipo_credito", e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
                  <option value="">Sin especificar</option>
                  {creditos.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
                  ))}
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
                  value={form.fecha_visita ? toDateTimeLocalInput(form.fecha_visita) : ""}
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
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
                {COLUMNS.map((col) => {
                  const isSelect = col.key === "select";
                  const isResizable = col.resizable !== false;
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
                      {isResizable && (
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
                const etapa = etapas.find((e) => e.valor === c.etapa_seguimiento);
                const isSelected = selectedIds.has(c.id);
                const prop = c.propiedad_interesada ? allPropiedades.find((p) => p.id === c.propiedad_interesada) : null;
                const rowBg = isSelected ? "bg-cobalt/[0.04]" : "hover:bg-muted/20";

                const isEditing = (field: EditableField) =>
                  editingCell?.id === c.id && editingCell?.field === field;

                // Editable text cell helper
                const textCell = (field: EditableField, value: string | null, placeholder: string) => {
                  if (isEditing(field)) {
                    return (
                      <input
                        autoFocus
                        type="text"
                        value={cellDraft}
                        onChange={(e) => setCellDraft(e.target.value)}
                        onBlur={() => saveCell()}
                        onKeyDown={(e) => handleCellKey(e)}
                        className={cellInputClass}
                        placeholder={placeholder}
                      />
                    );
                  }
                  return (
                    <div
                      onClick={() => startEdit(c.id, field, value ?? "")}
                      className="cursor-text hover:bg-cobalt/5 -mx-1 px-1 py-1 rounded min-h-[28px] flex items-center transition-colors truncate"
                      title={value || "Click para editar"}
                    >
                      {value ? (
                        <span className="truncate">{value}</span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">{placeholder}</span>
                      )}
                    </div>
                  );
                };

                return (
                  <tr key={c.id} className={`transition-colors ${rowBg}`}>
                    {/* Checkbox */}
                    <td className={`${tdBase} px-3 py-3`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        className="w-3.5 h-3.5 accent-cobalt cursor-pointer"
                        aria-label={`Seleccionar ${c.nombre}`}
                      />
                    </td>

                    {/* Nombre */}
                    <td className={`${tdBase} px-4 py-2`}>
                      {isEditing("nombre") ? (
                        <input
                          autoFocus
                          type="text"
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass + " font-medium"}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(c.id, "nombre", c.nombre)}
                          className="cursor-text hover:bg-cobalt/5 -mx-1 px-1 py-1 rounded font-medium text-foreground truncate"
                          title="Click para editar"
                        >
                          {c.nombre}
                        </div>
                      )}
                    </td>

                    {/* Correo */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground`}>
                      {textCell("correo", c.correo, "email@ejemplo.com")}
                    </td>

                    {/* Etapa */}
                    <td className={`${tdBase} px-4 py-2`}>
                      {isEditing("etapa_seguimiento") ? (
                        <select
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCellDraft(v);
                            saveCell(v);
                          }}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass + " cursor-pointer"}
                        >
                          {etapas.map((e) => (
                            <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => startEdit(c.id, "etapa_seguimiento", c.etapa_seguimiento)}
                          className="cursor-pointer -mx-1 px-1 py-1 rounded hover:bg-cobalt/5 transition-colors"
                          title="Click para cambiar"
                        >
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${etapa?.color || "bg-gray-100 text-gray-600"}`}>
                            {etapa?.etiqueta || c.etapa_seguimiento}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Teléfono */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground tabular-nums`}>
                      {textCell("telefono", c.telefono, "+52 ...")}
                    </td>

                    {/* Crédito */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground capitalize`}>
                      {isEditing("tipo_credito") ? (
                        <select
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCellDraft(v);
                            saveCell(v);
                          }}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass + " cursor-pointer"}
                        >
                          <option value="">— sin especificar —</option>
                          {creditos.map((opt) => (
                            <option key={opt.valor} value={opt.valor}>
                              {opt.etiqueta}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => startEdit(c.id, "tipo_credito", c.tipo_credito || "")}
                          className="cursor-pointer -mx-1 px-1 py-1 rounded min-h-[28px] flex items-center hover:bg-cobalt/5 transition-colors"
                          title="Click para cambiar"
                        >
                          {(() => {
                            const cred = creditos.find((o) => o.valor === c.tipo_credito);
                            if (cred) {
                              return (
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cred.color || "bg-gray-100 text-gray-600"}`}>
                                  {cred.etiqueta}
                                </span>
                              );
                            }
                            return <span className="text-muted-foreground/40 italic normal-case">Sin especificar</span>;
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Zona */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground`}>
                      {textCell("zona_interes", c.zona_interes, "Zona...")}
                    </td>

                    {/* Propiedad */}
                    <td className={`${tdBase} px-4 py-2 text-xs`}>
                      {isEditing("propiedad_interesada") ? (
                        <select
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCellDraft(v);
                            saveCell(v);
                          }}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass + " cursor-pointer"}
                        >
                          <option value="">— Sin especificar —</option>
                          {propiedades.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} — {p.zona}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5 min-h-[28px]">
                          {!c.propiedad_interesada ? (
                            <button
                              type="button"
                              onClick={() => startEdit(c.id, "propiedad_interesada", "")}
                              className="text-muted-foreground/40 italic hover:text-cobalt text-xs"
                            >
                              Asignar propiedad
                            </button>
                          ) : prop && onOpenProperty ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenProperty(prop)}
                                className="inline-flex items-center gap-1 bg-cobalt/5 text-cobalt font-medium px-2 py-0.5 rounded hover:bg-cobalt/15 hover:underline transition-colors cursor-pointer max-w-full min-w-0"
                                title={`Abrir "${prop.nombre}"`}
                              >
                                <Building2 size={10} className="flex-shrink-0" />
                                <span className="truncate">{prop.nombre}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(c.id, "propiedad_interesada", String(c.propiedad_interesada ?? ""))}
                                className="text-[9px] text-muted-foreground/60 hover:text-cobalt underline underline-offset-2"
                                title="Cambiar propiedad"
                              >
                                cambiar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(c.id, "propiedad_interesada", String(c.propiedad_interesada ?? ""))}
                              className="inline-flex items-center gap-1 bg-cobalt/5 text-cobalt font-medium px-2 py-0.5 rounded"
                            >
                              <Building2 size={10} />
                              <span className="truncate">{prop?.nombre || `#${c.propiedad_interesada}`}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Presupuesto */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground tabular-nums`}>
                      {isEditing("presupuesto_max") ? (
                        <input
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={cellDraft ? formatBudget(parseBudget(cellDraft)) : ""}
                          onChange={(e) => setCellDraft(String(parseBudget(e.target.value)))}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass + " tabular-nums"}
                          placeholder="1,500,000"
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(c.id, "presupuesto_max", String(c.presupuesto_max || ""))}
                          className="cursor-text hover:bg-cobalt/5 -mx-1 px-1 py-1 rounded min-h-[28px] flex items-center transition-colors truncate"
                          title="Click para editar"
                        >
                          {c.presupuesto_max ? `$${c.presupuesto_max.toLocaleString("es-MX")}` : <span className="text-muted-foreground/40 italic">$0</span>}
                        </div>
                      )}
                    </td>

                    {/* Fecha visita */}
                    <td className={`${tdBase} px-4 py-2 text-xs text-muted-foreground`}>
                      {isEditing("fecha_visita") ? (
                        <input
                          autoFocus
                          type="datetime-local"
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => saveCell()}
                          onKeyDown={(e) => handleCellKey(e)}
                          className={cellInputClass}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(c.id, "fecha_visita", toDateTimeLocalInput(c.fecha_visita))}
                          className="cursor-text hover:bg-cobalt/5 -mx-1 px-1 py-1 rounded min-h-[28px] flex items-center transition-colors truncate tabular-nums"
                          title="Click para editar"
                        >
                          {c.fecha_visita ? formatDateTime(c.fecha_visita) : <span className="text-muted-foreground/40 italic">Sin fecha</span>}
                        </div>
                      )}
                    </td>

                    {/* Creación (read-only) */}
                    <td className={`${tdBase} px-4 py-2 text-[11px] text-muted-foreground tabular-nums`}>
                      <div className="truncate" title={new Date(c.created_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}>
                        {new Date(c.created_at).toLocaleString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Mexico_City",
                        })}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className={`${tdBase} px-4 py-2`}>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => startRowDelete(c.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Eliminar contacto"
                        >
                          <Trash2 size={13} className="text-destructive/60 hover:text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal (single or bulk) */}
      {confirmDeleteIds && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !bulkDeleting && setConfirmDeleteIds(null)}
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
                  Eliminar {pendingDeleteCount} contacto{pendingDeleteCount > 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta acción no se puede deshacer. Para confirmar, escribe <span className="font-bold text-foreground tabular-nums">{pendingDeleteCount}</span> en el campo de abajo.
                </p>
              </div>
              <button
                onClick={() => setConfirmDeleteIds(null)}
                disabled={bulkDeleting}
                className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground flex-shrink-0 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-muted/40 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                {pendingDeleteCount > 1 ? "Contactos a eliminar:" : "Contacto a eliminar:"}
              </p>
              <ul className="space-y-0.5">
                {pendingContacts.slice(0, 8).map((c) => (
                  <li key={c.id} className="text-xs text-foreground/80 truncate">
                    • {c.nombre}
                  </li>
                ))}
                {pendingDeleteCount > 8 && (
                  <li className="text-[11px] text-muted-foreground italic pt-1">
                    …y {pendingDeleteCount - 8} más
                  </li>
                )}
              </ul>
            </div>

            <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1.5">
              Escribe "{pendingDeleteCount}" para confirmar
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={String(pendingDeleteCount)}
              autoFocus
              disabled={bulkDeleting}
              className={`w-full border-2 rounded-lg px-4 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none transition-all tabular-nums font-bold ${
                confirmInput === String(pendingDeleteCount)
                  ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                  : "border-border/80 focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmInput === String(pendingDeleteCount) && !bulkDeleting) {
                  handleConfirmDelete();
                }
              }}
            />

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleConfirmDelete}
                disabled={confirmInput !== String(pendingDeleteCount) || bulkDeleting}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white font-semibold text-xs px-5 py-3 rounded-lg hover:bg-destructive/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {bulkDeleting ? "Eliminando..." : `Eliminar ${pendingDeleteCount} fila${pendingDeleteCount > 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => setConfirmDeleteIds(null)}
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
