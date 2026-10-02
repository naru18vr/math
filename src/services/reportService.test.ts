import { describe, expect, it } from 'vitest';
import type { QuizResult } from '../types';
import { createHistoryCsv, downloadHistoryCsv } from './reportService';
import { vi } from 'vitest';

describe('report service', () => {
    it('exports imported text as text rather than spreadsheet formulas', () => {
        const history: QuizResult[] = [{ grade: '小5', topic: { id: 'g5_average', name: '=1+1' }, difficulty: '標準', startTime: 0, endTime: 1000, results: [] }];
        expect(createHistoryCsv(history)).toContain('"\'=1+1"');
    });
    it('reports a CSV download failure without throwing', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('URL', { createObjectURL: () => { throw new Error('blocked'); }, revokeObjectURL: vi.fn() });
        expect(downloadHistoryCsv([], '学習者')).toBe(false);
        vi.unstubAllGlobals();
        consoleSpy.mockRestore();
    });
    it('creates a spreadsheet-friendly CSV row', () => {
        const history: QuizResult[] = [{ studentId: 'grade5', grade: '小5', topic: { id: 'g5_average', name: '平均' }, difficulty: '標準', startTime: 0, endTime: 60000, results: [{ question: { id: 0, text: '問題', answer: '2', explanation: '解説' }, attempts: 0, isCorrect: true, isSkipped: false }] }];
        const csv = createHistoryCsv(history);
        expect(csv).toContain('"正答率(%)"');
        expect(csv).toContain('"平均","標準","1","1","100","60"');
    });
});
