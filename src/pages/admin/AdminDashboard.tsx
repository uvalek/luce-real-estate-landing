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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/formatPrice";
import { useAuth } from "@/hooks/useAuth";
import PropertyForm from "@/components/admin/PropertyForm";
import type { Propiedad } from "@/types";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Propiedad | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Redirect if not logged in
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" className="text-cobalt">
              <rect x="4" y="8" width="12" height="20" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="20" y="4" width="12" height="24" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="10" y1="14" x2="10" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
              <line x1="26" y1="10" x2="26" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-heading text-base font-bold tracking-wider text-cobalt">
              LUCE Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-cobalt transition-colors flex items-center gap-1"
            >
              <Home size={14} /> Ver sitio
            </a>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Propiedades</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {properties.length} propiedad{properties.length !== 1 ? "es" : ""} en total
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded hover:bg-cobalt-light transition-colors"
            >
              <Plus size={16} /> Nueva Propiedad
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 mb-8 border border-border">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-5">
              {editing ? `Editando: ${editing.nombre}` : "Nueva Propiedad"}
            </h2>
            <PropertyForm
              initial={editing}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              loading={saving}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-cobalt" />
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-semibold text-foreground px-4 py-3">Propiedad</th>
                  <th className="text-left font-semibold text-foreground px-4 py-3 hidden md:table-cell">Tipo</th>
                  <th className="text-left font-semibold text-foreground px-4 py-3 hidden lg:table-cell">Zona</th>
                  <th className="text-left font-semibold text-foreground px-4 py-3">Precio</th>
                  <th className="text-left font-semibold text-foreground px-4 py-3 hidden sm:table-cell">Oferta</th>
                  <th className="text-center font-semibold text-foreground px-4 py-3">Estado</th>
                  <th className="text-right font-semibold text-foreground px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => (
                  <tr key={prop.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {prop.galeria?.find((f) => f.categoria === "portada")?.url && (
                          <img
                            src={prop.galeria.find((f) => f.categoria === "portada")!.url}
                            alt={prop.nombre}
                            className="w-10 h-10 rounded object-cover hidden sm:block"
                          />
                        )}
                        <span className="font-medium text-foreground capitalize line-clamp-1">
                          {prop.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="capitalize text-muted-foreground">{prop.tipo}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {prop.zona}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatPrice(prop.precio)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-gold">
                        {prop.tipo_oferta || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleDisponible(prop)}
                        title={prop.disponible ? "Marcar como no disponible" : "Marcar como disponible"}
                        className="inline-flex"
                      >
                        {prop.disponible ? (
                          <Eye size={16} className="text-green-600" />
                        ) : (
                          <EyeOff size={16} className="text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditing(prop);
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="p-2.5 rounded hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} className="text-cobalt" />
                        </button>

                        {deletingId === prop.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(prop.id)}
                              className="text-xs font-semibold text-destructive hover:underline px-2 py-1.5"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-muted-foreground hover:underline px-2 py-1.5"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(prop.id)}
                            className="p-2.5 rounded hover:bg-destructive/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
