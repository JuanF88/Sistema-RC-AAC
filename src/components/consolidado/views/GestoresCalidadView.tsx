"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "nextjs-toast-notify";

import { ADMIN_UNIT_OPTIONS, FACULTY_OPTIONS } from "../constants";
import styles from "./styles/GestoresCalidadView.module.css";

type QualityManager = {
  id: string;
  faculty: string;
  title: string | null;
  full_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  phone: string | null;
  office: string | null;
  extension: string | null;
  period: string | null;
  official_letter: string | null;
  is_active: boolean;
};

type ManagerForm = {
  faculty: string;
  title: string;
  fullName: string;
  institutionalEmail: string;
  personalEmail: string;
  phone: string;
  office: string;
  extension: string;
  period: string;
  officialLetter: string;
};

const EMPTY_FORM: ManagerForm = {
  faculty: "",
  title: "",
  fullName: "",
  institutionalEmail: "",
  personalEmail: "",
  phone: "",
  office: "",
  extension: "",
  period: "",
  officialLetter: "",
};

function toForm(manager: QualityManager): ManagerForm {
  return {
    faculty: manager.faculty,
    title: manager.title ?? "",
    fullName: manager.full_name,
    institutionalEmail: manager.institutional_email ?? "",
    personalEmail: manager.personal_email ?? "",
    phone: manager.phone ?? "",
    office: manager.office ?? "",
    extension: manager.extension ?? "",
    period: manager.period ?? "",
    officialLetter: manager.official_letter ?? "",
  };
}

