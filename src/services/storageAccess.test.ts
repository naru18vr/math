import { afterEach, describe, expect, it, vi } from 'vitest';
import { readHistory, saveHistory } from './historyService';
import { loadProfiles, safeStorageSet, DEFAULT_PROFILES } from './profileService';
import { readReportStore, saveReportRecord, quizResultToReport } from './reportingService';

describe('blocked localStorage access', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
    it('survives when accessing the storage property itself throws', () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            expect(readHistory()).toEqual([]);
            expect(readReportStore()).toEqual([]);
            expect(loadProfiles()).toEqual(DEFAULT_PROFILES);
            expect(saveHistory([])).toBe(false);
            expect(safeStorageSet('key', 'value')).toBe(false);
            const record = quizResultToReport({ studentId: 'grade5', grade: '小5', topic: { id: 'g5_average', name: '平均' }, difficulty: '基礎', results: [], startTime: 0, endTime: 1000 });
            expect(saveReportRecord(record)).toBe(false);
        } finally {
            if (original) Object.defineProperty(globalThis, 'localStorage', original);
            else Reflect.deleteProperty(globalThis, 'localStorage');
        }
    });
});
