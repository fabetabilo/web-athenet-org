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
  readonly columns = input.required<TableColumn<T>[]>();
  readonly data = input.required<T[]>();
  readonly minWidth = input<string>('960px');

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
          const cellVal = row[key];
          if (cellVal === undefined || cellVal === null) {
            return false;
          }

          const col = this.columns().find(c => c.key === key);
          if (col?.filterType === 'select') {
            if (String(cellVal).toLowerCase() !== String(filterVal).toLowerCase()) {
              return false;
            }
          } else {
            if (!String(cellVal).toLowerCase().includes(String(filterVal).toLowerCase())) {
              return false;
            }
          }
        }
        return true;
      } catch {
        return true;
      }
    };

    effect(() => {
      this.dataSource.data = this.data();
    });
  }

  get displayedColumns(): string[] {
    return this.columns().map(c => c.key);
  }

  getTemplate(columnKey: string): TemplateRef<any> | null {
    const match = this.cellDirectives?.find(d => d.columnKey === columnKey);
    return match ? match.templateRef : null;
  }

  getSelectOptions(col: TableColumn<T>): { label: string; value: any }[] {
    if (col.filterOptions && col.filterOptions.length > 0) {
      return col.filterOptions;
    }
    const rawData = this.data() ?? [];
    const uniqueValues = Array.from(
      new Set(rawData.map((row: any) => row[col.key])),
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

  isFilterActive(colKey: string): boolean {
    const val = this.filterValues()[colKey];
    return val !== undefined && val !== null && val !== '' && val !== 'ALL';
  }

  getColumnFilterValue(colKey: string): any {
    return this.filterValues()[colKey] ?? '';
  }
}
