import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Loader2,
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  AtSign,
  Phone,
  List,
  DollarSign,
  Calendar,
  Link2,
  Clock,
  Palette,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ATRIBUTOS_CONTACTOS,
  COLOR_PALETTE,
  DEFAULT_OPTION_COLOR,
  type AtributoMeta,
  type OpcionAtributo,
  type TipoAtributo,
} from "@/lib/atributos";

const TIPO_ICONS: Record<TipoAtributo, typeof Hash> = {
  id: Hash,
  text: Type,
  email: AtSign,
  tel: Phone,
  select: List,
  number: DollarSign,
  datetime: Calendar,
  reference: Link2,
  timestamp: Clock,
};

const TIPO_COLORS: Record<TipoAtributo, string> = {
  id: "bg-gray-100 text-gray-600",
  text: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  tel: "bg-teal-100 text-teal-700",
  select: "bg-amber-100 text-amber-700",
  number: "bg-emerald-100 text-emerald-700",
  datetime: "bg-indigo-100 text-indigo-700",
  reference: "bg-cyan-100 text-cyan-700",
  timestamp: "bg-slate-100 text-slate-600",
};

const TIPO_LABELS: Record<TipoAtributo, string> = {
  id: "ID automático",
  text: "Texto",
  email: "Correo",
  tel: "Teléfono",
  select: "Selector",
  number: "Número",
  datetime: "Fecha y hora",
  reference: "Referencia",
  timestamp: "Fecha de sistema",
};