export function GestoresCalidadView() {
  const [managers, setManagers] = useState<QualityManager[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ManagerForm>(EMPTY_FORM);

  const activeCount = useMemo(() => managers.filter((manager) => manager.is_active).length, [managers]);

  // Solo las facultades reciben alertas: son las unicas que aparecen como
  // faculty de un programa. La copia va al correo institucional, asi que una
  // facultad cuyo gestor activo no lo tenga registrado tampoco recibe copia y
  // se avisa igual que si no tuviera gestor.
  const facultiesWithoutManager = useMemo(() => {
    const covered = new Set(
      managers
        .filter((manager) => manager.is_active && manager.institutional_email)
        .map((manager) => manager.faculty),
    );
    return FACULTY_OPTIONS.filter((faculty) => !covered.has(faculty));
  }, [managers]);

  const groups = useMemo(() => {
    const map = new Map<string, QualityManager[]>();
    for (const manager of managers) {
      const current = map.get(manager.faculty) ?? [];
      current.push(manager);
      map.set(manager.faculty, current);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [managers]);

  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gestores-calidad", { cache: "no-store" });
      const body = (await response.json()) as { data?: QualityManager[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar los gestores de calidad.");
      }
      setManagers(body.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los gestores de calidad.";
      showToast.error(message, { position: "top-right", duration: 2800 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  const updateField = useCallback((field: keyof ManagerForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleStartEdit = useCallback((manager: QualityManager) => {
    setEditingId(manager.id);
    setForm(toForm(manager));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.faculty.trim()) {
      showToast.warning("Selecciona la facultad o dependencia.", { position: "top-right", duration: 2200 });
      return;
    }
    if (!form.fullName.trim()) {
      showToast.warning("Ingresa el nombre del gestor.", { position: "top-right", duration: 2200 });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/gestores-calidad/${encodeURIComponent(editingId)}` : "/api/gestores-calidad",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo guardar el gestor de calidad.");
      }

      handleCancelEdit();
      await loadManagers();
      showToast.success(editingId ? "Gestor actualizado." : "Gestor agregado.", {
        position: "top-right",
        duration: 2200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el gestor de calidad.";
      showToast.error(message, { position: "top-right", duration: 2800 });
    } finally {
      setSaving(false);
    }
  }, [editingId, form, handleCancelEdit, loadManagers]);

  const handleToggle = useCallback(
    async (manager: QualityManager) => {
      setSaving(true);
      try {
        const response = await fetch(`/api/gestores-calidad/${encodeURIComponent(manager.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !manager.is_active }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo actualizar el gestor.");
        }

        await loadManagers();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar el gestor.";
        showToast.error(message, { position: "top-right", duration: 2800 });
      } finally {
        setSaving(false);
      }
    },
    [loadManagers],
  );

  const handleDelete = useCallback(
    async (manager: QualityManager) => {
      const confirmed = window.confirm(`¿Eliminar a ${manager.full_name} del directorio de gestores?`);
      if (!confirmed) return;

      setSaving(true);
      try {
        const response = await fetch(`/api/gestores-calidad/${encodeURIComponent(manager.id)}`, { method: "DELETE" });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo eliminar el gestor.");
        }

        if (editingId === manager.id) handleCancelEdit();
        await loadManagers();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar el gestor.";
        showToast.error(message, { position: "top-right", duration: 2800 });
      } finally {
        setSaving(false);
      }
    },
    [editingId, handleCancelEdit, loadManagers],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.headerCard}>
        <h2 className={styles.title}>Gestores de Calidad</h2>
        <p className={styles.description}>
          Directorio de gestores por facultad y dependencia. Cuando se envia una alerta de renovacion a un programa, el
          gestor activo de su facultad queda en copia en su correo institucional y su nombre aparece en la informacion
          del proceso. El correo personal se guarda solo como dato de contacto: no recibe alertas.
        </p>
        <div className={styles.statsRow}>
          <span className={styles.statPill}>Gestores activos: {activeCount}</span>
          <span className={styles.statPill}>Registros: {managers.length}</span>
          {facultiesWithoutManager.length > 0 ? (
            <span className={styles.warnPill}>
              Facultades sin gestor activo: {facultiesWithoutManager.length}
            </span>
          ) : (
            <span className={styles.okPill}>Todas las facultades tienen gestor</span>
          )}
        </div>
        {facultiesWithoutManager.length > 0 ? (
          <p className={styles.warnText}>
            Sin copia al gestor: {facultiesWithoutManager.join(" | ")}
          </p>
        ) : null}
      </div>

      <div className={styles.formCard}>
        <h3 className={styles.cardTitle}>{editingId ? "Editar gestor" : "Agregar gestor"}</h3>
        <div className={styles.formGrid}>
          <label className={`${styles.fieldLabel} ${styles.fieldWide}`}>
            <span>Facultad o dependencia</span>
            <select
              className={styles.input}
              value={form.faculty}
              onChange={(event) => updateField("faculty", event.target.value)}
              disabled={saving}
            >
              <option value="">Selecciona...</option>
              <optgroup label="Facultades">
                {FACULTY_OPTIONS.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Otras dependencias">
                {ADMIN_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className={styles.fieldLabel}>
            <span>Titulo</span>
            <input
              type="text"
              className={styles.input}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Magister / Universitaria"
              disabled={saving}
            />
          </label>

          <label className={`${styles.fieldLabel} ${styles.fieldWide}`}>
            <span>Gestor de calidad</span>
            <input
              type="text"
              className={styles.input}
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Nombre completo"
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Correo institucional</span>
            <input
              type="email"
              className={styles.input}
              value={form.institutionalEmail}
              onChange={(event) => updateField("institutionalEmail", event.target.value)}
              placeholder="calidad@unicauca.edu.co"
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Correo personal</span>
            <input
              type="email"
              className={styles.input}
              value={form.personalEmail}
              onChange={(event) => updateField("personalEmail", event.target.value)}
              placeholder="usuario@unicauca.edu.co"
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Celular</span>
            <input
              type="text"
              className={styles.input}
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Oficina</span>
            <input
              type="text"
              className={styles.input}
              value={form.office}
              onChange={(event) => updateField("office", event.target.value)}
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Extension</span>
            <input
              type="text"
              className={styles.input}
              value={form.extension}
              onChange={(event) => updateField("extension", event.target.value)}
              disabled={saving}
            />
          </label>

          <label className={styles.fieldLabel}>
            <span>Periodo</span>
            <input
              type="text"
              className={styles.input}
              value={form.period}
              onChange={(event) => updateField("period", event.target.value)}
              placeholder="Ano 2026"
              disabled={saving}
            />
          </label>

          <label className={`${styles.fieldLabel} ${styles.fieldWide}`}>
            <span>Oficio</span>
            <input
              type="text"
              className={styles.input}
              value={form.officialLetter}
              onChange={(event) => updateField("officialLetter", event.target.value)}
              placeholder="Nombre del oficio de designacion"
              disabled={saving}
            />
          </label>
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.primaryButton} onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar gestor"}
          </button>
          {editingId ? (
            <button type="button" className={styles.secondaryButton} onClick={handleCancelEdit} disabled={saving}>
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.listCard}>
        <h3 className={styles.cardTitle}>Directorio</h3>
        {loading ? (
          <p className={styles.empty}>Cargando gestores...</p>
        ) : managers.length === 0 ? (
          <p className={styles.empty}>No hay gestores registrados.</p>
        ) : (
          <div className={styles.groups}>
            {groups.map(([faculty, rows]) => (
              <div key={faculty} className={styles.group}>
                <h4 className={styles.groupTitle}>{faculty}</h4>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Gestor de calidad</th>
                        <th>Correo institucional</th>
                        <th>Celular</th>
                        <th>Oficina</th>
                        <th>Ext.</th>
                        <th>Correo personal</th>
                        <th>Periodo</th>
                        <th>Oficio</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((manager) => (
                        <tr key={manager.id} className={manager.is_active ? undefined : styles.inactiveRow}>
                          <td>
                            <strong>{manager.full_name}</strong>
                            {manager.title ? <span className={styles.subText}>{manager.title}</span> : null}
                            {manager.is_active ? null : <span className={styles.inactiveTag}>Inactivo</span>}
                          </td>
                          <td>{manager.institutional_email ?? "-"}</td>
                          <td>{manager.phone ?? "-"}</td>
                          <td>{manager.office ?? "-"}</td>
                          <td>{manager.extension ?? "-"}</td>
                          <td>{manager.personal_email ?? "-"}</td>
                          <td>{manager.period ?? "-"}</td>
                          <td>{manager.official_letter ?? "-"}</td>
                          <td>
                            <div className={styles.itemActions}>
                              <button
                                type="button"
                                className={styles.editButton}
                                onClick={() => handleStartEdit(manager)}
                                disabled={saving}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={manager.is_active ? styles.deactivateButton : styles.activateButton}
                                onClick={() => void handleToggle(manager)}
                                disabled={saving}
                              >
                                {manager.is_active ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={() => void handleDelete(manager)}
                                disabled={saving}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
