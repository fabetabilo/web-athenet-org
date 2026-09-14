import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  TableComponent,
  TableCellDirective,
  TableColumn,
  getDeepValue,
  normalizeFilterText,
} from './table';

interface TestItem {
  id: string;
  name: string;
  category: { id: string; name: string };
  isOfficial: boolean;
  score: number;
}

@Component({
  standalone: true,
  imports: [TableComponent, TableCellDirective],
  template: `
    <app-table
      [columns]="columns"
      [data]="data()"
      [loading]="loading()"
      [emptyMessage]="emptyMessage()"
    >
      <ng-template tableCell="customCell" let-row>
        <span class="custom-badge">{{ row.name }} - custom</span>
      </ng-template>
    </app-table>
  `,
})
class HostTableComponent {
  columns: TableColumn<TestItem>[] = [
    { key: 'id', header: 'ID', sortable: true, width: '80px' },
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'category.name',
      header: 'Categoría',
      sortable: true,
      filterable: true,
      filterType: 'select',
    },
    {
      key: 'isOfficial',
      header: 'Oficial',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Oficial', value: true },
        { label: 'Comunitario', value: false },
      ],
    },
    { key: 'customCell', header: 'Personalizado' },
  ];

  data = signal<TestItem[]>([]);
  loading = signal<boolean>(false);
  emptyMessage = signal<string>('No hay registros');
}

