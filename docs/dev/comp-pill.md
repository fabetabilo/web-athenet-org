# Componente: `<app-pill>` (PillComponent)

Componente standalone para renderizar estados, badges e indicadores de categoria en vistas densas y tablas.

---

## Justificacion Tecnica

`MatChipsModule` (`mat-chip`) de Angular Material introduce dimensiones minimas (32px-40px) y eventos tactiles que desalinean el espaciado vertical en tablas de datos. `<app-pill>` provee un contenedor ligero (< 1 kB) que consume directamente los tokens semanticos `--pill-*` sin sobrecarga en el ciclo de deteccion de cambios.

---

## Importacion

```typescript
import { PillComponent, type PillVariant, type PillSize } from '../../../shared/components/pill/pill';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [PillComponent],
  templateUrl: './ejemplo.html',
})
export class EjemploComponent {}
```

---

## API

### Inputs

| Input | Tipo | Default | Descripcion |
| :--- | :--- | :--- | :--- |
| `variant` | `PillVariant` | `'neutral'` | Variante semantica: `'success'`, `'warning'`, `'danger'`, `'info'`, `'neutral'`. |
| `dot` | `boolean` | `false` | Renderiza un punto indicador antes del texto. |
| `icon` | `string \| null` | `null` | Nombre del icono de Material Icons (ej. `'verified'`). |
| `size` | `PillSize` | `'sm'` | Dimension: `'sm'` (tablas y listas densas) o `'md'` (tarjetas y cabeceras). |

El texto se proyecta mediante `<ng-content>`.

---

## Mapeo de Tokens

| Variante | Fondo | Texto | Punto (`dot`) |
| :--- | :--- | :--- | :--- |
| `success` | `--pill-success-bg` | `--pill-success-text` | `--pill-success-dot` |
| `warning` | `--pill-warning-bg` | `--pill-warning-text` | `--pill-warning-dot` |
| `danger` | `--pill-danger-bg` | `--pill-danger-text` | `--pill-danger-dot` |
| `info` | `--pill-info-bg` | `--pill-info-text` | `--pill-info-dot` |
| `neutral` | `--pill-neutral-bg` | `--pill-neutral-text` | `--pill-neutral-dot` |

---

## Ejemplos

### Estados con punto indicador
```html
<app-pill variant="success" [dot]="true">Publicado</app-pill>
<app-pill variant="warning" [dot]="true">Borrador</app-pill>
<app-pill variant="danger" [dot]="true">Cancelado</app-pill>
```

### Insignia con icono
```html
<app-pill variant="info" icon="verified">Oficial</app-pill>
```

### Etiquetas neutras
```html
<app-pill variant="neutral">Futbol</app-pill>
```

### Proyeccion en `<app-table>`
```html
<ng-template tableCell="status" let-row>
  <app-pill [variant]="getStatusVariant(row.status)" [dot]="true">
    {{ row.status }}
  </app-pill>
</ng-template>
```

Mapeo recomendado en el componente:
```typescript
getStatusVariant(status: string): PillVariant {
  switch (status) {
    case 'PUBLISHED': return 'success';
    case 'DRAFT': return 'warning';
    case 'CANCELLED': return 'danger';
    default: return 'neutral';
  }
}
```
