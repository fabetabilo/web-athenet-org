import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { type Deporte } from '../../services/deporte-api.service';

export interface DeporteDetailDialogData {
  deporte: Deporte;
}

@Component({
  selector: 'app-deporte-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ButtonComponent],
  templateUrl: './deporte-detail-dialog.html',
  styleUrl: './deporte-detail-dialog.scss',
})
export class DeporteDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DeporteDetailDialogComponent>);
  readonly data = inject<DeporteDetailDialogData>(MAT_DIALOG_DATA);

  readonly deporte: Deporte = this.data.deporte;

  onClose(): void {
    this.dialogRef.close();
  }
}
