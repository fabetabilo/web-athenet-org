# Documentacion de Desarrollo — Athenet Web

Este directorio contiene las especificaciones tecnicas, guias de componentes compartidos (`src/app/shared/components/`) y directrices de diseno para el equipo de desarrollo.

---

## Arquitectura: Angular Material + Tokens de Athenet

La capa de interfaz combina la logica funcional de Angular Material con el sistema de diseno centralizado de Athenet:

### 1. Angular Material (Capa Funcional)
* **Datos y Colecciones:** `MatTableDataSource` gestiona el estado reactivo, la integracion con `MatSort` y los predicados multicriterio para filtrado.
* **Overlays y Accesibilidad:** `MatMenuModule` y el CDK gestionan el posicionamiento dinamico, eventos de cierre (`backdropClick`, tecla `Esc`) y foco accesible (WAI-ARIA).
* **Iconos y Controles Base:** `MatIconModule` y `MatButtonModule` estandarizan la iconografia y los botones de accion.

### 2. Tokens Globales (Capa de Presentacion)
* **Variables CSS (`src/styles/_tokens.scss`):** La apariencia visual se desacopla de los temas por defecto de Material mediante variables CSS nativas (`--table-*`, `--pill-*`, `--color-*`).
* **Componentes Propios:** Cuando un control de Material introduce sobrecarga visual o de peso para vistas de alta densidad (como `mat-chip` en filas de tablas), se implementan componentes ligeros independientes (ej. `<app-pill>`).

---

## Componentes Compartidos

| Componente | Selector | Documentacion | Descripcion |
| :--- | :--- | :--- | :--- |
| Tabla | `<app-table>` | [comp-table.md](comp-table.md) | Tabla responsiva con ordenamiento, filtros en cabecera y proyeccion de celdas. |
| Pildora | `<app-pill>` | [comp-pill.md](comp-pill.md) | Indicador visual semantico para estados, tags con icono o etiquetas simples. |

---

## Directrices de Desarrollo

1. **Uso Exclusivo de Tokens:**
   No utilizar valores hexadecimales directos en archivos SCSS de componentes. Referenciar siempre variables de diseno:
   ```scss
   // Incorrecto
   color: #00C8FF;

   // Correcto
   color: var(--color-primary);
   ```

2. **Reutilizacion de Componentes:**
   Utilizar los componentes de `shared/components/` para mantener consistencia transversal entre modulos (`admin`, `director`, etc.). Extender el componente compartido si se requiere un nuevo comportamiento generalizable.

3. **Presupuesto de Estilos (Budget):**
   Angular CLI limita el tamano de SCSS por componente a 4 kB (`maximumWarning`). Evitar anidamientos redundantes y reutilizar clases utilitarias del layout global (`src/styles/_layout.scss`).

4. **Arquitectura Standalone:**
   Todo nuevo componente debe ser standalone e importar unicamente los modulos necesarios para su ejecucion.
