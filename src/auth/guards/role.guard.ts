import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { MsalService } from '@azure/msal-angular'

export const RoleGuard: CanActivateFn = (route, state) => {
  const authService = inject(MsalService)
  const router = inject(Router)

  const account = authService.instance.getActiveAccount()
  // si no hay cuenta activa: a /login
  if (!account) {
    return router.createUrlTree(['/login'])
  }

  const expectedRoles: string[] = route.data['roles'] || []
  const userRoles: string[] = (account.idTokenClaims?.['roles'] as string[]) ?? []
  // verifica si el usuario al menos tiene un rol
  const hasRole = expectedRoles.some(role => userRoles.includes(role))

  if (hasRole) {
    return true
  }
  // si no: no esta autorizado
  return router.createUrlTree(['/unauthorized'])
}
