import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import {
  PillComponent,
  type PillVariant,
} from '../../../shared/components/pill/pill';

export interface AthenetEvent {
  internalId: string;
  title: string;
  category: string;
  eventDate: string;
  status: 'PUBLISHED' | 'DRAFT' | 'CANCELLED';
  isOfficial: boolean;
  location: string;
  description?: string;
  address?: string;
}

const SAMPLE_EVENTS: AthenetEvent[] = [
  {
    internalId: 'EVT-1',
    title: 'Campeonato Sudamericano',
    category: 'TENIS_MESA',
    eventDate: '2026-09-24',
    status: 'PUBLISHED',
    isOfficial: true,
    location: 'Santiago, Chile',
    description: 'Campeonato Sudamericano de Tenis de Mesa universitario.',
    address: 'Av. Libertador Bernardo O Higgins 340, Santiago Centro',
  },
  {
    internalId: 'EVT-6',
    title: 'Copa Interfacultades Femenino',
    category: 'FUTBOL',
    eventDate: '2026-10-04',
    status: 'PUBLISHED',
    isOfficial: false,
    location: 'Concepción, Chile',
    description: 'Copa de fútbol femenino entre facultades universitarias.',
    address: 'Barrio Universitario s/n, Concepción',
  },
  {
    internalId: 'EVT-3',
    title: 'Vóleibol Femenino 2026',
    category: 'VOLEIBOL',
    eventDate: '2026-10-25',
    status: 'PUBLISHED',
    isOfficial: true,
    location: 'Valparaíso, Chile',
    description: 'Torneo femenino de vóleibol universitario.',
    address: 'Av. Brasil 2950, Valparaíso',
  },
];

@Component({
  selector: 'app-director-events',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    TableComponent,
    TableCellDirective,
    PillComponent,
  ],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class DirectorEventsComponent {
  protected readonly columns: TableColumn<AthenetEvent>[] = [
    {
      key: 'internalId',
      header: 'ID',
      sortable: true,
      width: '90px',
    },
    {
      key: 'title',
      header: 'Título',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'category',
      header: 'Categoría',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Tenis de Mesa', value: 'TENIS_MESA' },
        { label: 'Fútbol', value: 'FUTBOL' },
        { label: 'Vóleibol', value: 'VOLEIBOL' },
        { label: 'Ajedrez', value: 'AJEDREZ' },
        { label: 'Natación', value: 'NATACION' },
        { label: 'Básquetbol', value: 'BASQUETBOL' },
        { label: 'Atletismo', value: 'ATLETISMO' },
        { label: 'Tenis', value: 'TENIS' },
        { label: 'Rugby', value: 'RUGBY' },
        { label: 'Levantamiento de Pesas', value: 'LEVANTAMIENTO_PESAS' },
      ],
      width: '160px',
    },
    {
      key: 'eventDate',
      header: 'Fecha',
      sortable: true,
      width: '130px',
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Publicado', value: 'PUBLISHED' },
        { label: 'Borrador', value: 'DRAFT' },
        { label: 'Cancelado', value: 'CANCELLED' },
      ],
      width: '140px',
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
      width: '130px',
    },
    {
      key: 'location',
      header: 'Ubicación',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '180px',
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      align: 'center',
    },
  ];

  protected readonly dataSource = SAMPLE_EVENTS;

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = {
      TENIS_MESA: 'Tenis de Mesa',
      FUTBOL: 'Fútbol',
      VOLEIBOL: 'Vóleibol',
      AJEDREZ: 'Ajedrez',
      NATACION: 'Natación',
      BASQUETBOL: 'Básquetbol',
      ATLETISMO: 'Atletismo',
      TENIS: 'Tenis',
      RUGBY: 'Rugby',
      LEVANTAMIENTO_PESAS: 'Levantamiento de Pesas',
    };
    return map[category] ?? category;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PUBLISHED: 'Publicado',
      DRAFT: 'Borrador',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  getStatusVariant(status: string): PillVariant {
    switch (status) {
      case 'PUBLISHED':
        return 'success';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  onEdit(event: AthenetEvent): void {
    console.log('Editar evento:', event);
  }

  onDelete(event: AthenetEvent): void {
    console.log('Eliminar evento:', event);
  }
}
