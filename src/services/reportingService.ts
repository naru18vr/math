import { TOPICS_BY_GRADE } from '../constants';
import type { QuizResult, StudentProfile, TopicId } from '../types';

export const REPORT_STORAGE_KEY = 'calculation-training-reports-v1';
export const REPORT_VERSION = 1;

export interface LearningReportRecord {
    version: 1;
    id: string;
    studentId: string;
    date: string;
    completedAt: string;
    durationMinutes: number;
    activity: string;
    correct: number;
    total: number;
    strengths: string[];
    weaknesses: string[];
    nextAction: string;
    isAssessment: boolean;
}

interface ReportStore {
    version: 1;
    records: LearningReportRecord[];
}

export interface WeeklySummary {
    records: LearningReportRecord[];
    studyDays: number;
    durationMinutes: number;
    correct: number;
    total: number;
    accuracy: number;
    previousStudyDays: number;
    previousDurationMinutes: number;
    previousAccuracy: number;
    strengths: string[];
    weaknesses: string[];
    assessments: Array<{ activity: string; correct: number; total: number; accuracy: number }>;
}

const topicNames = new Map<TopicId, string>(
    Object.values(TOPICS_BY_GRADE).flat().map(topic => [topic.id, topic.name]),
);

const pad = (value: number) => value.toString().padStart(2, '0');

export const toLocalDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isValidLocalDateKey = (value: string): boolean => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const localDayNumber = (dateKey: string): number => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

const hashText = (text: string): string => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const groupedTopicPerformance = (result: QuizResult) => {
    const groups = new Map<string, { correct: number; total: number }>();
    result.results.forEach(item => {
        const name = item.question.topicId ? topicNames.get(item.question.topicId) : undefined;
        const key = name ?? result.topic.name;
        const current = groups.get(key) ?? { correct: 0, total: 0 };
        current.total++;
        if (item.isCorrect) current.correct++;
        groups.set(key, current);
    });
    return [...groups.entries()].map(([name, performance]) => ({ name, ...performance, accuracy: performance.total ? performance.correct / performance.total * 100 : 0 }));
};

export const quizResultToReport = (result: QuizResult): LearningReportRecord => {
    const completedAt = new Date(result.endTime);
    const performance = groupedTopicPerformance(result);
    const strengths = performance.filter(item => item.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).map(item => item.name).slice(0, 3);
    const weaknesses = performance.filter(item => item.accuracy < 80).sort((a, b) => a.accuracy - b.accuracy).map(item => item.name).slice(0, 3);
    const correct = result.results.filter(item => item.isCorrect).length;
    const nextAction = weaknesses.length > 0
        ? `${weaknesses[0]}の間違えた問題を復習します。`
        : `${result.topic.name}の次の難易度に進みます。`;
    const identity = `${result.studentId ?? 'grade5'}|${result.endTime}|${result.topic.id}|${result.results.length}|${correct}`;
    return {
        version: REPORT_VERSION,
        id: `report-${hashText(identity)}`,
        studentId: result.studentId ?? 'grade5',
        date: toLocalDateKey(completedAt),
        completedAt: completedAt.toISOString(),
        durationMinutes: Math.max(1, Math.round(Math.max(0, result.endTime - result.startTime) / 60000)),
        activity: `${result.grade}・${result.topic.name}${result.difficulty ? `（${result.difficulty}）` : ''}`,
        correct,
        total: result.results.length,
        strengths: strengths.length > 0 ? strengths : ['最後まで取り組みました'],
        weaknesses,
        nextAction,
        isAssessment: result.topic.id === 'mixed',
    };
};

const isValidRecord = (value: unknown): value is LearningReportRecord => {
    if (!value || typeof value !== 'object') return false;
    const record = value as Partial<LearningReportRecord>;
    return record.version === 1 && typeof record.id === 'string' && typeof record.studentId === 'string'
        && typeof record.date === 'string' && isValidLocalDateKey(record.date)
        && typeof record.completedAt === 'string' && Number.isFinite(Date.parse(record.completedAt)) && typeof record.activity === 'string'
        && typeof record.correct === 'number' && Number.isFinite(record.correct) && record.correct >= 0
        && typeof record.total === 'number' && Number.isFinite(record.total) && record.total >= record.correct
        && typeof record.durationMinutes === 'number' && Number.isFinite(record.durationMinutes) && record.durationMinutes >= 0
        && Array.isArray(record.strengths) && record.strengths.every(item => typeof item === 'string')
        && Array.isArray(record.weaknesses) && record.weaknesses.every(item => typeof item === 'string')
        && typeof record.nextAction === 'string';
};

export const readReportStore = (storage: Pick<Storage, 'getItem'> = localStorage): LearningReportRecord[] => {
    try {
        const raw = storage.getItem(REPORT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        const candidates = Array.isArray(parsed) ? parsed : (parsed as Partial<ReportStore>)?.records;
        if (!Array.isArray(candidates)) return [];
        const unique = new Map<string, LearningReportRecord>();
        candidates.filter(isValidRecord).forEach(record => unique.set(record.id, record));
        return [...unique.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    } catch {
        return [];
    }
};

export const mergeCompatibleReports = (stored: LearningReportRecord[], history: QuizResult[]): LearningReportRecord[] => {
    const byId = new Map<string, LearningReportRecord>();
    [...stored, ...history.map(quizResultToReport)].forEach(record => byId.set(record.id, record));
    return [...byId.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
};

export const saveReportRecord = (record: LearningReportRecord, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): boolean => {
    try {
        const records = mergeCompatibleReports(readReportStore(storage), []);
        if (!records.some(item => item.id === record.id)) records.unshift(record);
        storage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ version: REPORT_VERSION, records } satisfies ReportStore));
        return true;
    } catch {
        return false;
    }
};

