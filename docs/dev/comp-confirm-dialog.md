# Componente: `ConfirmDialogComponent` (`<app-confirm-dialog>`)

Componente modal standalone y 100% agnóstico para confirmación de acciones interactivas y envíos de formularios (`submit-dialog`). Diseñado para ser consumido mediante el servicio `MatDialog` de Angular Material, encapsulando la accesibilidad WAI-ARIA, backdrop oscuro con desenfoque, y botones compartidos `<app-button>`.

---

## Características

* **100% Agnóstico:** Sin acoplamientos a entidades específicas (eventos, usuarios o torneos).
* **Uso Dual:** Funciona tanto para confirmaciones destructivas (`danger`) como para diálogos de envío o publicación (`submit-dialog` con `primary`).
* **Accesibilidad Nativa:** Foco atrapado automáticamente (Focus Trap), soporte para tecla `Escape` y cierre seguro al hacer clic en el backdrop.
* **Tokens de Diseño Globales:** Estilizado estricto con `--color-bg-surface`, `--color-text-heading`, `--color-error-bg`, `--radius-xl` y `--shadow-lg`.
* **Oscurecimiento de Pantalla:** Fondo difuminado y oscurecido mediante `.cdk-overlay-dark-backdrop` (`backdrop-filter: blur(2px)` y `rgba(8, 11, 20, 0.65)`).
* **Botones Compartidos:** Integra `<app-button>` en variantes `secondary` (Cancelar) y semántica dinámica (`primary`, `danger`, etc.).

---

## Importación

```typescript
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  templateUrl: './ejemplo.html',
})
export class EjemploComponent {
  private readonly dialog = inject(MatDialog);
}
```

---

## Interfaz `ConfirmDialogData`

| Propiedad | Tipo | Requerido | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | No | `'Confirmar Acción'` | Título principal en la cabecera del modal. |
| `message` | `string` | No | `'¿Deseas continuar?'` | Pregunta o texto explicativo principal. |
| `targetName` | `string` | No | `undefined` | Nombre del elemento o entidad a resaltar entre comillas (`«...»`). |
| `description` | `string` | No | `undefined` | Texto secundario o advertencia explicativa. |
| `confirmText` | `string` | No | `'Confirmar'` / `'Eliminar'` | Texto del botón de confirmación. |
| `confirmVariant` | `ButtonVariant` | No | `'primary'` / `'danger'` | Variante visual del botón de confirmación (`'primary'`, `'danger'`, etc.). |
| `confirmIcon` | `string \| null` | No | Según variante | Icono de Material para el botón de confirmación. |
| `cancelText` | `string` | No | `'Cancelar'` | Texto del botón de cancelar/cerrar. |
| `icon` | `string \| null` | No | Según variante | Icono de Material para el encabezado visual (pasar `null` para ocultar). |
| `variant` | `DialogSemanticVariant`| No | `'primary'` / `'danger'` | Variante semántica: `'primary'`, `'danger'`, `'warning'`, `'info'`, `'neutral'`. |

---

## Ejemplos de Uso

### 1. Diálogo de Envío / Creación (`submit-dialog`)
Útil al hacer clic en *"Guardar"*, *"Enviar"* o *"Crear Evento"*:

```typescript
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  data: {
    title: 'Confirmar Publicación',
    message: '¿Deseas registrar y publicar el evento',
    targetName: 'Torneo Interfacultades 2026',
    description: 'El evento quedará visible inmediatamente para todas las casas de estudio.',
    confirmText: 'Publicar Evento',
    confirmVariant: 'primary',
    confirmIcon: 'send',
    cancelText: 'Seguir editando',
    variant: 'primary',
    icon: 'rocket_launch',
  },
  width: '460px',
  maxWidth: '92vw',
  panelClass: 'athenet-dialog-panel',
});

dialogRef.afterClosed().subscribe((confirmed: boolean) => {
  if (confirmed) {
    this.submitEvent();
  }
});
```

---

### 2. Diálogo de Eliminación (Destructivo)
Para confirmaciones de borrado o acciones irreversibles:

```typescript
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  data: {
    title: 'Confirmación de Eliminación',
    message: 'Estás a punto de eliminar el evento',
    targetName: event.title,
    description: 'Esta acción no se puede deshacer y removerá permanentemente el registro.',
    confirmText: 'Eliminar',
    confirmVariant: 'danger',
    confirmIcon: 'delete',
    cancelText: 'Cancelar',
    variant: 'danger',
    icon: 'delete_outline',
  },
  width: '460px',
  maxWidth: '92vw',
  panelClass: 'athenet-dialog-panel',
});

dialogRef.afterClosed().subscribe((confirmed: boolean) => {
  if (confirmed) {
    this.deleteItem(event.id);
  }
});
```

---

### 3. Diálogo de Advertencia (Descartar Cambios)
Para alertar al usuario antes de salir de un formulario con cambios pendientes:

```typescript
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  data: {
    title: '¿Descartar Cambios?',
    message: 'Tienes modificaciones pendientes en el formulario.',
    description: 'Si sales ahora, todos los datos no guardados se perderán.',
    confirmText: 'Descartar',
    confirmVariant: 'danger',
    cancelText: 'Continuar editando',
    variant: 'warning',
    icon: 'warning_amber',
  },
  width: '460px',
});
```
