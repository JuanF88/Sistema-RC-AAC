import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import styles from "./styles/FiltersBar.module.css";

type Props = {
  search: string;
  faculty: string;
  faculties: readonly string[];
  modality: string;
  level: string;
  locationFilter: string[];
  regionalizedFilter: string;
  acreditableFilter: string;
  accreditedFilter: string;
  programStatusFilter: string;
  rcState: string;
  rcStart: string;
  rcEnd: string;
  aacStart: string;
  aacEnd: string;
  modalities: string[];
  levels: string[];
  locations: string[];
  onSearch: (value: string) => void;
  onFacultyChange: (value: string) => void;
  onModalityChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onLocationFilterChange: (value: string[]) => void;
  onRegionalizedFilterChange: (value: string) => void;
  onAcreditableFilterChange: (value: string) => void;
  onAccreditedFilterChange: (value: string) => void;
  onProgramStatusFilterChange: (value: string) => void;
  onRcStateChange: (value: string) => void;
  onRcStartChange: (value: string) => void;
  onRcEndChange: (value: string) => void;
  onAacStartChange: (value: string) => void;
  onAacEndChange: (value: string) => void;
  onCreateProgram: () => void;
  showModality?: boolean;
  showLocationFilter?: boolean;
  showRegionalizedFilter?: boolean;
  showAccreditationState?: boolean;
  showProgramStatus?: boolean;
  showRcState?: boolean;
  showDateFilters?: boolean;
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
  locationFilter,
  regionalizedFilter,
  acreditableFilter,
  accreditedFilter,
  programStatusFilter,
  rcState,
  rcStart,
  rcEnd,
  aacStart,
  aacEnd,
  modalities,
  levels,
  locations,
  onSearch,
  onFacultyChange,
  onModalityChange,
  onLevelChange,
  onLocationFilterChange,
  onRegionalizedFilterChange,
  onAcreditableFilterChange,
  onAccreditedFilterChange,
  onProgramStatusFilterChange,
  onRcStateChange,
  onRcStartChange,
  onRcEndChange,
  onAacStartChange,
  onAacEndChange,
  onCreateProgram,
  showModality = true,
  showLocationFilter = true,
  showRegionalizedFilter = true,
  showAccreditationState = true,
  showProgramStatus = true,
  showRcState = true,
  showDateFilters = false,
  showCreateProgram = true,
  rightContent,
  createDisabled = false,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const locationSummary =
    locationFilter.length === 0
      ? "Lugar de desarrollo"
      : locationFilter.length === locations.length
        ? "Todos los lugares"
        : `${locationFilter.length} seleccionados`;

  const locationFilterRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const details = locationFilterRef.current;
      if (!details || !details.open) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!details.contains(target)) {
        details.open = false;
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleToggleLocation = (value: string) => {
    if (locationFilter.includes(value)) {
      onLocationFilterChange(locationFilter.filter((item) => item !== value));
      return;
    }
    onLocationFilterChange([...locationFilter, value]);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (faculty !== "Todas") count += 1;
    if (showModality && modality !== "Todas") count += 1;
    if (level !== "Todos") count += 1;
    if (showLocationFilter && locationFilter.length > 0) count += 1;
    if (showRegionalizedFilter && regionalizedFilter !== "Todos") count += 1;
    if (showProgramStatus && programStatusFilter !== "Todos") count += 1;
    if (showAccreditationState && acreditableFilter !== "Todos") count += 1;
    if (showAccreditationState && accreditedFilter !== "Todos") count += 1;
    if (showRcState && rcState !== "Todos") count += 1;
    if (showDateFilters && rcStart) count += 1;
    if (showDateFilters && rcEnd) count += 1;
    if (showDateFilters && aacStart) count += 1;
    if (showDateFilters && aacEnd) count += 1;
    return count;
  }, [
    search,
    faculty,
    showModality,
    modality,
    level,
    showLocationFilter,
    locationFilter,
    showRegionalizedFilter,
    regionalizedFilter,
    showProgramStatus,
    programStatusFilter,
    showAccreditationState,
    acreditableFilter,
    accreditedFilter,
    showRcState,
    rcState,
    showDateFilters,
    rcStart,
    rcEnd,
    aacStart,
    aacEnd,
  ]);

  return (
    <div className={styles.row}>
      <div className={styles.primaryRow}>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className={`${styles.input} ${styles.searchInput}`}
          placeholder="Buscar por programa, codigo o SNIES"
        />
        <button
          type="button"
          className={styles.toggleFiltersButton}
          onClick={() => setShowFilters((value) => !value)}
          aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        >
          <img src="/filtros.ico" alt="" className={styles.toggleIconImage} aria-hidden="true" />
          <span>{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</span>
          {!showFilters && activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
        </button>
        <div className={styles.actions}>
          {rightContent}
          {showCreateProgram && (
            <button type="button" className={styles.createButton} onClick={onCreateProgram} disabled={createDisabled}>
              Nuevo programa
            </button>
          )}
        </div>
      </div>

      {showFilters && <div className={styles.inputs}>
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
        {showLocationFilter && (
          <details className={styles.multiFilter} ref={locationFilterRef}>
            <summary className={styles.multiFilterTrigger}>{locationSummary}</summary>
            <div className={styles.multiFilterPanel}>
              <div className={styles.multiFilterActions}>
                <button type="button" className={styles.multiActionBtn} onClick={() => onLocationFilterChange(locations)}>
                  Seleccionar todos
                </button>
                <button type="button" className={styles.multiActionBtn} onClick={() => onLocationFilterChange([])}>
                  Limpiar
                </button>
              </div>
              <div className={styles.multiFilterList}>
                {locations.map((name) => (
                  <label key={name} className={styles.multiFilterItem}>
                    <input
                      type="checkbox"
                      checked={locationFilter.includes(name)}
                      onChange={() => handleToggleLocation(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        )}
        {showRegionalizedFilter && (
          <select value={regionalizedFilter} onChange={(event) => onRegionalizedFilterChange(event.target.value)} className={styles.select}>
            <option value="Todos">Regionalización</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
            <option value="Ampliación de lugar de desarrollo">Ampliación de lugar de desarrollo</option>
          </select>
        )}
        {showProgramStatus && (
          <select value={programStatusFilter} onChange={(event) => onProgramStatusFilterChange(event.target.value)} className={styles.select}>
            <option value="Activos">Programas activos</option>
            <option value="Inactivos">Programas inactivos</option>
            <option value="Todos">Todos los programas</option>
          </select>
        )}
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
        {showDateFilters && (
          <div className={styles.dateRow}>
            <div className={styles.dateGroup}>
              <span className={styles.dateLabel}>Inicio RC</span>
              <div className={styles.dateFields}>
                <input
                  type="date"
                  value={rcStart}
                  onChange={(event) => onRcStartChange(event.target.value)}
                  className={styles.input}
                  aria-label="Inicio RC"
                />
              </div>
            </div>
            <div className={styles.dateGroup}>
              <span className={styles.dateLabel}>Fin RC</span>
              <div className={styles.dateFields}>
                <input
                  type="date"
                  value={rcEnd}
                  onChange={(event) => onRcEndChange(event.target.value)}
                  className={styles.input}
                  aria-label="Fin RC"
                />
              </div>
            </div>
            <div className={styles.dateGroup}>
              <span className={styles.dateLabel}>Inicio AAC</span>
              <div className={styles.dateFields}>
                <input
                  type="date"
                  value={aacStart}
                  onChange={(event) => onAacStartChange(event.target.value)}
                  className={styles.input}
                  aria-label="Inicio AAC"
                />
              </div>
            </div>
            <div className={styles.dateGroup}>
              <span className={styles.dateLabel}>Fin AAC</span>
              <div className={styles.dateFields}>
                <input
                  type="date"
                  value={aacEnd}
                  onChange={(event) => onAacEndChange(event.target.value)}
                  className={styles.input}
                  aria-label="Fin AAC"
                />
              </div>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
