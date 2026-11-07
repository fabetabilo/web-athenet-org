import type { PillVariant } from '../../../shared/components/pill/pill';

export const EVENT_STATUS: Record<string, { label: string; variant: PillVariant }> = {
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  DRAFT: { label: 'Borrador', variant: 'warning' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
  FINISHED: { label: 'Finalizado', variant: 'neutral' },
};

export const STATUS_OPTIONS = Object.entries(EVENT_STATUS).map(([value, { label }]) => ({ label, value }));

// Finalizado lo asigna Competiciones al cerrar un encuentro. El director no lo elige: sacaría
// un evento de la web sin avisar la cancelación a los suscriptores. [2026-11-07] AUN NO se manejan los eventos finalizados
export const EDITABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter((option) => option.value !== 'FINISHED');
