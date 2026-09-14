# Componente: `<app-table>` (TableComponent)

Tabla de datos genérica, componible y resiliente ante APIs asíncronas basada en Angular Material (`MatTableModule`, `MatSortModule`, `MatMenuModule`) y tokens CSS de Athenet. Diseñada para ser **100% agnóstica a roles** y consumible de manera universal por cualquier módulo actual o futuro.

---

## Características

* **Configuración tipada:** Definición de columnas mediante `TableColumn<T>[]`.
* **Propiedades anidadas:** Soporte nativo para notación de punto (`key: 'categoria.nombre'`) en celdas por defecto, ordenamiento y filtrado.
* **Ordenamiento:** Integración con `MatSort` (`sortable: true`) con soporte para cadenas, números, fechas y booleanos.
* **Filtros en cabecera:** Menús desplegables (`mat-menu`) con búsqueda por texto (tolerante a tildes y mayúsculas) o selección de opciones fijas o auto-deducidas.
* **Proyección de celdas:** Renderizado personalizado mediante directiva `[tableCell]`. Fallback automático a texto plano.
* **Estado de Carga (`loading`):** Barra de progreso indeterminada y spinner de carga sin parpadeos de estados vacíos falsos.
* **Estados Vacíos Diferenciados:**
  * Colección vacía de la API: muestra icono `folder_open` y mensaje configurable (`emptyMessage`).
  * Sin resultados por filtros activos: muestra icono `search_off` y botón directo para limpiar todos los filtros.
* **Rendimiento (`trackBy`):** Soporta función de tracking para optimizar el DOM en actualizaciones y recargas de la API.
* **Filas interactivas (`clickableRows` / `rowClick`):** Soporta clics en la fila con cursor pointer automático y filtro de colisión inteligente (evita colisiones con botones de acción como Editar/Eliminar).
* **Layout responsivo:** Scroll horizontal automático con `minWidth` configurable.

---

## Importación

```typescript
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [TableComponent, TableCellDirective],
  templateUrl: './ejemplo.html',
})
export class EjemploComponent {}
```

---

## Interfaz `TableColumn<T>`

```typescript
export interface TableColumn<T = any> {
  key: string;                                     // Propiedad del objeto (soporta rutas como 'autor.nombre')
  header: string;                                  // Etiqueta del encabezado
  sortable?: boolean;                              // Habilita mat-sort (default: false)
  filterable?: boolean;                            // Habilita menú de filtro (default: false)
  filterType?: 'text' | 'select';                  // Tipo de filtro: 'text' o 'select' (default: 'text')
  filterOptions?: { label: string; value: any }[]; // Opciones fijas para filterType='select' (auto si no se provee)
  width?: string;                                  // Ancho CSS sugerido (ej. '120px')
  align?: 'left' | 'center' | 'right';             // Alineación (default: 'left')
  sticky?: boolean;                                // Fija la columna al borde izquierdo en scroll horizontal
  stickyEnd?: boolean;                             // Fija la columna al borde derecho en scroll horizontal (ideal para acciones)
}
```

---

## Inputs de `<app-table>`

| Input | Tipo | Requerido | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `columns` | `TableColumn<T>[]` | Sí | - | Definición de columnas. |
| `data` | `T[]` | Sí | - | Colección de datos a renderizar (seguro ante `null` o `undefined`). |
| `loading` | `boolean` | No | `false` | Activa la barra e indicador de carga de API. |
| `emptyMessage` | `string` | No | `'No hay registros disponibles'` | Mensaje cuando la API devuelve 0 elementos. |
| `trackBy` | `(index: number, item: T) => any` | No | `item.id \| item.internalId \| index` | Función de tracking para mat-row. |
| `clickableRows` | `boolean` | No | `false` | Activa el cursor pointer y la interactividad en las filas al pasar el ratón. |
| `minWidth` | `string` | No | `'960px'` | Ancho mínimo de la tabla para scroll horizontal responsivo. |

---

## Outputs de `<app-table>`

| Output | Tipo | Descripción |
| :--- | :--- | :--- |
| `(rowClick)` | `OutputEmitterRef<T>` | Emite el objeto de la fila cuando el usuario hace clic sobre ella (solo si `clickableRows` es `true`). Cuenta con filtro automático contra botones (`button`, `.action-btn`), enlaces (`a`) o menús para evitar ejecuciones accidentales al hacer clic en acciones individuales. |

---

## Ejemplo de Implementación con API Asíncrona

