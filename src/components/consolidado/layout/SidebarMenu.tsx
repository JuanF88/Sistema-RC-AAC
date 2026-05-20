"use client";

import Image from "next/image";

import type { MenuItem, UserRole, ViewMode } from "../types";
import styles from "./styles/SidebarMenu.module.css";

type Props = {
  menuOpen: boolean;
  view: ViewMode;
  items: MenuItem[];
  currentUser: string;
  currentRole: UserRole;
  canOpenUsers: boolean;
  onToggle: () => void;
  onSelect: (view: ViewMode) => void;
  onOpenUsers: () => void;
  onLogout: () => void;
};

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  usuario: "Usuario",
  visualizador: "Visualizador",
};

function MenuIcon({ id }: { id: ViewMode }) {
  if (id === "consolidado") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.9" />
        <rect x="13" y="4" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.9" />
        <rect x="4" y="13" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.9" />
        <rect x="13" y="13" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    );
  }

  if (id === "alertas") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4a5 5 0 00-5 5v2.6c0 .78-.26 1.53-.73 2.16L5 15.5h14l-1.27-1.74a3.75 3.75 0 01-.73-2.16V9a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "registro-calificado") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "acreditacion-programas") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l2.2 2.3 3.2.5.5 3.2L20 12l-2.1 2 .5 3.2-3.2.5L12 20l-3.2-2.3-3.2-.5.5-3.2L4 12l2.1-2-.5-3.2 3.2-.5L12 4z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M9.4 12.2l1.7 1.7 3.4-3.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (id === "visitas-pares") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="16" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.9" />
        <path d="M4.5 18a4.5 4.5 0 019 0M13 18a3.6 3.6 0 017.2 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "estadisticas") {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 19a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function SidebarMenu({ menuOpen, view, items, currentUser, currentRole, canOpenUsers, onToggle, onSelect, onOpenUsers, onLogout }: Props) {
  return (
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <div className={styles.topRow}>
        <div className={`${styles.brandWrap} ${menuOpen ? styles.brandVisible : styles.brandHidden}`}>
          <Image src="/luna.png" alt="ÓRBITA Unicauca" width={26} height={26} className={styles.brandIcon} priority />
          <p className={styles.brand}>ÓRBITA Unicauca</p>
        </div>
        <button type="button" onClick={onToggle} className={styles.menuToggle} aria-label="Abrir o cerrar menu">
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => {
          const active = view === item.id;
          const collapsedTitle = menuOpen ? undefined : item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              aria-label={collapsedTitle ?? item.label}
              data-tooltip={item.label}
            >
              <span className={styles.menuIcon}>
                <MenuIcon id={item.id} />
              </span>
              <span className={`${styles.textWrap} ${menuOpen ? styles.textVisible : styles.textHidden}`}>
                <span className={styles.title}>{item.label}</span>
                <span className={`${styles.subtitle} ${active ? styles.subtitleActive : ""}`}>{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {canOpenUsers && (
        <div className={styles.footerActions}>
          <button
            type="button"
            className={`${styles.settingsButton} ${view === "usuarios" ? styles.settingsButtonActive : ""}`}
            onClick={onOpenUsers}
            aria-label="Abrir configuracion"
            data-tooltip="Configuracion"
          >
            <span className={styles.settingsIcon}>⚙</span>
          </button>
        </div>
      )}

      <div className={styles.footer}>
        <div className={`${styles.footerUser} ${menuOpen ? styles.textVisible : styles.textHidden}`}>
          <span className={styles.footerUserName}>{currentUser}</span>
          <span className={styles.footerUserRole}>{ROLE_LABELS[currentRole]}</span>
        </div>
        <button type="button" className={styles.logoutButton} onClick={onLogout} title="Cerrar sesión">
          <span className={styles.menuIcon}>
            <svg className={styles.menuIconSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M10 8l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 12H4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <span className={`${styles.textWrap} ${menuOpen ? styles.textVisible : styles.textHidden}`}>
            <span className={styles.title}>Cerrar sesión</span>
            <span className={styles.subtitle}>Salir del sistema</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
