# Componente: `<app-table>` (TableComponent)

Tabla de datos generica y componible basada en Angular Material (`MatTableModule`, `MatSortModule`, `MatMenuModule`) y tokens CSS de Athenet.

---

## Caracteristicas

* **Configuracion tipada:** Definicion de columnas mediante `TableColumn<T>[]`.
* **Ordenamiento:** Integracion con `MatSort` (`sortable: true`).
* **Filtros en cabecera:** Menus desplegables (`mat-menu`) con busqueda por texto o seleccion de opciones.
* **Proyeccion de celdas:** Renderizado personalizado mediante directiva `[tableCell]`. Fallback automatico a texto plano.
* **Layout responsivo:** Scroll horizontal automatico con `minWidth` configurable.
* **Estado vacio:** Fila informativa automatica cuando no hay coincidencias con los filtros activos.

---

## Importacion

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
  key: string;                                     // Propiedad del objeto de datos
  header: string;                                  // Etiqueta del encabezado
  sortable?: boolean;                              // Habilita mat-sort (default: false)
  filterable?: boolean;                            // Habilita menu de filtro (default: false)
  filterType?: 'text' | 'select';                  // Tipo de filtro (default: 'text')
  filterOptions?: { label: string; value: any }[]; // Opciones fijas para filterType='select'
  width?: string;                                  // Ancho CSS sugerido (ej. '120px')
  align?: 'left' | 'center' | 'right';             // Alineacion (default: 'left')
}
```

---

## Inputs de `<app-table>`

| Input | Tipo | Requerido | Default | Descripcion |
| :--- | :--- | :--- | :--- | :--- |
| `columns` | `TableColumn<T>[]` | Si | - | Definicion de columnas. |
| `data` | `T[]` | Si | - | Coleccion de datos a renderizar. |
| `minWidth` | `string` | No | `'960px'` | Ancho minimo de la tabla para scroll horizontal. |

---

## Ejemplo de Implementacion

### TypeScript
```typescript
import { Component } from '@angular/core';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import { PillComponent } from '../../../shared/components/pill/pill';

interface Item {
  id: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [TableComponent, TableCellDirective, PillComponent],
  templateUrl: './items.html',
})
export class ItemsComponent {
  protected readonly columns: TableColumn<Item>[] = [
    { key: 'id', header: 'ID', sortable: true, width: '90px' },
    { key: 'nombre', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Activo', value: 'ACTIVO' },
        { label: 'Inactivo', value: 'INACTIVO' },
      ],
      width: '130px',
    },
    { key: 'acciones', header: 'Acciones', width: '100px', align: 'center' },
  ];

  protected readonly data: Item[] = [
    { id: 'ITM-1', nombre: 'Item 1', estado: 'ACTIVO' },
    { id: 'ITM-2', nombre: 'Item 2', estado: 'INACTIVO' },
  ];

  onEdit(row: Item): void {}
  onDelete(row: Item): void {}
}
```

### HTML
```html
<app-table [columns]="columns" [data]="data" minWidth="720px">

  <!-- Columna personalizada: Estado con píldora -->
  <ng-template tableCell="estado" let-row>
    <app-pill [variant]="row.estado === 'ACTIVO' ? 'success' : 'danger'" [dot]="true">
      {{ row.estado }}
    </app-pill>
  </ng-template>

  <!-- Columna personalizada: Botones de accion -->
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

`TableComponent` encapsula la estructura de la tarjeta, cabeceras, bordes, estados de hover y menus desplegables. El SCSS del componente consumidor unicamente debe declarar los estilos de los elementos proyectados (ej. `.actions-group`, `.action-btn`), consumiendo variables de tokens (`var(--action-btn-edit)`, `var(--color-error)`).
