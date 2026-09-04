import { Injectable } from '@angular/core'
import { environment } from '../environments/environment'

// --- respuestas (de prueba)
export type PublicHolaResponse = {
  mensaje: string
  recurso: string
}

export type PrivateMeResponse = {
  mensaje: string
  sub: string
  aud: string | string[]
  scp: string | null
  preferred_username: string | null
  oid: string | null
  iss: string | null
}

// --- Servicio ------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl ?? 'http://localhost:8080'

  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * GET /public/hola — sin token cualquiera puede llamarla
   */
  async fetchPublicHola(): Promise<PublicHolaResponse> {
    const response = await fetch(`${this.baseUrl}/public/hola`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`GET /public/hola respondió ${response.status}`)
    }

    return response.json() as Promise<PublicHolaResponse>
  }

  /**
   * GET /api/me — requiere ID Token como Bearer
   *
   * NOTA: se manda el ID Token (result.idToken), NO el Access Token
   */
  async fetchPrivateMe(idToken: string): Promise<PrivateMeResponse> {
    const response = await fetch(`${this.baseUrl}/api/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`GET /api/me respondió ${response.status}`)
    }

    return response.json() as Promise<PrivateMeResponse>
  }
}