### TypeScript (`component.ts`)
```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import { PillComponent } from '../../../shared/components/pill/pill';

interface Evento {
  id: string;
  titulo: string;
  categoria: { id: string; nombre: string };
  esOficial: boolean;
  estado: 'PUBLICADO' | 'BORRADOR';
}

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [TableComponent, TableCellDirective, PillComponent],
  templateUrl: './eventos.html',
})
export class EventosComponent implements OnInit {
  protected readonly columns: TableColumn<Evento>[] = [
    { key: 'id', header: 'ID', sortable: true, width: '90px' },
    { key: 'titulo', header: 'Título', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'categoria.nombre', // Propiedad anidada
      header: 'Categoría',
      sortable: true,
      filterable: true,
      filterType: 'select',
      width: '160px',
    },
    {
      key: 'esOficial',
      header: 'Oficial',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Oficial', value: true },
        { label: 'Comunitario', value: false },
      ],
      width: '130px',
    },
    { key: 'estado', header: 'Estado', sortable: true, width: '130px' },
    { key: 'acciones', header: 'Acciones', width: '100px', align: 'center', stickyEnd: true },
  ];

  // Estado reactivo para consumo de API
  protected readonly eventos = signal<Evento[]>([]);
  protected readonly cargando = signal<boolean>(true);

  ngOnInit(): void {
    this.cargarEventosDesdeApi();
  }

  private cargarEventosDesdeApi(): void {
    this.cargando.set(true);
    // Simulación de llamada HTTP (ej. this.eventoService.getAll())
    setTimeout(() => {
      this.eventos.set([
        {
          id: 'EVT-1',
          titulo: 'Campeonato Universitario',
          categoria: { id: 'c1', nombre: 'Fútbol' },
          esOficial: true,
          estado: 'PUBLICADO',
        },
      ]);
      this.cargando.set(false);
    }, 800);
  }

  onEdit(row: Evento): void {}
  onDelete(row: Evento): void {}
}
```

### HTML (`component.html`)
```html
<app-table
  [columns]="columns"
  [data]="eventos()"
  [loading]="cargando()"
  [clickableRows]="true"
  (rowClick)="onSelectEvento($event)"
  emptyMessage="No se han registrado eventos institucionales aún"
  minWidth="800px"
>
  <!-- Columna personalizada: Píldora de Estado -->
  <ng-template tableCell="estado" let-row>
    <app-pill [variant]="row.estado === 'PUBLICADO' ? 'success' : 'warning'" [dot]="true">
      {{ row.estado }}
    </app-pill>
  </ng-template>

  <!-- Columna personalizada: Píldora con icono para Oficial -->
  <ng-template tableCell="esOficial" let-row>
    @if (row.esOficial) {
      <app-pill variant="info" icon="verified">Oficial</app-pill>
    } @else {
      <app-pill variant="neutral">Comunitario</app-pill>
    }
  </ng-template>

  <!-- Columna personalizada: Botones de acción -->
  <ng-template tableCell="acciones" let-row>
    <div class="actions-group">
      <button mat-icon-button class="action-btn edit-btn" (click)="onEdit(row)" title="Editar">
        <mat-icon>edit</mat-icon>
      </button>
      <button mat-icon-button class="action-btn delete-btn" (click)="onDelete(row)" title="Eliminar">
        <mat-icon>delete</mat-icon>
      </button>
    </div>
  </ng-template>
</app-table>
```

---

## Estilos y Mantenimiento

`TableComponent` encapsula la estructura de la tarjeta, cabeceras, bordes, estados de hover, barra de carga y menús desplegables. El SCSS del componente consumidor únicamente debe declarar los estilos de los elementos proyectados (ej. `.actions-group`, `.action-btn`), consumiendo variables de tokens (`var(--action-btn-edit)`, `var(--color-error)`).

---

## Patrones de Uso: Solo Lectura vs. Gestión con Acciones

El diseño desacoplado de `<app-table>` permite resolver con elegancia los dos grandes casos de uso de la plataforma:

### 1. Tablas de Solo Lectura (Auditoría, Métricas, Logs, Reportes)
* **Objetivo:** Visualizar grandes volúmenes de datos donde el usuario no modifica registros en línea.
* **Configuración recomendada:**
  * **Sin columna de acciones:** Simplemente no agregues `{ key: 'actions' }` en el array `columns`. La tabla aprovechará todo el ancho para los datos.
  * **Interacción opcional:**
    * Si la fila no debe hacer nada: deja `clickableRows="false"` (por defecto). El cursor será el estándar (`default`) y no habrá eventos innecesarios.
    * Si la fila debe abrir un drawer o modal de detalles de solo lectura: activa `[clickableRows]="true"` y escucha `(rowClick)="abrirDetalle($event)"`.

### 2. Tablas de Gestión (Editar, Eliminar, Cambiar Estado)
* **Objetivo:** Operaciones CRUD donde conviven la navegación general al detalle y botones de acción rápida por registro.
* **Configuración recomendada:**
  * **Columna fija (`stickyEnd: true`):** Define la columna de acciones con `stickyEnd: true`. Al hacer scroll horizontal en pantallas pequeñas o en tablas con muchas columnas, los botones de acción se mantendrán **siempre visibles e inmóviles en el borde derecho** con una sutil sombra de elevación sobre las celdas que pasan por debajo.
  * **Fila interactiva (`[clickableRows]="true"`):** Permite hacer clic en cualquier parte de la fila para navegar a la ficha completa del registro.
  * **Protección contra colisiones:** El componente cuenta con un filtro interno de propagación (`closest('button, a, input, .action-btn')`).
    * Al pulsar **Editar** o **Eliminar**, se ejecuta exclusivamente esa función (`onEdit(row)` o `onDelete(row)`).
    * El evento `(rowClick)` de la fila **no se disparará por accidente**.
