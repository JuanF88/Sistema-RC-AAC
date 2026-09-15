import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import styles from "./styles/FiltersBar.module.css";

type Props = {
  search: string;
  faculty: string[];
  faculties: readonly string[];
  modality: string[];
  level: string[];
  locationFilter: string[];
  regionalizedFilter: string[];
  acreditableFilter: string[];
  accreditedFilter: string[];
  programStatusFilter: string[];
  rcState: string[];
  rcStart: string;
  rcEnd: string;
  rcValidAt: string;
  aacStart: string;
  aacEnd: string;
  modalities: string[];
  levels: string[];
  locations: string[];
  onSearch: (value: string) => void;
  onFacultyChange: (value: string[]) => void;
  onModalityChange: (value: string[]) => void;
  onLevelChange: (value: string[]) => void;
  onLocationFilterChange: (value: string[]) => void;
  onRegionalizedFilterChange: (value: string[]) => void;
  onAcreditableFilterChange: (value: string[]) => void;
  onAccreditedFilterChange: (value: string[]) => void;
  onProgramStatusFilterChange: (value: string[]) => void;
  onRcStateChange: (value: string[]) => void;
  onRcStartChange: (value: string) => void;
  onRcEndChange: (value: string) => void;
  onRcValidAtChange: (value: string) => void;
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

type FilterOption = {
  value: string;
  label: string;
};

// Opciones fijas: el valor es lo que compara el filtrado del tablero, la
// etiqueta es lo que ve el usuario.
const REGIONALIZED_OPTIONS: FilterOption[] = [
  { value: "Si", label: "Sí" },
  { value: "No", label: "No" },
  { value: "Ampliación de lugar de desarrollo", label: "Ampliación de lugar de desarrollo" },
];

const PROGRAM_STATUS_OPTIONS: FilterOption[] = [
  { value: "Activos", label: "Programas activos" },
  { value: "Inactivos", label: "Programas inactivos" },
];

const YES_NO_OPTIONS: FilterOption[] = [
  { value: "Si", label: "Sí" },
  { value: "No", label: "No" },
];

const RC_STATE_OPTIONS: FilterOption[] = [
  { value: "vigente", label: "Vigente" },
  { value: "vencido", label: "Vencido" },
  { value: "sin-definir", label: "Sin definir" },
];

function toOptions(values: readonly string[]): FilterOption[] {
  return values.map((value) => ({ value, label: value }));
}

type MultiSelectFilterProps = {
  /** Texto del disparador cuando no hay nada seleccionado (sin filtro). */
  placeholder: string;
  /** Texto del disparador cuando estan todas las opciones marcadas. */
  allLabel: string;
  options: FilterOption[];
  selected: string[];
  onChange: (value: string[]) => void;
};

/**
 * Desplegable con casillas para elegir varias opciones a la vez. Sin nada
 * marcado el filtro no restringe: se muestran todos los programas.
 */
function MultiSelectFilter({ placeholder, allLabel, options, selected, onChange }: MultiSelectFilterProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Un clic fuera cierra el panel, igual que un select nativo.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const details = detailsRef.current;
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

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  // Con una sola opcion marcada se muestra su nombre; con varias, cuantas.
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? allLabel
        : selected.length === 1
          ? (options.find((option) => option.value === selected[0])?.label ?? placeholder)
          : `${selected.length} seleccionados`;

  return (
    <details className={styles.multiFilter} ref={detailsRef}>
      <summary
        className={`${styles.multiFilterTrigger} ${selected.length > 0 ? styles.multiFilterTriggerActive : ""}`}
        title={summary}
      >
        <span className={styles.multiFilterSummary}>{summary}</span>
      </summary>
      <div className={styles.multiFilterPanel}>
        <div className={styles.multiFilterActions}>
          <button
            type="button"
            className={styles.multiActionBtn}
            onClick={() => onChange(options.map((option) => option.value))}
          >
            Seleccionar todos
          </button>
          <button type="button" className={styles.multiActionBtn} onClick={() => onChange([])}>
            Limpiar
          </button>
        </div>
        <div className={styles.multiFilterList}>
          {options.map((option) => (
            <label key={option.value} className={styles.multiFilterItem}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => handleToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

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
  rcValidAt,
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
  onRcValidAtChange,
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

  const facultyOptions = useMemo(() => toOptions(faculties), [faculties]);
  const modalityOptions = useMemo(() => toOptions(modalities), [modalities]);
  const levelOptions = useMemo(() => toOptions(levels), [levels]);
  const locationOptions = useMemo(() => toOptions(locations), [locations]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (faculty.length > 0) count += 1;
    if (showModality && modality.length > 0) count += 1;
    if (level.length > 0) count += 1;
    if (showLocationFilter && locationFilter.length > 0) count += 1;
    if (showRegionalizedFilter && regionalizedFilter.length > 0) count += 1;
    if (showProgramStatus && programStatusFilter.length > 0) count += 1;
    if (showAccreditationState && acreditableFilter.length > 0) count += 1;
    if (showAccreditationState && accreditedFilter.length > 0) count += 1;
    if (showRcState && rcState.length > 0) count += 1;
    if (showDateFilters && rcStart) count += 1;
    if (showDateFilters && rcEnd) count += 1;
    if (showDateFilters && rcValidAt) count += 1;
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
    rcValidAt,
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
          placeholder="Buscar por programa, código o SNIES"
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
        <MultiSelectFilter
          placeholder="Facultad"
          allLabel="Todas las facultades"
          options={facultyOptions}
          selected={faculty}
          onChange={onFacultyChange}
        />
        {showModality && (
          <MultiSelectFilter
            placeholder="Modalidad"
            allLabel="Todas las modalidades"
            options={modalityOptions}
            selected={modality}
            onChange={onModalityChange}
          />
        )}
        <MultiSelectFilter
          placeholder="Nivel"
          allLabel="Todos los niveles"
          options={levelOptions}
          selected={level}
          onChange={onLevelChange}
        />
        {showLocationFilter && (
          <MultiSelectFilter
            placeholder="Lugar de desarrollo"
            allLabel="Todos los lugares"
            options={locationOptions}
            selected={locationFilter}
            onChange={onLocationFilterChange}
          />
        )}
        {showRegionalizedFilter && (
          <MultiSelectFilter
            placeholder="Regionalización"
            allLabel="Toda la regionalización"
            options={REGIONALIZED_OPTIONS}
            selected={regionalizedFilter}
            onChange={onRegionalizedFilterChange}
          />
        )}
        {showProgramStatus && (
          <MultiSelectFilter
            placeholder="Estado del programa"
            allLabel="Todos los programas"
            options={PROGRAM_STATUS_OPTIONS}
            selected={programStatusFilter}
            onChange={onProgramStatusFilterChange}
          />
        )}
        {showAccreditationState && (
          <MultiSelectFilter
            placeholder="Acreditable"
            allLabel="Acreditable: Sí y No"
            options={YES_NO_OPTIONS}
            selected={acreditableFilter}
            onChange={onAcreditableFilterChange}
          />
        )}
        {showAccreditationState && (
          <MultiSelectFilter
            placeholder="Acreditado"
            allLabel="Acreditado: Sí y No"
            options={YES_NO_OPTIONS}
            selected={accreditedFilter}
            onChange={onAccreditedFilterChange}
          />
        )}
        {showRcState && (
          <MultiSelectFilter
            placeholder="Estado RC"
            allLabel="Todos los estados RC"
            options={RC_STATE_OPTIONS}
            selected={rcState}
            onChange={onRcStateChange}
          />
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
            <div className={styles.dateGroup}>
              <span className={styles.dateLabel}>RC vigente a</span>
              <div className={styles.dateFields}>
                <input
                  type="date"
                  value={rcValidAt}
                  onChange={(event) => onRcValidAtChange(event.target.value)}
                  className={styles.input}
                  aria-label="RC vigente a"
                />
              </div>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
