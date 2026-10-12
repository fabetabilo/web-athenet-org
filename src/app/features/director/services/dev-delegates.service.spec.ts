import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserApiService, type AthenetUser } from '../../admin/services/user-api.service';
import { DevDelegatesService } from './dev-delegates.service';

// TEMPORAL: se borra junto con DevDelegatesService cuando el BFF exponga /delegates.
describe('DevDelegatesService (temporal)', () => {
  const user = (id: string, displayName: string, roles: string[], accountEnabled = true): AthenetUser => ({
    id,
    displayName,
    userPrincipalName: `${id}@athenet.cl`,
    mail: null,
    accountEnabled,
    roles,
  });

  it('debe quedarse solo con delegados habilitados, ordenados por nombre', () => {
    const users = [
      user('1', 'Pedro Soto', ['delegate']),
      user('2', 'Ana Admin', ['admin']),
      user('3', 'Diego Director', ['director', 'delegate']),
      user('4', 'Inés Inactiva', ['delegate'], false),
    ];
    TestBed.configureTestingModule({
      providers: [{ provide: UserApiService, useValue: { getDirectory: () => of({ users, roles: [] }) } }],
    });

    let result: unknown;
    TestBed.inject(DevDelegatesService).getDelegates().subscribe((list) => (result = list));

    expect(result).toEqual([
      { oid: '3', displayName: 'Diego Director' },
      { oid: '1', displayName: 'Pedro Soto' },
    ]);
  });
});