describe('TableComponent', () => {
  let fixture: ComponentFixture<HostTableComponent>;
  let host: HostTableComponent;
  let tableComponent: TableComponent;

  const mockData: TestItem[] = [
    {
      id: 'EVT-1',
      name: 'Fútbol Interfacultades',
      category: { id: 'c1', name: 'Deportes' },
      isOfficial: true,
      score: 10,
    },
    {
      id: 'EVT-2',
      name: 'Ajedrez Rápido',
      category: { id: 'c2', name: 'Ciencia' },
      isOfficial: false,
      score: 25,
    },
    {
      id: 'EVT-3',
      name: 'Vóleibol Playa',
      category: { id: 'c1', name: 'Deportes' },
      isOfficial: false,
      score: 15,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostTableComponent, TableComponent, TableCellDirective],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostTableComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    tableComponent = fixture.debugElement.children[0].componentInstance;
  });

  describe('Utilidades de Resiliencia', () => {
    it('getDeepValue debe resolver propiedades anidadas correctamente', () => {
      const obj = { user: { profile: { name: 'Ana' } }, count: 0 };
      expect(getDeepValue(obj, 'user.profile.name')).toBe('Ana');
      expect(getDeepValue(obj, 'count')).toBe(0);
      expect(getDeepValue(obj, 'user.nonExistent')).toBeUndefined();
      expect(getDeepValue(null, 'user.profile.name')).toBeUndefined();
      expect(getDeepValue(undefined, 'user.profile.name')).toBeUndefined();
    });

    it('normalizeFilterText debe remover tildes y normalizar a minúsculas', () => {
      expect(normalizeFilterText('Fútbol')).toBe('futbol');
      expect(normalizeFilterText('VÓLEIBOL')).toBe('voleibol');
      expect(normalizeFilterText('  Ajedrez  ')).toBe('ajedrez');
      expect(normalizeFilterText(null)).toBe('');
      expect(normalizeFilterText(undefined)).toBe('');
    });
  });

  describe('Carga Asíncrona de Datos', () => {
    it('debe iniciar vacío sin errores y actualizarse cuando la API resuelve datos', () => {
      // Estado inicial vacío
      let rows = fixture.nativeElement.querySelectorAll('.app-table-row');
      expect(rows.length).toBe(0);

      // Simula llegada de datos de API
      host.data.set(mockData);
      fixture.detectChanges();

      rows = fixture.nativeElement.querySelectorAll('.app-table-row');
      expect(rows.length).toBe(3);
    });

    it('debe resolver propiedades anidadas en las celdas por defecto', () => {
      host.data.set(mockData);
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('td.mat-mdc-cell');
      // La celda de categoría (columna 3 de la primera fila) debe contener "Deportes"
      const cellTexts = Array.from(cells).map((c: any) => c.textContent?.trim());
      expect(cellTexts).toContain('Deportes');
      expect(cellTexts).toContain('Ciencia');
    });

    it('debe renderizar celdas proyectadas con [tableCell]', () => {
      host.data.set(mockData);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.custom-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toContain('Fútbol Interfacultades - custom');
    });
  });

  describe('Estados de Carga y Empty States', () => {
    it('debe mostrar barra de progreso y estado de carga mientras loading = true', () => {
      host.loading.set(true);
      fixture.detectChanges();

      const loadingBar = fixture.nativeElement.querySelector('.table-loading-bar');
      expect(loadingBar).not.toBeNull();

      const loadingRow = fixture.nativeElement.querySelector('.loading-row');
      expect(loadingRow).not.toBeNull();
      expect(loadingRow.textContent).toContain('Cargando datos...');
    });

    it('debe mostrar el mensaje de emptyMessage cuando no hay datos de API y no está cargando', () => {
      host.loading.set(false);
      host.data.set([]);
      fixture.detectChanges();

      const emptyRow = fixture.nativeElement.querySelector('.no-data-row');
      expect(emptyRow).not.toBeNull();
      expect(emptyRow.textContent).toContain('No hay registros');
    });

    it('debe mostrar mensaje específico con botón para limpiar filtros cuando un filtro no produce resultados', () => {
      host.data.set(mockData);
      fixture.detectChanges();

      // Aplicar un filtro que no tenga coincidencias
      tableComponent.applyColumnFilter('name', 'Inexistente XYZ');
      fixture.detectChanges();

      const emptyRow = fixture.nativeElement.querySelector('.no-data-row');
      expect(emptyRow).not.toBeNull();
      expect(emptyRow.textContent).toContain(
        'No se encontraron resultados con los filtros aplicados.',
      );

      const clearBtn = fixture.nativeElement.querySelector('.clear-filters-btn');
      expect(clearBtn).not.toBeNull();

      // Al pulsar limpiar filtros, debe restaurar los datos
      clearBtn.click();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
      expect(rows.length).toBe(3);
    });
  });

  describe('Filtrado Avanzado y Tolerancia', () => {
    beforeEach(() => {
      host.data.set(mockData);
      fixture.detectChanges();
    });

    it('debe filtrar texto ignorando mayúsculas y acentos/tildes', () => {
      // Buscar "futbol" sin tilde debe coincidir con "Fútbol Interfacultades"
      tableComponent.applyColumnFilter('name', 'futbol');
      fixture.detectChanges();

      expect(tableComponent['dataSource'].filteredData.length).toBe(1);
      expect(tableComponent['dataSource'].filteredData[0].name).toBe('Fútbol Interfacultades');
    });

    it('debe filtrar valores booleanos en filtros de tipo select', () => {
      // Filtrar oficial = false (Comunitario)
      tableComponent.applyColumnFilter('isOfficial', false);
      fixture.detectChanges();

      expect(tableComponent['dataSource'].filteredData.length).toBe(2);
      expect(tableComponent['dataSource'].filteredData.every(d => !d.isOfficial)).toBe(true);

      // Limpiar filtro pasando 'ALL'
      tableComponent.applyColumnFilter('isOfficial', 'ALL');
      fixture.detectChanges();

      expect(tableComponent['dataSource'].filteredData.length).toBe(3);
    });

    it('debe permitir limpiar filtros por columna de forma individual', () => {
      tableComponent.applyColumnFilter('name', 'Ajedrez');
      fixture.detectChanges();
      expect(tableComponent.isFilterActive('name')).toBe(true);
      expect(tableComponent['dataSource'].filteredData.length).toBe(1);

      tableComponent.clearColumnFilter('name');
      fixture.detectChanges();
      expect(tableComponent.isFilterActive('name')).toBe(false);
      expect(tableComponent['dataSource'].filteredData.length).toBe(3);
    });
  });
});
