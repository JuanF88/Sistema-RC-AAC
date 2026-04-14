import styles from "./styles/FiltersBar.module.css";

type Props = {
  search: string;
  faculty: string;
  faculties: readonly string[];
  modality: string;
  level: string;
  accreditationState: string;
  rcState: string;
  modalities: string[];
  levels: string[];
  onSearch: (value: string) => void;
  onFacultyChange: (value: string) => void;
  onModalityChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onAccreditationStateChange: (value: string) => void;
  onRcStateChange: (value: string) => void;
  onCreateProgram: () => void;
  createDisabled?: boolean;
};

export function FiltersBar({
  search,
  faculty,
  faculties,
  modality,
  level,
  accreditationState,
  rcState,
  modalities,
  levels,
  onSearch,
  onFacultyChange,
  onModalityChange,
  onLevelChange,
  onAccreditationStateChange,
  onRcStateChange,
  onCreateProgram,
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
        <select value={modality} onChange={(event) => onModalityChange(event.target.value)} className={styles.select}>
          <option value="Todas">Todas las modalidades</option>
          {modalities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={level} onChange={(event) => onLevelChange(event.target.value)} className={styles.select}>
          <option value="Todos">Todos los niveles</option>
          {levels.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={accreditationState} onChange={(event) => onAccreditationStateChange(event.target.value)} className={styles.select}>
          <option value="Todos">Estado AAC</option>
          <option value="acreditado">Acreditado</option>
          <option value="acreditable">Acreditable</option>
          <option value="proceso">En proceso AAC</option>
          <option value="ninguno">Sin acreditacion</option>
        </select>
        <select value={rcState} onChange={(event) => onRcStateChange(event.target.value)} className={styles.select}>
          <option value="Todos">Estado RC</option>
          <option value="vigente">Vigente</option>
          <option value="vencido">Vencido</option>
          <option value="sin-definir">Sin definir</option>
        </select>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.createButton} onClick={onCreateProgram} disabled={createDisabled}>
          Nuevo programa
        </button>
      </div>
    </div>
  );
}
