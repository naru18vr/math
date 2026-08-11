import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuizResult, StudentProfile } from '../types';
import { buildDailyReportText, buildWeeklyReportText, copyText, getWeeklySummary, mergeCompatibleReports, quizResultToReport, readReportStore, REPORT_STORAGE_KEY, saveReportRecord, toLocalDateKey } from './reportingService';

const result = (endTime: number, correct = 8, total = 10): QuizResult => ({
    studentId: 'grade5', grade: '小5', topic: { id: 'g5_average', name: '平均' }, difficulty: '標準',
    startTime: endTime - 15 * 60000, endTime,
    results: Array.from({ length: total }, (_, index) => ({
        question: { id: index, topicId: 'g5_average', text: '問題', answer: '1', explanation: '解説' },
        attempts: index < correct ? 0 : 3, isCorrect: index < correct, isSkipped: false,
    })),
});

const profile: StudentProfile = { id: 'grade5', name: '名前は報告しない', startGrade: '小5', dailyGoal: 10 };

afterEach(() => vi.unstubAllGlobals());

describe('report records', () => {
    it('uses the device local date even just after midnight', () => {
        expect(toLocalDateKey(new Date(2026, 6, 17, 0, 1))).toBe('2026-07-17');
    });

    it('does not duplicate the same quiz result', () => {
        const quiz = result(new Date(2026, 6, 17, 12).getTime());
        expect(mergeCompatibleReports([], [quiz, quiz])).toHaveLength(1);
    });

    it('keeps the current result when storage is corrupted or unwritable', () => {
        const broken = { getItem: () => '{broken' };
        expect(readReportStore(broken)).toEqual([]);
        const report = quizResultToReport(result(Date.now()));
        const unwritable = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
        expect(saveReportRecord(report, unwritable)).toBe(false);
        expect(report.total).toBe(10);
    });

    it('reads an older array-shaped version 1 store', () => {
        const report = quizResultToReport(result(Date.now()));
        const storage = { getItem: (key: string) => key === REPORT_STORAGE_KEY ? JSON.stringify([report]) : null };
        expect(readReportStore(storage)).toEqual([report]);
    });

    it('drops records with unsafe nested values or impossible totals', () => {
        const good = quizResultToReport(result(new Date(2026, 6, 17, 12).getTime()));
        const storage = { getItem: () => JSON.stringify({ version: 1, records: [
            good,
            { ...good, id: 'bad-array', strengths: [123] },
            { ...good, id: 'bad-total', correct: 2, total: 1 },
            { ...good, id: 'bad-date', date: 'not-a-date' },
            { ...good, id: 'invalid-calendar-date', date: '2026-02-30' },
        ] }) };
        expect(readReportStore(storage).map(item => item.id)).toEqual([good.id]);
    });

    it('removes duplicate report IDs while keeping the newest record', () => {
        const first = quizResultToReport(result(new Date(2026, 6, 17, 12).getTime()));
        const newer = { ...first, completedAt: new Date(2026, 6, 18, 12).toISOString(), date: '2026-07-18' };
        const storage = { getItem: () => JSON.stringify({ version: 1, records: [first, newer] }) };
        expect(readReportStore(storage)).toEqual([newer]);
    });
});

describe('report text and weekly totals', () => {
    it('creates a complete daily report without the learner name', () => {
        const report = quizResultToReport(result(new Date(2026, 6, 17, 12).getTime()));
        const text = buildDailyReportText(report, 6, 'https://example.com/app/#history');
        expect(text).toContain('【今日の学習報告】');
        expect(text).toContain('8／10問（80%）');
        expect(text).toContain('連続学習：6日');
        expect(text).toContain('https://example.com/app/#history');
        expect(text).not.toContain(profile.name);
    });

    it('handles zero, one, seven days, and the previous week', () => {
        const now = new Date(2026, 6, 17, 12);
        expect(getWeeklySummary([], now).total).toBe(0);
        expect(getWeeklySummary([quizResultToReport(result(now.getTime()))], now).studyDays).toBe(1);
        const records = Array.from({ length: 8 }, (_, offset) => quizResultToReport(result(new Date(2026, 6, 17 - offset, 12).getTime())));
        const summary = getWeeklySummary(records, now);
        expect(summary.studyDays).toBe(7);
        expect(summary.total).toBe(70);
        expect(summary.previousStudyDays).toBe(1);
        expect(buildWeeklyReportText(summary, profile, now)).toContain('7日学習し、合計70問');
    });

    it('shows exam countdown and pass-range judgment when configured', () => {
        const now = new Date(2026, 6, 17, 12);
        const summary = getWeeklySummary([quizResultToReport(result(now.getTime(), 9, 10))], now);
        const text = buildWeeklyReportText(summary, { ...profile, examDate: '2026-07-20', targetScore: 80 }, now);
        expect(text).toContain('試験まで：あと3日');
        expect(text).toContain('合格圏です');
    });
});

describe('clipboard copy', () => {
    it('reports success with Clipboard API', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('window', { isSecureContext: true });
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        expect(await copyText('報告')).toBe(true);
        expect(writeText).toHaveBeenCalledWith('報告');
    });

    it('uses fallback and reports failure when copying is unavailable', async () => {
        const textarea = { value: '', style: {}, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn() };
        vi.stubGlobal('window', { isSecureContext: false });
        vi.stubGlobal('navigator', {});
        vi.stubGlobal('document', { createElement: () => textarea, body: { appendChild: vi.fn() }, execCommand: () => false });
        expect(await copyText('報告')).toBe(false);
        expect(textarea.remove).toHaveBeenCalled();
    });

    it('reports success with the legacy Android copy fallback', async () => {
        const textarea = { value: '', style: {}, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn() };
        vi.stubGlobal('window', { isSecureContext: false });
        vi.stubGlobal('navigator', {});
        vi.stubGlobal('document', { createElement: () => textarea, body: { appendChild: vi.fn() }, execCommand: () => true });
        expect(await copyText('報告')).toBe(true);
        expect(textarea.setSelectionRange).toHaveBeenCalled();
    });
});
