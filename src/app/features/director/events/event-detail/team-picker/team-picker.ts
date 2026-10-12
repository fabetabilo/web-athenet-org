import {
  Component,
  DestroyRef,
  OnInit,
  Signal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY, Observable, catchError, distinctUntilChanged, merge, of, startWith, switchMap } from 'rxjs';

import { EventCatalogService } from '../../../services/event-catalog.service';
import type {
  CampusRef,
  InstitutionRef,
  MatchTeam,
  Organizer,
  TeamRef,
} from '../../../services/bff';
import { controlErrorMessage } from '../control-error';

/** `matchup`: un lado del partido (filtra por deporte, equipo obligatorio). `organizer`: equipo opcional. */
export type TeamPickerMode = 'matchup' | 'organizer';

/** Cadena ya elegida, tal como la trae el GET del evento. */
export interface CascadeSeed {
  institution: InstitutionRef | null;
  campus: CampusRef | null;
  team: TeamRef | null;
}

export function seedFromTeam(chain: MatchTeam | null | undefined): CascadeSeed | null {
  if (!chain) return null;
  const { campus, institution, ...team } = chain;
  return { institution, campus, team };
}

export function seedFromOrganizer(organizer: Organizer | null | undefined): CascadeSeed | null {
  return organizer ? { ...organizer } : null;
}

/**
 * Antepone `selected` a la lista si no está, para que el `mat-select` no quede
 * en blanco cuando la opción guardada no viene en el catálogo.
 */
export function withSelected<T>(list: T[], selected: T | null | undefined, key: (item: T) => unknown): T[] {
  if (!selected) return list;
  const selectedKey = key(selected);
  return list.some((item) => key(item) === selectedKey) ? list : [selected, ...list];
}

type LevelState = 'idle' | 'loading' | 'error';

class Level<T> {
  readonly list = signal<T[]>([]);
  readonly state = signal<LevelState>('idle');
}

const byId = (item: { id: number }) => item.id;

/**
 * Cascada `institución → sede → equipo` sobre tres controles del formulario
 * padre. Elegir un nivel limpia los de abajo (solo por acción de la persona);
 * en modo lectura no pide listas y muestra `seed`.
 */
@Component({
  selector: 'app-team-picker',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './team-picker.html',
  styleUrl: './team-picker.scss',
})
export class TeamPickerComponent implements OnInit {
  private readonly catalog = inject(EventCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input.required<string>();
  readonly mode = input<TeamPickerMode>('matchup');
  readonly sportId = input<number | null>(null);
  readonly institution = input.required<FormControl<number | null>>();
  readonly campus = input.required<FormControl<number | null>>();
  readonly team = input.required<FormControl<number | null>>();
  readonly seed = input<CascadeSeed | null>(null);
  /** El equipo 2 recibe la división del equipo 1. */
  readonly division = input<string | null>(null);
  /** Oculta el equipo elegido al otro lado. */
  readonly excludeTeamId = input<number | null>(null);

  readonly selectedTeam = output<TeamRef | null>();

  private readonly institutionId = signal<number | null>(null);
  private readonly campusId = signal<number | null>(null);
  private readonly teamId = signal<number | null>(null);
  protected readonly editable = signal(false);

  // Las opciones del catálogo y la cadena guardada (`seed`) comparten forma.
  protected readonly institutions = new Level<InstitutionRef>();
  protected readonly campuses = new Level<CampusRef>();
  protected readonly teams = new Level<TeamRef>();

  protected readonly isMatchup = computed(() => this.mode() === 'matchup');
  protected readonly waitingForSport = computed(() => this.isMatchup() && this.sportId() === null);

  protected readonly institutionOptions = computed(() =>
    withSelected(this.institutions.list(), this.seedFor('institution', this.institutionId()), byId),
  );
  protected readonly campusOptions = computed(() =>
    withSelected(this.campuses.list(), this.seedFor('campus', this.campusId()), byId),
  );
  protected readonly teamOptions = computed(() => {
    const current = this.teamId();
    const excluded = this.excludeTeamId();
    return withSelected(this.teams.list(), this.seedFor('team', current), byId).filter(
      (team) => team.id !== excluded || team.id === current,
    );
  });

  private readonly selected = computed(
    () => this.teamOptions().find((team) => team.id === this.teamId()) ?? null,
  );

  protected readonly errorMessage = controlErrorMessage;

  constructor() {
    this.loadLevel(
      computed(() =>
        this.editable() && !this.waitingForSport()
          ? { sportId: this.isMatchup() ? this.sportId() : null }
          : null,
      ),
      (q) => this.catalog.getInstitutions(q.sportId),
      this.institutions,
    );

    this.loadLevel(
      computed(() => {
        const institutionId = this.institutionId();
        return this.editable() && institutionId !== null && !this.waitingForSport()
          ? { institutionId, sportId: this.isMatchup() ? this.sportId() : null }
          : null;
      }),
      (q) => this.catalog.getCampuses(q.institutionId, q.sportId),
      this.campuses,
    );

    this.loadLevel(
      computed(() => {
        const campusId = this.campusId();
        return this.editable() && campusId !== null && !this.waitingForSport()
          ? { campusId, sportId: this.sportId(), division: this.isMatchup() ? this.division() : null }
          : null;
      }),
      (q) => this.catalog.getTeams(q.campusId, q.sportId, q.division),
      this.teams,
    );

    effect(() => this.selectedTeam.emit(this.selected()));
  }

  ngOnInit(): void {
    const institution = this.institution();
    // El status del padre se emite al final de form.enable()/disable().
    merge(
      institution.valueChanges,
      this.campus().valueChanges,
      this.team().valueChanges,
      institution.statusChanges,
      institution.parent?.statusChanges ?? EMPTY,
    )
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sync());
  }

