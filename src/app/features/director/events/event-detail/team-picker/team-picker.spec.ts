import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Subject, of } from 'rxjs';
import {
  TeamPickerComponent,
  seedFromTeam,
  withSelected,
  type CascadeSeed,
  type TeamPickerMode,
} from './team-picker';
import { EventCatalogService } from '../../../services/event-catalog.service';
import type { CampusOption, InstitutionOption, MatchTeam, TeamOption, TeamRef } from '../../../services/bff';

@Component({
  standalone: true,
  imports: [TeamPickerComponent],
  template: `
    <app-team-picker
      label="Equipo 1"
      [mode]="mode()"
      [sportId]="sportId()"
      [institution]="institution"
      [campus]="campus"
      [team]="team"
      [seed]="seed()"
      [division]="division()"
      [excludeTeamId]="exclude()"
      (selectedTeam)="selected = $event"
    />
  `,
})
class HostComponent {
  readonly institution = new FormControl<number | null>(null);
  readonly campus = new FormControl<number | null>(null);
  readonly team = new FormControl<number | null>(null);
  readonly form = new FormGroup({ institution: this.institution, campus: this.campus, team: this.team });

  readonly mode = signal<TeamPickerMode>('matchup');
  readonly sportId = signal<number | null>(3);
  readonly seed = signal<CascadeSeed | null>(null);
  readonly division = signal<string | null>(null);
  readonly exclude = signal<number | null>(null);
  selected: TeamRef | null = null;
}

