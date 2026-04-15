import type { ReactNode } from "react";

import styles from "./styles/FiltersBar.module.css";

type Props = {
  search: string;
  faculty: string;
  faculties: readonly string[];
  modality: string;
  level: string;
  acreditableFilter: string;
  accreditedFilter: string;
  rcState: string;
  modalities: string[];
  levels: string[];
  onSearch: (value: string) => void;
  onFacultyChange: (value: string) => void;
  onModalityChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onAcreditableFilterChange: (value: string) => void;
  onAccreditedFilterChange: (value: string) => void;
  onRcStateChange: (value: string) => void;
  onCreateProgram: () => void;
  showModality?: boolean;
  showAccreditationState?: boolean;
  showRcState?: boolean;
  showCreateProgram?: boolean;
  rightContent?: ReactNode;
  createDisabled?: boolean;
};

export function FiltersBar({
  search,
  faculty,
  faculties,
  modality,
  level,
  acreditableFilter,
  accreditedFilter,
  rcState,
  modalities,
  levels,
  onSearch,
  onFacultyChange,
  onModalityChange,
  onLevelChange,
  onAcreditableFilterChange,
  onAccreditedFilterChange,
  onRcStateChange,
  onCreateProgram,
  showModality = true,
  showAccreditationState = true,
  showRcState = true,
  showCreateProgram = true,
  rightContent,
  createDisabled = false,
}: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.inputs}>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className={styles.input}
          placeholder="Buscar por programa, codigo o SNIES"
        />
        <select value={faculty} onChange={(event) => onFacultyChange(event.target.value)} className={styles.select}>
          <option value="Todas">Todas las facultades</option>
          {faculties.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {showModality && (
          <select value={modality} onChange={(event) => onModalityChange(event.target.value)} className={styles.select}>
            <option value="Todas">Todas las modalidades</option>
            {modalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        <select value={level} onChange={(event) => onLevelChange(event.target.value)} className={styles.select}>
          <option value="Todos">Todos los niveles</option>
          {levels.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {showAccreditationState && (
          <select value={acreditableFilter} onChange={(event) => onAcreditableFilterChange(event.target.value)} className={styles.select}>
            <option value="Todos">Acreditable</option>
            <option value="Si">Si</option>
            <option value="No">No</option>
          </select>
        )}
        {showAccreditationState && (
          <select value={accreditedFilter} onChange={(event) => onAccreditedFilterChange(event.target.value)} className={styles.select}>
            <option value="Todos">Acreditado</option>
            <option value="Si">Si</option>
            <option value="No">No</option>
          </select>
        )}
        {showRcState && (
          <select value={rcState} onChange={(event) => onRcStateChange(event.target.value)} className={styles.select}>
            <option value="Todos">Estado RC</option>
            <option value="vigente">Vigente</option>
            <option value="vencido">Vencido</option>
            <option value="sin-definir">Sin definir</option>
          </select>
        )}
      </div>
      <div className={styles.actions}>
        {rightContent}
        {showCreateProgram && (
          <button type="button" className={styles.createButton} onClick={onCreateProgram} disabled={createDisabled}>
            Nuevo programa
          </button>
        )}
      </div>
    </div>
  );
}
