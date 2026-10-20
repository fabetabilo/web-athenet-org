import type { PillVariant } from '../../../shared/components/pill/pill';

export const EVENT_STATUS: Record<string, { label: string; variant: PillVariant }> = {
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  DRAFT: { label: 'Borrador', variant: 'warning' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
};

export const STATUS_OPTIONS = Object.entries(EVENT_STATUS).map(([value, { label }]) => ({ label, value }));