describe('TeamPickerComponent', () => {
  const INSTITUTIONS: InstitutionOption[] = [
    { id: 2, name: 'Universidad de Chile', acronym: 'UCH' },
    { id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' },
  ];
  const USACH_CAMPUSES: CampusOption[] = [
    { id: 10, name: 'Casa Central' },
    { id: 11, name: 'Campus Estación Central' },
  ];
  /** Lado de un partido tal como lo trae el GET del evento. */
  const TEAM_ONE: MatchTeam = {
    id: 100,
    name: 'USACH Fútbol Varones',
    division: 'MASCULINO',
    campus: { id: 10, name: 'Casa Central' },
    institution: { id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' },
  };

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let catalogMock: { getInstitutions: any; getCampuses: any; getTeams: any };

  const TEAMS_CAMPUS_10: TeamOption[] = [
    { id: 100, name: 'USACH Fútbol Varones', division: 'MASCULINO' },
    { id: 101, name: 'USACH Fútbol Damas', division: 'FEMENINO' },
  ];

  const picker = (): any => fixture.debugElement.query(By.directive(TeamPickerComponent)).componentInstance;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Lo que haría la persona al elegir en el mat-select. */
  async function chooseInstitution(id: number): Promise<void> {
    host.institution.setValue(id);
    picker().onInstitutionSelected();
    await settle();
  }

  async function chooseCampus(id: number): Promise<void> {
    host.campus.setValue(id);
    picker().onCampusSelected();
    await settle();
  }

  beforeEach(async () => {
    catalogMock = {
      getInstitutions: vi.fn().mockReturnValue(of(INSTITUTIONS)),
      getCampuses: vi.fn().mockReturnValue(of(USACH_CAMPUSES)),
      getTeams: vi.fn().mockReturnValue(of(TEAMS_CAMPUS_10)),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideAnimations(), { provide: EventCatalogService, useValue: catalogMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  describe('modo lectura', () => {
    beforeEach(async () => {
      host.seed.set(seedFromTeam(TEAM_ONE));
      host.institution.setValue(1);
      host.campus.setValue(10);
      host.team.setValue(100);
      host.form.disable();
      await settle();
    });

    it('no debe pedir ninguna lista y debe mostrar los nombres del GET', () => {
      expect(catalogMock.getInstitutions).not.toHaveBeenCalled();
      expect(catalogMock.getCampuses).not.toHaveBeenCalled();
      expect(catalogMock.getTeams).not.toHaveBeenCalled();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Universidad de Santiago de Chile');
      expect(text).toContain('Casa Central');
      expect(text).toContain('USACH Fútbol Varones');
    });

    it('debe emitir el equipo elegido con su división', () => {
      expect(host.selected?.id).toBe(100);
      expect(host.selected?.division).toBe('MASCULINO');
    });

    it('al habilitar el formulario debe cargar las listas en paralelo, sin cascada', async () => {
      host.form.enable();
      await settle();

      expect(catalogMock.getInstitutions).toHaveBeenCalledWith();
      expect(catalogMock.getCampuses).toHaveBeenCalledWith(1);
      expect(catalogMock.getTeams).toHaveBeenCalledWith(10, 3, null);
      expect(host.campus.enabled).toBe(true);
      expect(host.team.enabled).toBe(true);
    });
  });

  describe('modo enfrentamiento', () => {
    beforeEach(async () => {
      await settle();
    });

    it('con deporte elegido debe pedir las instituciones, sin filtrarlas por él', () => {
      expect(catalogMock.getInstitutions).toHaveBeenCalledWith();
      expect(picker().institutionOptions()).toEqual(INSTITUTIONS);
    });

    it('cambiar de deporte no debe volver a pedir las instituciones', async () => {
      host.sportId.set(1);
      await settle();

      expect(catalogMock.getInstitutions).toHaveBeenCalledTimes(1);
    });

    it('debe habilitar cada nivel solo cuando el anterior tiene valor', async () => {
      expect(host.campus.disabled).toBe(true);
      expect(host.team.disabled).toBe(true);

      await chooseInstitution(1);
      expect(host.campus.enabled).toBe(true);
      expect(host.team.disabled).toBe(true);
      expect(catalogMock.getCampuses).toHaveBeenCalledWith(1);

      await chooseCampus(10);
      expect(host.team.enabled).toBe(true);
      expect(catalogMock.getTeams).toHaveBeenCalledWith(10, 3, null);
    });

    it('elegir otra institución debe limpiar sede y equipo hacia abajo', async () => {
      await chooseInstitution(1);
      await chooseCampus(10);
      host.team.setValue(100);

      await chooseInstitution(2);

      expect(host.campus.value).toBeNull();
      expect(host.team.value).toBeNull();
      expect(host.team.disabled).toBe(true);
    });

    it('no debe dejar que una respuesta vieja pise a la nueva', async () => {
      const lenta = new Subject<CampusOption[]>();
      const rapida = new Subject<CampusOption[]>();
      catalogMock.getCampuses.mockReturnValueOnce(lenta).mockReturnValueOnce(rapida);

      await chooseInstitution(1);
      await chooseInstitution(2);
      rapida.next([{ id: 20, name: 'Campus Juan Gómez Millas' }]);
      lenta.next([{ id: 10, name: 'Casa Central' }]);
      await settle();

      expect(picker().campusOptions().map((c: CampusOption) => c.id)).toEqual([20]);
    });

    it('debe filtrar los equipos por la división recibida', async () => {
      host.division.set('MASCULINO');
      await chooseInstitution(1);
      await chooseCampus(10);

      expect(catalogMock.getTeams).toHaveBeenCalledWith(10, 3, 'MASCULINO');
    });

    it('debe ocultar el equipo elegido al otro lado', async () => {
      host.exclude.set(100);
      await chooseInstitution(1);
      await chooseCampus(10);

      expect(picker().teamOptions().map((t: TeamOption) => t.id)).toEqual([101]);
    });

    it('una sede sin equipos del deporte debe avisarlo', async () => {
      catalogMock.getTeams.mockReturnValue(of([]));
      await chooseInstitution(1);
      await chooseCampus(10);

      expect(fixture.nativeElement.textContent).toContain('Sin equipos de este deporte en esta sede.');
    });

    it('sin deporte no debe listar nada y debe pedir elegirlo primero', async () => {
      catalogMock.getInstitutions.mockClear();
      host.sportId.set(null);
      await settle();

      expect(catalogMock.getInstitutions).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Elige primero un deporte.');
    });
  });

  describe('modo organizador', () => {
    beforeEach(async () => {
      host.mode.set('organizer');
      host.sportId.set(null);
      await settle();
    });

    it('debe listar todas las instituciones y sedes, y equipos sin filtro si no hay deporte', async () => {
      expect(catalogMock.getInstitutions).toHaveBeenCalledWith();

      await chooseInstitution(1);
      expect(catalogMock.getCampuses).toHaveBeenCalledWith(1);

      await chooseCampus(10);
      expect(catalogMock.getTeams).toHaveBeenCalledWith(10, null, null);
    });

    it('con deporte debe filtrar solo los equipos', async () => {
      host.sportId.set(3);
      await chooseInstitution(1);
      await chooseCampus(10);

      expect(catalogMock.getCampuses).toHaveBeenCalledWith(1);
      expect(catalogMock.getTeams).toHaveBeenCalledWith(10, 3, null);
    });

    it('debe ofrecer "Sin equipo" porque el equipo es opcional', async () => {
      await chooseInstitution(1);
      await chooseCampus(10);
      expect(fixture.nativeElement.textContent).toContain('Equipo (opcional)');
    });
  });
});

describe('withSelected', () => {
  const byId = (item: { id: number }) => item.id;

  it('debe anteponer la opción elegida si no está en la lista', () => {
    expect(withSelected([{ id: 2 }], { id: 1 }, byId)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('no debe duplicarla si ya está', () => {
    const list = [{ id: 1 }, { id: 2 }];
    expect(withSelected(list, { id: 1 }, byId)).toBe(list);
  });

  it('debe devolver la lista intacta si no hay opción elegida', () => {
    const list = [{ id: 1 }];
    expect(withSelected(list, null, byId)).toBe(list);
  });
});
