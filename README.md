# Sistema RC AAC

Dashboard inicial de Consolidado (Registro Calificado y Acreditacion) para Unicauca, con carga de datos desde Excel y lectura desde Supabase.

## Ejecutar local

```bash
npm install
npm run dev
```

## Crear tabla en Supabase

1. Abre SQL Editor en tu proyecto Supabase.
2. Ejecuta el script [supabase/001_consolidado_schema.sql](supabase/001_consolidado_schema.sql).

## Cargar datos del Excel a Supabase

Con `.env.local` configurado (URL + service role key):

```bash
npm run sync:consolidado
```

Este comando:

- lee [Consolidado-RC AAC  GENERAL (3).xlsx](Consolidado-RC AAC  GENERAL (3).xlsx)
- transforma la hoja `Consolidado`
- hace `upsert` en `public.consolidado_programas`

## Build de produccion

```bash
npm run build
```
