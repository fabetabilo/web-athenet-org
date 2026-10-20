import { environment } from '../../../../environments/environment';

// TODO(bff-shared): único cruce de admin hacia director; apuntar a shared al mover bff.ts.
export { withBffToken } from '../../director/services/bff';

/** `{bffUrl}/api/admin`: exige el rol admin. */
export function bffAdminUrl(): string {
  return `${environment.bffUrl.replace(/\/+$/, '')}/api/admin`;
}

// Contrato del BFF en inglés; los servicios lo traducen a los modelos en español de las vistas.

export interface AdminSport {
  id: number;
  name: string;
  description: string | null;
}
export type AdminSportWrite = Omit<AdminSport, 'id'>;

export interface AdminInstitution {
  id: number;
  name: string;
  acronym: string | null;
  imageUrl: string | null;
  active: boolean;
}
export type AdminInstitutionWrite = Omit<AdminInstitution, 'id'>;

export interface AdminCampus {
  id: number;
  name: string;
  city: string;
  address: string;
  institutionId: number;
  institutionName: string;
}
export type AdminCampusWrite = Omit<AdminCampus, 'id' | 'institutionName'>;

/** `division`: MASCULINO, FEMENINO o MIXTO. `active` no se acepta en escritura. */
export interface AdminTeam {
  id: number;
  name: string;
  division: string;
  coach: string | null;
  logoUrl: string | null;
  campusId: number;
  campusName: string;
  sportId: number;
  sportName: string;
  active: boolean;
}
export type AdminTeamWrite = Omit<AdminTeam, 'id' | 'campusName' | 'sportName' | 'active'>;
