import { Routes } from '@angular/router'
import { LoginComponent } from './login/login'
import { AdminDashboardComponent } from './features/admin/admin'
import { DirectorComponent } from './features/director/director'
import { UnauthorizedComponent } from './shared/unauthorized/unauthorized'

export const routes: Routes = [
  // Pública
  { path: 'login', component: LoginComponent },

  // Super admin — por encima de todos los roles
  // TODO: agregar RoleGuard
  { path: 'admin', component: AdminDashboardComponent },

  // Rol Director
  // TODO: agregar RoleGuard
  { path: 'director', component: DirectorComponent },

  // Usuario autenticado sin rol asignado
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Raíz → login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
]
