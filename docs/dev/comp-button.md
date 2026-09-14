# Componente: `<app-button>` (ButtonComponent)

Componente standalone para botones de acción con variantes semánticas, soporte para iconos de Material, estado de carga asíncrono (`loading`) con prevención de doble clic y consumo de tokens de diseño globales.

---

## Justificación Técnica

Los botones nativos de Angular Material (`mat-button`, `mat-flat-button`) requieren configurar manualmente clases SCSS, alturas y paddings, además de repetir bloques de markup `@if (loading) { <span class="spinner"></span> }` para llamadas asíncronas en formularios y diálogos.

`<app-button>` estandariza las interacciones en los portales `admin` y `director`:
1. **Consistencia de Tokens:** Vinculado directamente a las variables CSS `--btn-*` y a la paleta de Athenet.
2. **Protección Anti Doble Clic:** Al activarse `loading="true"` o `disabled="true"`, el componente intercepta eventos en fase de captura del DOM y desactiva el botón nativo, bloqueando cualquier ejecución accidental.
3. **Spinner Integrado:** Indicador de carga CSS ultraligero que hereda el color del texto de la variante sin dependencias de módulos pesados.
4. **Fácil Manejo de Clicks:** Admite tanto el evento estándar `(click)="fn()"` como el output tipado `(btnClick)="fn()"`.

---

## Importación

```typescript
import { ButtonComponent, type ButtonVariant, type ButtonSize } from '../../../shared/components/button/button';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './ejemplo.html',
})
export class EjemploComponent {}
```

---

## API

### Inputs

| Input | Tipo | Default | Descripción |
| :--- | :--- | :--- | :--- |
| `variant` | `ButtonVariant` | `'primary'` | Variante semántica: `'primary'`, `'danger'`, `'secondary'`, `'ghost'`. |
| `size` | `ButtonSize` | `'md'` | Altura y padding: `'sm'` (32px), `'md'` (40px) o `'lg'` (48px). |
| `icon` | `string \| null` | `null` | Nombre del icono de Material Icons (ej. `'add'`, `'delete'`, `'refresh'`). |
| `iconPosition` | `'start' \| 'end'` | `'start'` | Ubicación del icono respecto al texto. |
| `loading` | `boolean` | `false` | Muestra el spinner de carga, oculta el icono y bloquea clicks. |
| `disabled` | `boolean` | `false` | Deshabilita la interacción y reduce la opacidad. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Atributo `type` HTML nativo del botón interno. |

### Outputs

| Output | Tipo | Descripción |
| :--- | :--- | :--- |
| `btnClick` | `output<MouseEvent>()` | Evento emitido al hacer click únicamente cuando el botón está activo (no disabled ni loading). |

El texto y contenido se proyectan mediante `<ng-content>`.

---

## Mapeo de Tokens

| Variante | Fondo | Texto | Hover | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| `primary` | `--btn-primary-bg` (#00C8FF) | `--btn-primary-text` (#080B14) | `--btn-primary-hover-bg` | Acción principal de la pantalla (**+ Nuevo Evento**, Guardar). |
| `danger` | `--btn-danger-bg` (#ef4444) | `--btn-danger-text` (#ffffff) | `--btn-danger-hover-bg` | Acciones destructivas o irreversibles (**Eliminar**, Revocar). |
| `secondary` | `--btn-secondary-bg` (#ffffff) | `--btn-secondary-text` (#334155) | `--btn-secondary-hover-bg` | Acciones alternativas (**Cancelar**, Volver atrás, Filtros). |
| `ghost` | Transparente | `--btn-ghost-text` (#475569) | `--btn-ghost-hover-bg` | Acciones terciarias y sutiles en barras de herramientas. |

---

## Ejemplos de Uso

### 1. Botón Principal de Creación sobre Tablas (`.table-toolbar`)
```html
<div class="table-toolbar">
  <app-button 
    variant="primary" 
    icon="add" 
    (click)="onCreateEvent()">
    Nuevo Evento
  </app-button>
</div>
```

### 2. Modal o Diálogo de Confirmación para Eliminar
```html
<div class="modal-actions">
  <app-button 
    variant="secondary" 
    (click)="dialogRef.close(false)">
    Cancelar
  </app-button>

  <app-button 
    variant="danger" 
    icon="delete" 
    [loading]="isDeleting()" 
    (click)="confirmDelete()">
    Eliminar
  </app-button>
</div>
```

### 3. Botón con Spinner de Carga Asíncrona
```html
<app-button 
  variant="primary" 
  icon="save" 
  [loading]="isSaving()" 
  (click)="onSave()">
  Guardar Cambios
</app-button>
```

### 4. Botón Compacto para Toolbars (`size="sm"`)
```html
<app-button 
  variant="secondary" 
  size="sm" 
  icon="refresh" 
  (click)="loadEvents()">
  Actualizar
</app-button>
```
