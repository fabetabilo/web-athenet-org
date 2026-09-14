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
| `minWidth` | `string` | No | `'960px'` | Ancho mínimo de la tabla para scroll horizontal responsivo. |

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
    { key: 'acciones', header: 'Acciones', width: '100px', align: 'center' },
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
