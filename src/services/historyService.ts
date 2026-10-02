import { MAX_HISTORY_ENTRIES } from '../constants';
import type { Difficulty, Grade, QuestionResult, QuizResult, TopicId } from '../types';

export const HISTORY_KEY = 'calculation-training-history';

const GRADES = new Set<Grade>(['小4', '小5', '小6', '中1', '中2', '中3']);
const DIFFICULTIES = new Set<Difficulty>(['基礎', '標準', '発展']);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

const normalizeQuestionResult = (value: unknown): QuestionResult | null => {
    if (!isRecord(value) || !isRecord(value.question)) return null;
    const question = value.question;
    if (typeof question.id !== 'number' || !Number.isFinite(question.id)
        || typeof question.text !== 'string' || typeof question.answer !== 'string' || typeof question.explanation !== 'string') return null;
    if (typeof value.isCorrect !== 'boolean' || typeof value.isSkipped !== 'boolean'
        || typeof value.attempts !== 'number' || !Number.isFinite(value.attempts)) return null;
    return {
        question: {
            id: question.id,
            ...(typeof question.topicId === 'string' ? { topicId: question.topicId as TopicId } : {}),
            text: question.text,
            answer: question.answer,
            explanation: question.explanation,
        },
        attempts: Math.max(0, Math.round(value.attempts)),
        isCorrect: value.isCorrect,
        isSkipped: value.isSkipped,
    };
};

const normalizeQuizResult = (value: unknown): QuizResult | null => {
    if (!isRecord(value) || !GRADES.has(value.grade as Grade) || !isRecord(value.topic) || !Array.isArray(value.results)) return null;
    if (typeof value.topic.id !== 'string' || typeof value.topic.name !== 'string' || !value.topic.name.trim()) return null;
    if (typeof value.startTime !== 'number' || !Number.isFinite(value.startTime)
        || typeof value.endTime !== 'number' || !Number.isFinite(value.endTime)
        || !Number.isFinite(new Date(value.startTime).getTime()) || !Number.isFinite(new Date(value.endTime).getTime())) return null;
    const results = value.results.map(normalizeQuestionResult).filter((item): item is QuestionResult => item !== null);
    if (results.length !== value.results.length) return null;
    const difficulty = value.difficulty === null || DIFFICULTIES.has(value.difficulty as Difficulty)
        ? value.difficulty as Difficulty | null
        : null;
    return {
        studentId: value.studentId === 'middle2' ? 'middle2' : 'grade5',
        grade: value.grade as Grade,
        topic: { id: value.topic.id as TopicId, name: value.topic.name.trim() },
        difficulty,
        results,
        startTime: Math.max(0, value.startTime),
        endTime: Math.max(0, value.startTime, value.endTime),
    };
};

const historyIdentity = (result: QuizResult): string =>
    `${result.studentId ?? 'grade5'}|${result.endTime}|${result.topic.id}|${result.results.length}`;

export const normalizeHistory = (value: unknown): QuizResult[] => {
    if (!Array.isArray(value)) return [];
    const unique = new Map<string, QuizResult>();
    value.forEach(candidate => {
        const result = normalizeQuizResult(candidate);
        if (result) unique.set(historyIdentity(result), result);
    });
    return [...unique.values()].sort((a, b) => b.endTime - a.endTime).slice(0, MAX_HISTORY_ENTRIES);
};

export const readHistory = (storage?: Pick<Storage, 'getItem'>): QuizResult[] => {
    try {
        const raw = (storage ?? localStorage).getItem(HISTORY_KEY);
        return raw ? normalizeHistory(JSON.parse(raw)) : [];
    } catch {
        return [];
    }
};

export const saveHistory = (history: QuizResult[], storage?: Pick<Storage, 'setItem'>): boolean => {
    try {
        (storage ?? localStorage).setItem(HISTORY_KEY, JSON.stringify(normalizeHistory(history)));
        return true;
    } catch (error) {
        console.error('Failed to save history:', error);
        return false;
    }
};
