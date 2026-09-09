import { Routes } from '@angular/router'
import { LoginComponent } from './login/login'
import { AdminDashboardComponent } from './features/admin/admin'
import { DirectorComponent } from './features/director/director'
import { UnauthorizedComponent } from './shared/unauthorized/unauthorized'
import { RoleGuard } from '../auth/guards/role.guard'

export const routes: Routes = [
  // Pública
  { path: 'login', component: LoginComponent },

  // Super admin — por encima de todos los roles
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    canActivate: [RoleGuard],
    data: { roles: ['admin'] }
  },

  // Rol Director
  { 
    path: 'director', 
    component: DirectorComponent,
    canActivate: [RoleGuard],
    data: { roles: ['director'] }
  },

  // Usuario autenticado sin rol asignado
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Raíz → login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
]
