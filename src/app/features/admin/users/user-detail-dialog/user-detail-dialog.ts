import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { PillComponent } from '../../../../shared/components/pill/pill';
import {
  roleIcon,
  type AppRole,
  type AppRoleCode,
  type AthenetUser,
} from '../../services/user-api.service';

export interface UserDetailDialogData {
  user: AthenetUser;
  roles: AppRole[];
}

/**
 * Diálogo de solo lectura: recibe el usuario y el catálogo por MAT_DIALOG_DATA,
 * no inyecta servicios ni hace peticiones. En v1 la asignación de roles se
 * gestiona en el portal de Entra ID.
 */
@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ButtonComponent, PillComponent],
  templateUrl: './user-detail-dialog.html',
  styleUrl: './user-detail-dialog.scss',
})
export class UserDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UserDetailDialogComponent>);
  readonly data = inject<UserDetailDialogData>(MAT_DIALOG_DATA);

  readonly user: AthenetUser = this.data.user;

  /**
   * Roles del usuario resueltos contra el catálogo, que es donde la
   * `description` aporta algo (a diferencia de la celda de la tabla).
   */
  readonly rolesAsignados: AppRole[] = this.codigosDeRol().map(
    (code) =>
      this.data.roles?.find((rol) => rol.code === code) ?? {
        code,
        displayName: code,
        description: 'Rol asignado en Entra ID que no está en el catálogo de la aplicación.',
      },
  );

  getRoleIcon(code: AppRoleCode): string {
    return roleIcon(code);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private codigosDeRol(): AppRoleCode[] {
    return Array.isArray(this.user?.roles) ? this.user.roles : [];
  }
}
