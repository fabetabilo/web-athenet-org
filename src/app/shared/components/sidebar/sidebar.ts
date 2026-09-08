import { Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass, TitleCasePipe } from '@angular/common';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass, TitleCasePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  /** Menu items to render — provided by the parent feature component */
  readonly menuItems = input<MenuItem[]>([]);

  /** Display name of the logged-in user */
  readonly accountName = input<string>('Usuario');

  /** Role label shown in the sidebar (e.g. 'Admin', 'Director') */
  readonly userRole = input<string>('');

  /** Emitted when the user clicks "Cerrar sesión" */
  readonly logoutClick = output<void>();

  /** Internal UI state — collapsed/expanded */
  protected isCollapsed = signal(false);

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }
}
