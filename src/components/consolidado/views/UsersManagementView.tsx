"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { showToast } from "nextjs-toast-notify";

import { exportToExcel, type ExportColumn } from "@/lib/export";
import styles from "./styles/UsersManagementView.module.css";

type UserRole = "administrador" | "usuario" | "visualizador";

type AppUser = {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  currentRole: UserRole;
  onExportReady?: (action: (() => Promise<void>) | null) => void;
};

type NewUserForm = {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
};

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  usuario: "Usuario",
  visualizador: "Visualizador",
};

export function UsersManagementView({ currentRole, onExportReady }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<"todos" | UserRole>("todos");
  const [newUser, setNewUser] = useState<NewUserForm>({
    username: "",
    displayName: "",
    password: "",
    role: "usuario",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [passwordById, setPasswordById] = useState<Record<string, string>>({});

  const canManage = currentRole === "administrador";

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/users");
      const body = (await response.json()) as { data?: AppUser[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar los usuarios.");
      }

      setUsers(body.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los usuarios.";
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "todos") return users;
    return users.filter((item) => item.role === roleFilter);
  }, [users, roleFilter]);

  async function handleCreateUser() {
    if (!canManage) return;

    if (!newUser.username.trim() || !newUser.displayName.trim() || !newUser.password.trim()) {
      showToast.warning("Completa usuario, nombre visible y contraseña.", {
        position: "top-right",
        transition: "slideInUp",
        duration: 2600,
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUser.username.trim().toLowerCase(),
          displayName: newUser.displayName.trim(),
          password: newUser.password,
          role: newUser.role,
        }),
      });

      const body = (await response.json()) as { data?: AppUser; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo crear el usuario.");
      }

      setUsers((current) => [...current, body.data!]);
      setNewUser({ username: "", displayName: "", password: "", role: "usuario" });
      showToast.success("Usuario creado correctamente.", { position: "top-right", transition: "bounceIn", duration: 2400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(user: AppUser) {
    if (!canManage) return;

    const nextPassword = passwordById[user.id]?.trim();

    try {
      setUpdatingId(user.id);
      const response = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: user.display_name,
          role: user.role,
          isActive: user.is_active,
          ...(nextPassword ? { password: nextPassword } : {}),
        }),
      });

      const body = (await response.json()) as { data?: AppUser; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo actualizar el usuario.");
      }

      setUsers((current) => current.map((item) => (item.id === user.id ? body.data! : item)));
      setPasswordById((current) => ({ ...current, [user.id]: "" }));
      showToast.success("Usuario actualizado.", { position: "top-right", transition: "bounceIn", duration: 2200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteUser(user: AppUser) {
    if (!canManage) return;

    const confirmed = window.confirm(`¿Seguro que quieres eliminar al usuario ${user.username}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      setDeletingId(user.id);

      const response = await fetch(`/api/auth/users/${user.id}`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo eliminar el usuario.");
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      setPasswordById((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });

      showToast.success("Usuario eliminado correctamente.", { position: "top-right", transition: "bounceIn", duration: 2400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setDeletingId(null);
    }
  }

  // Keep reference to current users for export
  const usersRef = useRef(filteredUsers);
  useEffect(() => {
    usersRef.current = filteredUsers;
  }, [filteredUsers]);

  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const columns: ExportColumn[] = [
      { key: "username", header: "Usuario", width: 18 },
      { key: "display_name", header: "Nombre visible", width: 26 },
      { key: "role", header: "Rol", width: 16, formatter: (value) => ROLE_LABELS[String(value) as UserRole] ?? String(value ?? "-") },
      { key: "is_active", header: "Activo", width: 12, formatter: (value) => (value ? "Si" : "No") },
      { key: "created_at", header: "Creado", width: 16 },
      { key: "updated_at", header: "Actualizado", width: 16 },
    ];

    await exportToExcel(`Usuarios-${timestamp}`, "Usuarios", columns, usersRef.current);
  }, []);

  useEffect(() => {
    if (!onExportReady || !canManage) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [canManage, onExportReady]);

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>Gestión de Usuarios</h3>
        <div className={styles.filters}>
          <button type="button" className={`${styles.filterBtn} ${roleFilter === "todos" ? styles.filterBtnActive : ""}`} onClick={() => setRoleFilter("todos")}>Todos</button>
          {(["administrador", "usuario", "visualizador"] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              className={`${styles.filterBtn} ${roleFilter === role ? styles.filterBtnActive : ""}`}
              onClick={() => setRoleFilter(role)}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {canManage ? (
        <div className={styles.formCard}>
          <h4 className={styles.formTitle}>Crear Usuario</h4>
          <div className={styles.formGrid}>
            <input
              className={styles.input}
              placeholder="Usuario"
              value={newUser.username}
              onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="Nombre visible"
              value={newUser.displayName}
              onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))}
            />
            <select
              className={styles.input}
              value={newUser.role}
              onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as UserRole }))}
            >
              <option value="administrador">Administrador</option>
              <option value="usuario">Usuario</option>
              <option value="visualizador">Visualizador</option>
            </select>
            <div className={styles.passwordField}>
              <input
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="Contraseña"
                type={showCreatePassword ? "text" : "password"}
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowCreatePassword((current) => !current)}
                aria-label={showCreatePassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showCreatePassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showCreatePassword ? (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M10.58 10.58a2 2 0 102.83 2.83M16.68 16.67C15.16 17.5 13.59 18 12 18c-5 0-9.27-4.11-10-6 .37-.96 1.71-2.84 3.86-4.35M9.88 5.08C10.57 5.03 11.28 5 12 5c5 0 9.27 4.11 10 6-.29.74-1.13 2.03-2.5 3.22"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>
            <button className={styles.createBtn} type="button" disabled={saving} onClick={handleCreateUser}>
              {saving ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.readOnlyMsg}>Tu rol es visualizador/usuario. Solo administrador puede crear o editar usuarios.</p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre visible</th>
              <th>Rol</th>
              <th>Activo</th>
              <th>Nueva contraseña</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>
                  <input
                    className={styles.rowInput}
                    value={user.display_name}
                    disabled={!canManage}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((item) => (item.id === user.id ? { ...item, display_name: event.target.value } : item)),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    className={styles.rowInput}
                    value={user.role}
                    disabled={!canManage}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((item) => (item.id === user.id ? { ...item, role: event.target.value as UserRole } : item)),
                      )
                    }
                  >
                    <option value="administrador">Administrador</option>
                    <option value="usuario">Usuario</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={user.is_active}
                    disabled={!canManage}
                    onChange={(event) =>
                      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, is_active: event.target.checked } : item)))
                    }
                  />
                </td>
                <td>
                  <input
                    type="password"
                    className={styles.rowInput}
                    placeholder="Opcional"
                    disabled={!canManage}
                    value={passwordById[user.id] ?? ""}
                    onChange={(event) => setPasswordById((current) => ({ ...current, [user.id]: event.target.value }))}
                  />
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      disabled={!canManage || updatingId === user.id || deletingId === user.id}
                      onClick={() => handleUpdateUser(user)}
                    >
                      {updatingId === user.id ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      disabled={!canManage || deletingId === user.id || updatingId === user.id}
                      onClick={() => handleDeleteUser(user)}
                    >
                      {deletingId === user.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className={styles.empty}>Cargando usuarios...</p>}
      {!loading && filteredUsers.length === 0 && <p className={styles.empty}>No hay usuarios en este filtro.</p>}
    </div>
  );
}
