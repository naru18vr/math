import type { StudentProfile } from '../types';

export const PROFILES_KEY = 'calculation-training-student-profiles-v2';
export const ACTIVE_PROFILE_KEY = 'calculation-training-active-profile-v2';
export const LEGACY_NAME_KEY = 'calculation-training-student-name';

export const DEFAULT_PROFILES: StudentProfile[] = [
    { id: 'grade5', name: '小5', startGrade: '小5', dailyGoal: 10 },
    { id: 'middle2', name: '中2', startGrade: '中2', dailyGoal: 10 },
];

const cloneDefaults = (): StudentProfile[] => DEFAULT_PROFILES.map(profile => ({ ...profile }));

export const isValidLocalDateKey = (value: string): boolean => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const normalizeProfile = (value: unknown, expected: StudentProfile): StudentProfile => {
    if (!value || typeof value !== 'object') return { ...expected };
    const candidate = value as Partial<StudentProfile>;
    const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim().slice(0, 40) : expected.name;
    const dailyGoal = typeof candidate.dailyGoal === 'number' && Number.isFinite(candidate.dailyGoal)
        ? Math.min(100, Math.max(1, Math.round(candidate.dailyGoal)))
        : expected.dailyGoal;
    const examDate = typeof candidate.examDate === 'string' && isValidLocalDateKey(candidate.examDate)
        ? candidate.examDate
        : undefined;
    const targetScore = typeof candidate.targetScore === 'number' && Number.isFinite(candidate.targetScore)
        ? Math.min(100, Math.max(0, Math.round(candidate.targetScore)))
        : undefined;
    return { ...expected, name, dailyGoal, examDate, targetScore };
};

export const normalizeProfiles = (value: unknown, legacyName?: string | null): StudentProfile[] => {
    const source = Array.isArray(value) ? value : [];
    const profiles = cloneDefaults().map(expected => {
        const candidate = source.find(item => item && typeof item === 'object' && (item as { id?: unknown }).id === expected.id);
        return normalizeProfile(candidate, expected);
    });
    const trimmedLegacyName = legacyName?.trim();
    if (!source.length && trimmedLegacyName) profiles[0].name = trimmedLegacyName.slice(0, 40);
    return profiles;
};

export const loadProfiles = (storage?: Pick<Storage, 'getItem'>): StudentProfile[] => {
    try {
        const saved = (storage ?? localStorage).getItem(PROFILES_KEY);
        if (saved) return normalizeProfiles(JSON.parse(saved));
        return normalizeProfiles(undefined, (storage ?? localStorage).getItem(LEGACY_NAME_KEY));
    } catch {
        return cloneDefaults();
    }
};

export const safeStorageSet = (key: string, value: string, storage?: Pick<Storage, 'setItem'>): boolean => {
    try {
        (storage ?? localStorage).setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Failed to save ${key}:`, error);
        return false;
    }
};