const aggregateAreas = (records: LearningReportRecord[], kind: 'strengths' | 'weaknesses') => {
    const counts = new Map<string, number>();
    records.flatMap(record => record[kind]).forEach(area => counts.set(area, (counts.get(area) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([area]) => area).slice(0, 3);
};

const summarizePeriod = (records: LearningReportRecord[]) => {
    const total = records.reduce((sum, record) => sum + Math.max(0, record.total), 0);
    const correct = records.reduce((sum, record) => sum + Math.max(0, record.correct), 0);
    return {
        studyDays: new Set(records.map(record => record.date)).size,
        durationMinutes: records.reduce((sum, record) => sum + Math.max(0, record.durationMinutes), 0),
        correct,
        total,
        accuracy: total > 0 ? Math.round(correct / total * 100) : 0,
    };
};

export const getWeeklySummary = (records: LearningReportRecord[], now = new Date()): WeeklySummary => {
    const today = localDayNumber(toLocalDateKey(now));
    const validRecords = records.filter(record => isValidLocalDateKey(record.date));
    const current = validRecords.filter(record => { const day = localDayNumber(record.date); return day <= today && day >= today - 6; });
    const previous = validRecords.filter(record => { const day = localDayNumber(record.date); return day <= today - 7 && day >= today - 13; });
    const currentTotals = summarizePeriod(current);
    const previousTotals = summarizePeriod(previous);
    return {
        records: current,
        ...currentTotals,
        previousStudyDays: previousTotals.studyDays,
        previousDurationMinutes: previousTotals.durationMinutes,
        previousAccuracy: previousTotals.accuracy,
        strengths: aggregateAreas(current, 'strengths'),
        weaknesses: aggregateAreas(current, 'weaknesses'),
        assessments: current.filter(record => record.isAssessment).map(record => ({ activity: record.activity, correct: record.correct, total: record.total, accuracy: record.total ? Math.round(record.correct / record.total * 100) : 0 })),
    };
};

const formatMonthDay = (dateKey: string) => {
    const [, month, day] = dateKey.split('-').map(Number);
    return `${month}月${day}日`;
};

const linesFor = (items: string[], empty: string) => items.length > 0 ? items.map(item => `・${item}`).join('\n') : `・${empty}`;

export const buildDailyReportText = (record: LearningReportRecord, streak: number, resultUrl: string): string => {
    const accuracy = record.total > 0 ? Math.round(record.correct / record.total * 100) : 0;
    return `【今日の学習報告】\n${formatMonthDay(record.date)}\n学習時間：${record.durationMinutes}分\n取り組み：${record.activity}\n今日の結果：${record.correct}／${record.total}問（${accuracy}%）\n\nできたこと：\n${linesFor(record.strengths, '最後まで取り組みました')}\n\n復習すること：\n${linesFor(record.weaknesses, '大きな間違いはありませんでした')}\n\n次回：\n${record.nextAction}\n\n連続学習：${streak}日\n結果を見る：\n${resultUrl}`;
};

const comparisonText = (current: number, previous: number, unit: string) => {
    const difference = current - previous;
    if (difference === 0) return `前週と同じ${current}${unit}`;
    return `前週より${Math.abs(difference)}${unit}${difference > 0 ? '増えました' : '少なくなりました'}`;
};

export const buildWeeklyReportText = (summary: WeeklySummary, profile: StudentProfile, now = new Date()): string => {
    const assessments = summary.assessments.length > 0
        ? summary.assessments.map(item => `・${item.activity}：${item.correct}／${item.total}問（${item.accuracy}%）`).join('\n')
        : '・今週は総合テスト・確認テストを受けていません';
    const nextGoal = summary.weaknesses.length > 0 ? `${summary.weaknesses[0]}を重点的に復習します。` : `1日${profile.dailyGoal}問を続けます。`;
    let exam = '試験日：未設定';
    if (profile.examDate) {
        const remaining = localDayNumber(profile.examDate) - localDayNumber(toLocalDateKey(now));
        const target = profile.targetScore ?? 80;
        const zone = summary.total === 0 ? '判定できません' : summary.accuracy >= target ? '合格圏です' : summary.accuracy >= target - 10 ? '合格圏まであと少しです' : '重点的な復習が必要です';
        exam = `試験まで：${remaining >= 0 ? `あと${remaining}日` : '終了'}\n目標正答率：${target}%／現在：${summary.accuracy}%（${zone}）`;
    }
    return `【1週間の学習報告】\n学習した日：${summary.studyDays}日\n合計学習時間：${summary.durationMinutes}分\n合計問題数：${summary.total}問\n平均正答率：${summary.accuracy}%\n前週との比較：${comparisonText(summary.studyDays, summary.previousStudyDays, '日')}、学習時間は${comparisonText(summary.durationMinutes, summary.previousDurationMinutes, '分')}。\n\nよくできた分野：\n${linesFor(summary.strengths, '学習記録をためている途中です')}\n\n復習したい分野：\n${linesFor(summary.weaknesses, '大きな弱点は見つかっていません')}\n\n今週覚えた単語数：数学アプリのため対象外\n\n確認テスト：\n${assessments}\n\n努力・継続：\n${summary.studyDays > 0 ? `${summary.studyDays}日学習し、合計${summary.total}問に取り組みました。` : 'まだ今週の学習記録がありません。'}\n\n来週の目標：\n${nextGoal}\n\n${exam}`;
};

export const copyText = async (text: string): Promise<boolean> => {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to the Android-compatible selection copy.
    }
    let textarea: HTMLTextAreaElement | null = null;
    try {
        textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
        return copied;
    } catch {
        return false;
    } finally {
        textarea?.remove();
    }
};
