import { clearScoreDraft, loadScoreDraft, saveScoreDraft } from './score-draft';

describe('score-draft', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('debe guardar y leer el marcador de cada partido por separado', () => {
    saveScoreDraft(7, { home: 2, away: 1 });
    saveScoreDraft(8, { home: 0, away: 3 });

    expect(loadScoreDraft(7)).toEqual({ home: 2, away: 1 });
    expect(loadScoreDraft(8)).toEqual({ home: 0, away: 3 });
    expect(loadScoreDraft(9)).toBeNull();
  });

  it('debe borrar el marcador', () => {
    saveScoreDraft(7, { home: 2, away: 1 });
    clearScoreDraft(7);
    expect(loadScoreDraft(7)).toBeNull();
  });

  it('debe ignorar un valor corrupto o con goles inválidos', () => {
    localStorage.setItem('athenet:delegate:score:7', '{no es json');
    expect(loadScoreDraft(7)).toBeNull();

    localStorage.setItem('athenet:delegate:score:7', JSON.stringify({ home: -1, away: 2 }));
    expect(loadScoreDraft(7)).toBeNull();

    localStorage.setItem('athenet:delegate:score:7', JSON.stringify({ home: 1.5, away: 2 }));
    expect(loadScoreDraft(7)).toBeNull();
  });

  it('no debe fallar si el almacenamiento no está disponible', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveScoreDraft(7, { home: 1, away: 0 })).not.toThrow();
    setItem.mockRestore();
  });
});
