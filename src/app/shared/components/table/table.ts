import {
  Component,
  ContentChildren,
  Directive,
  Input,
  QueryList,
  TemplateRef,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { label: string; value: any }[];
  width?: string;
  align?: 'left' | 'center' | 'right';
}

@Directive({
  selector: '[tableCell]',
  standalone: true,
})
export class TableCellDirective {
  @Input('tableCell') columnKey!: string;
  constructor(public readonly templateRef: TemplateRef<any>) {}
}

/**
 * Resuelve de forma segura propiedades anidadas usando notación de punto (ej. 'category.name').
 */
export function getDeepValue(obj: any, path: string): any {
  if (obj === null || obj === undefined || !path) return undefined;
  if (!path.includes('.')) return obj[path];
  return path
    .split('.')
    .reduce((acc, part) => (acc !== null && acc !== undefined ? acc[part] : undefined), obj);
}

/**
 * Normaliza cadenas removiendo tildes/acentos y convirtiendo a minúsculas
 * para búsquedas tolerantes e intuitivas en español.
 */
export function normalizeFilterText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class TableComponent<T = any> {
  /** Definición de columnas de la tabla */
  readonly columns = input.required<TableColumn<T>[]>();

  /** Colección de datos a renderizar (resistente a null/undefined durante llamadas a API) */
  readonly data = input.required<T[]>();

  /** Ancho mínimo para habilitar scroll horizontal responsivo */
  readonly minWidth = input<string>('960px');

  /** Indica si la petición de datos está en progreso */
  readonly loading = input<boolean>(false);

  /** Mensaje informativo cuando la colección de datos de la API está vacía */
  readonly emptyMessage = input<string>('No hay registros disponibles');

  /** Función de tracking personalizada para optimizar el DOM en actualizaciones de API */
  readonly trackBy = input<(index: number, item: T) => any>();

  @ContentChildren(TableCellDirective)
  protected cellDirectives!: QueryList<TableCellDirective>;

  protected readonly dataSource = new MatTableDataSource<T>([]);
  protected readonly filterValues = signal<Record<string, any>>({});

  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  constructor() {
    // Acceso robusto a datos para ordenamiento con soporte para rutas anidadas, fechas y booleanos
    this.dataSource.sortingDataAccessor = (data: T, sortHeaderId: string): string | number => {
      const value = getDeepValue(data, sortHeaderId);
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'number') return value;
      if (value instanceof Date) return value.getTime();
      return String(value).toLowerCase();
    };

    // Predicado multicriterio con normalización de acentos y soporte de tipos booleanos/numéricos
    this.dataSource.filterPredicate = (row: any, filterJson: string) => {
      if (!filterJson) return true;
      try {
        const filters: Record<string, any> = JSON.parse(filterJson);
        const keys = Object.keys(filters);
        if (keys.length === 0) return true;

        for (const key of keys) {
          const filterVal = filters[key];
          if (filterVal === undefined || filterVal === null || filterVal === '') {
            continue;
          }
          const cellVal = getDeepValue(row, key);
          if (cellVal === undefined || cellVal === null) {
            return false;
          }

          const col = this.columns().find(c => c.key === key);
          if (col?.filterType === 'select') {
            if (String(cellVal).toLowerCase() !== String(filterVal).toLowerCase()) {
              return false;
            }
          } else {
            const normCell = normalizeFilterText(cellVal);
            const normFilter = normalizeFilterText(filterVal);
            if (!normCell.includes(normFilter)) {
              return false;
            }
          }
        }
        return true;
      } catch {
        return true;
      }
    };

    // Sincronización reactiva con los datos del input, protegiendo contra null/undefined
    effect(() => {
      const incoming = this.data();
      this.dataSource.data = Array.isArray(incoming) ? incoming : [];
    });
  }

  /** Función de tracking para mat-row */
  rowTrackBy = (index: number, item: T): any => {
    const custom = this.trackBy();
    if (custom) return custom(index, item);
    return (item as any)?.id ?? (item as any)?.internalId ?? (item as any)?._id ?? index;
  };

  get displayedColumns(): string[] {
    return this.columns().map(c => c.key);
  }

  get hasActiveFilters(): boolean {
    const f = this.filterValues();
    return Object.keys(f).some(
      k => f[k] !== undefined && f[k] !== null && f[k] !== '' && f[k] !== 'ALL',
    );
  }

  getCellValue(row: any, key: string): any {
    return getDeepValue(row, key) ?? '';
  }

  getTemplate(columnKey: string): TemplateRef<any> | null {
    const match = this.cellDirectives?.find(d => d.columnKey === columnKey);
    return match ? match.templateRef : null;
  }

  getSelectOptions(col: TableColumn<T>): { label: string; value: any }[] {
    if (col.filterOptions && col.filterOptions.length > 0) {
      return col.filterOptions;
    }
    const rawData = this.data();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    const uniqueValues = Array.from(
      new Set(rawData.map((row: any) => getDeepValue(row, col.key))),
    ).filter(v => v !== undefined && v !== null && v !== '');

    return uniqueValues.map(val => ({
      label: String(val),
      value: val,
    }));
  }

  applyColumnFilter(colKey: string, value: any): void {
    const nextFilters = { ...this.filterValues() };
    if (value === null || value === undefined || value === '' || value === 'ALL') {
      delete nextFilters[colKey];
    } else {
      nextFilters[colKey] = value;
    }
    this.filterValues.set(nextFilters);
    this.dataSource.filter = JSON.stringify(nextFilters);
  }

  clearColumnFilter(colKey: string, event?: Event): void {
    event?.stopPropagation();
    const nextFilters = { ...this.filterValues() };
    delete nextFilters[colKey];
    this.filterValues.set(nextFilters);
    this.dataSource.filter = JSON.stringify(nextFilters);
  }

  clearAllFilters(): void {
    this.filterValues.set({});
    this.dataSource.filter = '';
  }

  isFilterActive(colKey: string): boolean {
    const val = this.filterValues()[colKey];
    return val !== undefined && val !== null && val !== '' && val !== 'ALL';
  }

  getColumnFilterValue(colKey: string): any {
    return this.filterValues()[colKey] ?? '';
  }
}
