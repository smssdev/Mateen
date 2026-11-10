import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalize } from './store';

describe('normalize', () => {
  it('migrates v0.1 surah goals and fills in new settings', () => {
    const s = normalize({ goals: [{ surah: 58, addedAt: 5 }] as never, settings: { newPerDay: 7 } as never });
    expect(s.goals).toEqual([{ kind: 'surah', n: 58, addedAt: 5 }]);
    expect(s.settings.newPerDay).toBe(7);
    expect(s.settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(s.settings.warnSimilar).toBe(true);
  });

  it('starts empty', () => {
    const s = normalize({});
    expect(s.goals).toEqual([]);
    expect(s.progress).toEqual({});
  });
});
