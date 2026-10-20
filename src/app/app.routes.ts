import { Routes } from '@angular/router'
import { LoginComponent } from './login/login'
import { AdminDashboardComponent } from './features/admin/admin'
import { AdminHomeComponent } from './features/admin/home/home'
import { InstitucionesComponent } from './features/admin/instituciones/instituciones'
import { SedesComponent } from './features/admin/sedes/sedes'
import { DeportesComponent } from './features/admin/deportes/deportes'
import { EquiposComponent } from './features/admin/equipos/equipos'
import { UsersComponent } from './features/admin/users/users'
import { DirectorComponent } from './features/director/director'
import { DirectorHomeComponent } from './features/director/home/home'
import { DirectorEventsComponent } from './features/director/events/events'
import { EventDetailComponent } from './features/director/events/event-detail/event-detail'
import { DirectorCompetitionsComponent } from './features/director/competitions/competitions'
import { CompetitionDetailComponent } from './features/director/competitions/competition-detail/competition-detail'
import { DelegateComponent } from './features/delegate/delegate'
import { DelegateHomeComponent } from './features/delegate/home/home'
import { DelegateEventsComponent } from './features/delegate/events/events'
import { MatchBoardComponent } from './features/delegate/events/match-board/match-board'
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
    data: { roles: ['admin'] },
    children: [
      { path: '', component: AdminHomeComponent },
      { path: 'instituciones', component: InstitucionesComponent },
      { path: 'sedes', component: SedesComponent },
      { path: 'deportes', component: DeportesComponent },
      { path: 'equipos', component: EquiposComponent },
      { path: 'users', component: UsersComponent },
    ]
  },

  // Rol Director
  {
    path: 'director',
    component: DirectorComponent,
    canActivate: [RoleGuard],
    data: { roles: ['director'] },
    children: [
      { path: '', component: DirectorHomeComponent },
      { path: 'events', component: DirectorEventsComponent },
      { path: 'events/:internalId', component: EventDetailComponent },
      { path: 'competitions', component: DirectorCompetitionsComponent },
      { path: 'competitions/:id', component: CompetitionDetailComponent },
    ]
  },

  // Rol Delegado
  {
    path: 'delegate',
    component: DelegateComponent,
    canActivate: [RoleGuard],
    data: { roles: ['delegate'] },
    children: [
      { path: '', component: DelegateHomeComponent },
      { path: 'events', component: DelegateEventsComponent },
      { path: 'events/:id', component: MatchBoardComponent },
    ]
  },

  // Usuario autenticado sin rol asignado
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Raíz → login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
]