  protected onInstitutionSelected(): void {
    this.campus().setValue(null);
    this.team().setValue(null);
  }

  protected onCampusSelected(): void {
    this.team().setValue(null);
  }

  protected hint(level: Level<unknown>, ready: boolean, loadingText: string, emptyText: string): string | null {
    if (!this.editable() || !ready) return null;
    switch (level.state()) {
      case 'loading':
        return loadingText;
      case 'error':
        return 'No se pudo cargar la lista. Intenta nuevamente.';
      default:
        return level.list().length === 0 ? emptyText : null;
    }
  }

  protected institutionHint(): string | null {
    if (this.editable() && this.waitingForSport()) return 'Elige primero un deporte.';
    return this.hint(
      this.institutions,
      true,
      'Cargando instituciones…',
      this.isMatchup() ? 'Sin instituciones con equipos de este deporte.' : 'Sin instituciones disponibles.',
    );
  }

  protected campusHint(): string | null {
    return this.hint(
      this.campuses,
      this.institutionId() !== null,
      'Cargando sedes…',
      this.isMatchup() ? 'Sin sedes con equipos de este deporte.' : 'Esta institución no tiene sedes.',
    );
  }

  protected teamHint(): string | null {
    return this.hint(this.teams, this.campusId() !== null, 'Cargando equipos…', 'Sin equipos disponibles en esta sede.');
  }

  /** Copia los controles a signals y habilita cada nivel según el anterior. */
  private sync(): void {
    const institution = this.institution();
    const campus = this.campus();
    const team = this.team();

    this.institutionId.set(institution.value);
    this.campusId.set(campus.value);
    this.teamId.set(team.value);
    this.editable.set(institution.enabled);

    if (institution.disabled) return;
    setEnabled(campus, institution.value !== null);
    setEnabled(team, campus.enabled && campus.value !== null);
  }

  private seedFor<K extends keyof CascadeSeed>(level: K, value: number | null): CascadeSeed[K] | null {
    const item = this.seed()?.[level] ?? null;
    return item && item.id === value ? item : null;
  }

  /** Recarga el nivel cuando cambia su consulta; `null` lo vacía. `switchMap` descarta respuestas viejas. */
  private loadLevel<Q, T>(query: Signal<Q | null>, fetch: (q: Q) => Observable<T[]>, level: Level<T>): void {
    toObservable(query)
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap((q) => {
          if (q === null) {
            level.state.set('idle');
            return of([] as T[]);
          }
          level.state.set('loading');
          return fetch(q).pipe(
            catchError(() => {
              level.state.set('error');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        level.list.set(list ?? []);
        if (list) level.state.set('idle');
      });
  }
}

/** Sin emitir eventos, para no realimentar `sync()`. */
function setEnabled(control: FormControl<number | null>, enabled: boolean): void {
  if (enabled && control.disabled) control.enable({ emitEvent: false });
  if (!enabled && control.enabled) control.disable({ emitEvent: false });
}
