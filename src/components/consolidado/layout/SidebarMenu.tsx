"use client";

import type { MenuItem, ViewMode } from "../types";
import styles from "./styles/SidebarMenu.module.css";

type Props = {
  menuOpen: boolean;
  view: ViewMode;
  items: MenuItem[];
  onToggle: () => void;
  onSelect: (view: ViewMode) => void;
};

export function SidebarMenu({ menuOpen, view, items, onToggle, onSelect }: Props) {
  return (
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <div className={styles.topRow}>
        <p className={`${styles.brand} ${menuOpen ? styles.brandVisible : styles.brandHidden}`}>SIAC UNICAUCA</p>
        <button type="button" onClick={onToggle} className={styles.menuToggle} aria-label="Abrir o cerrar menu">
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <span className={styles.icon}>{item.label.slice(0, 1)}</span>
              <span className={`${styles.textWrap} ${menuOpen ? styles.textVisible : styles.textHidden}`}>
                <span className={styles.title}>{item.label}</span>
                <span className={`${styles.subtitle} ${active ? styles.subtitleActive : ""}`}>{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