const ConfigView = () => {
  const [opciones, setOpciones] = useState<OpcionAtributo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedField, setExpandedField] = useState<string | null>("etapa_seguimiento");
  const [editingOpcion, setEditingOpcion] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<OpcionAtributo>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<{ valor: string; etiqueta: string; color: string }>({
    valor: "",
    etiqueta: "",
    color: DEFAULT_OPTION_COLOR,
  });
  const [saving, setSaving] = useState(false);

  const fetchOpciones = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_atributo_opciones")
      .select("*")
      .order("orden", { ascending: true });
    setOpciones((data as OpcionAtributo[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOpciones();
  }, [fetchOpciones]);

  const opcionesPorCampo = (campo: string) =>
    opciones.filter((o) => o.campo === campo).sort((a, b) => a.orden - b.orden);

  const startEdit = (o: OpcionAtributo) => {
    setEditingOpcion(o.id);
    setEditingDraft({ valor: o.valor, etiqueta: o.etiqueta, color: o.color || DEFAULT_OPTION_COLOR });
  };

  const cancelEdit = () => {
    setEditingOpcion(null);
    setEditingDraft({});
  };

  const saveEdit = async () => {
    if (editingOpcion == null) return;
    setSaving(true);
    const { error } = await supabase
      .from("crm_atributo_opciones")
      .update({
        valor: editingDraft.valor,
        etiqueta: editingDraft.etiqueta,
        color: editingDraft.color,
      })
      .eq("id", editingOpcion);
    if (error) alert("Error al guardar: " + error.message);
    setSaving(false);
    cancelEdit();
    await fetchOpciones();
  };

  const deleteOpcion = async (o: OpcionAtributo) => {
    if (!confirm(`¿Eliminar la opción "${o.etiqueta}"?\n\nSi hay contactos con este valor, su campo quedará "${o.valor}" pero sin opción configurada.`)) return;
    const { error } = await supabase.from("crm_atributo_opciones").delete().eq("id", o.id);
    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }
    await fetchOpciones();
  };

  const addOpcion = async (campo: string) => {
    if (!newDraft.valor.trim() || !newDraft.etiqueta.trim()) {
      alert("Valor y etiqueta son obligatorios.");
      return;
    }
    setSaving(true);
    const maxOrden = Math.max(0, ...opcionesPorCampo(campo).map((o) => o.orden));
    const { error } = await supabase.from("crm_atributo_opciones").insert({
      campo,
      valor: newDraft.valor.trim().toLowerCase(),
      etiqueta: newDraft.etiqueta.trim(),
      color: newDraft.color,
      orden: maxOrden + 1,
    });
    if (error) {
      alert("Error: " + error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setNewDraft({ valor: "", etiqueta: "", color: DEFAULT_OPTION_COLOR });
    setAddingTo(null);
    await fetchOpciones();
  };

  const moveOpcion = async (o: OpcionAtributo, direction: "up" | "down") => {
    const siblings = opcionesPorCampo(o.campo);
    const idx = siblings.findIndex((s) => s.id === o.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const target = siblings[targetIdx];
    // swap orden
    await supabase.from("crm_atributo_opciones").update({ orden: target.orden }).eq("id", o.id);
    await supabase.from("crm_atributo_opciones").update({ orden: o.orden }).eq("id", target.id);
    await fetchOpciones();
  };

  const renderAtributo = (meta: AtributoMeta) => {
    const Icon = TIPO_ICONS[meta.tipo];
    const hasOpts = meta.hasOptions;
    const isExpanded = expandedField === meta.campo && hasOpts;
    const opts = hasOpts ? opcionesPorCampo(meta.campo) : [];

    return (
      <div
        key={meta.campo}
        className="bg-white rounded-xl shadow-sm border border-black/[0.04] overflow-hidden"
      >
        {/* Header */}
        <div
          onClick={() => hasOpts && setExpandedField(isExpanded ? null : meta.campo)}
          className={`flex items-center gap-3 px-5 py-4 ${hasOpts ? "cursor-pointer hover:bg-muted/20" : ""} transition-colors`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TIPO_COLORS[meta.tipo]}`}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-sm font-bold text-foreground">{meta.etiqueta}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TIPO_COLORS[meta.tipo]}`}>
                {TIPO_LABELS[meta.tipo]}
              </span>
              {!meta.editable && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  automático
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meta.descripcion}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/80 font-mono">
              <span>Supabase: <span className="text-foreground/70 font-semibold">{meta.campo}</span></span>
              <span className="text-muted-foreground/40">•</span>
              <span>Tipo: <span className="text-foreground/70 font-semibold">{meta.tipoSupabase}</span></span>
            </div>
          </div>
          {hasOpts && (
            <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
              <span className="text-[11px] font-semibold tabular-nums">{opts.length} opciones</span>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </div>

        {/* Expanded options editor */}
        {isExpanded && (
          <div className="border-t border-border/40 bg-muted/20 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Palette size={11} />
              Opciones disponibles
            </p>

            {opts.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-3">
                No hay opciones. Agrega la primera con el botón de abajo.
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {opts.map((o, idx) => {
                  const isEditing = editingOpcion === o.id;
                  const colorClass = (isEditing ? editingDraft.color : o.color) || DEFAULT_OPTION_COLOR;
                  return (
                    <div
                      key={o.id}
                      className="flex items-start gap-2 bg-white rounded-lg border border-border/40 px-3 py-2.5"
                    >
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <button
                          onClick={() => moveOpcion(o, "up")}
                          disabled={idx === 0}
                          className="text-muted-foreground/40 hover:text-cobalt disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none"
                          title="Subir"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveOpcion(o, "down")}
                          disabled={idx === opts.length - 1}
                          className="text-muted-foreground/40 hover:text-cobalt disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none"
                          title="Bajar"
                        >
                          ▼
                        </button>
                      </div>
                      <GripVertical size={14} className="text-muted-foreground/30 mt-1 flex-shrink-0" />

                      {isEditing ? (
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Etiqueta</label>
                              <input
                                autoFocus
                                value={editingDraft.etiqueta || ""}
                                onChange={(e) => setEditingDraft((d) => ({ ...d, etiqueta: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-border/60 rounded outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40"
                                placeholder="Ej: Contactado"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Valor interno</label>
                              <input
                                value={editingDraft.valor || ""}
                                onChange={(e) => setEditingDraft((d) => ({ ...d, valor: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-border/60 rounded outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 font-mono"
                                placeholder="ej: contactado"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Color</label>
                            <div className="flex flex-wrap gap-1.5">
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c.className}
                                  onClick={() => setEditingDraft((d) => ({ ...d, color: c.className }))}
                                  className={`${c.className} text-[10px] font-bold px-2.5 py-1 rounded-full border-2 transition-all ${
                                    editingDraft.color === c.className ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                                  }`}
                                  title={c.label}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-muted-foreground">Preview:</span>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
                              {editingDraft.etiqueta || "Etiqueta"}
                            </span>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="flex items-center gap-1 bg-cobalt text-white text-[11px] font-semibold px-3 py-1.5 rounded hover:bg-cobalt-light transition-colors disabled:opacity-60"
                            >
                              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                              Guardar
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded hover:bg-muted transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
                              {o.etiqueta}
                            </span>
                            <code className="text-[10px] text-muted-foreground/70 font-mono">{o.valor}</code>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => startEdit(o)}
                              className="text-[10px] font-semibold text-cobalt hover:bg-cobalt/10 px-2 py-1 rounded transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteOpcion(o)}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive/60 hover:text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new option */}
            {addingTo === meta.campo ? (
              <div className="bg-white rounded-lg border-2 border-cobalt/30 px-3 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cobalt">Nueva opción</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Etiqueta</label>
                    <input
                      autoFocus
                      value={newDraft.etiqueta}
                      onChange={(e) => setNewDraft({ ...newDraft, etiqueta: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-border/60 rounded outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40"
                      placeholder="Ej: En espera"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Valor interno</label>
                    <input
                      value={newDraft.valor}
                      onChange={(e) => setNewDraft({ ...newDraft, valor: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-border/60 rounded outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 font-mono"
                      placeholder="ej: en_espera"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.className}
                        onClick={() => setNewDraft({ ...newDraft, color: c.className })}
                        className={`${c.className} text-[10px] font-bold px-2.5 py-1 rounded-full border-2 transition-all ${
                          newDraft.color === c.className ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                        }`}
                        title={c.label}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-muted-foreground">Preview:</span>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${newDraft.color}`}>
                    {newDraft.etiqueta || "Etiqueta"}
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => addOpcion(meta.campo)}
                    disabled={saving}
                    className="flex items-center gap-1 bg-cobalt text-white text-[11px] font-semibold px-3 py-1.5 rounded hover:bg-cobalt-light transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Crear opción
                  </button>
                  <button
                    onClick={() => { setAddingTo(null); setNewDraft({ valor: "", etiqueta: "", color: DEFAULT_OPTION_COLOR }); }}
                    disabled={saving}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(meta.campo)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-cobalt border-2 border-dashed border-cobalt/30 hover:border-cobalt/60 hover:bg-cobalt/5 rounded-lg py-2.5 transition-all"
              >
                <Plus size={13} /> Agregar opción
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cobalt/10 flex items-center justify-center flex-shrink-0">
          <Settings size={18} className="text-cobalt" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-lg font-bold text-foreground">Configuración de Atributos</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
            Cada <span className="font-semibold text-foreground">atributo</span> corresponde a una columna de la tabla <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">contactos</code> en Supabase. Los atributos tipo <span className="font-semibold text-foreground">selector</span> tienen opciones personalizables.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-cobalt" />
        </div>
      ) : (
        <div className="space-y-3">
          {ATRIBUTOS_CONTACTOS.map(renderAtributo)}
        </div>
      )}

      <div className="mt-8 bg-gradient-to-br from-cobalt/[0.03] to-gold/[0.03] border border-border/40 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cobalt/10 flex items-center justify-center flex-shrink-0">
            <X size={15} className="text-cobalt rotate-45" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">¿Cómo funciona?</h4>
            <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
              <li>• Las opciones que configuras aquí aparecen en los selectores del CRM (Etapa, Crédito).</li>
              <li>• El <span className="font-semibold text-foreground">valor interno</span> se guarda en Supabase; la <span className="font-semibold text-foreground">etiqueta</span> es lo que ve el usuario.</li>
              <li>• Al eliminar una opción, los contactos existentes que la tengan conservan el valor en texto.</li>
              <li>• Usa las flechas ▲▼ para reordenar.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigView;
