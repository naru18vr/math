import { normalizeHistory } from './historyService';
import { isValidReportRecord } from './reportingService';

const BACKUP_KEYS = [
    'calculation-training-history',
    'calculation-training-student-profiles-v2',
    'calculation-training-active-profile-v2',
    'calculation-training-reports-v1',
] as const;

export interface BackupData {
    app: 'calculation-training5-app';
    version: 1;
    exportedAt: string;
    data: Record<string, string | null>;
}

type BackupStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const JSON_KEYS = new Set<string>([
    'calculation-training-history',
    'calculation-training-student-profiles-v2',
    'calculation-training-reports-v1',
]);

export const validateBackupData = (value: unknown): BackupData => {
    if (!value || typeof value !== 'object') throw new Error('バックアップファイルを読み取れません。');
    const parsed = value as Partial<BackupData>;
    if (parsed.app !== 'calculation-training5-app' || parsed.version !== 1 || !parsed.data || typeof parsed.data !== 'object') {
        throw new Error('このアプリのバックアップファイルではありません。');
    }
    if (Array.isArray(parsed.data)) throw new Error('バックアップの保存データが壊れています。');
    for (const key of BACKUP_KEYS) {
        const item = parsed.data[key];
        if (item !== null && typeof item !== 'string') throw new Error('バックアップの保存データが壊れています。');
        if (typeof item === 'string' && JSON_KEYS.has(key)) {
            try {
                const value: unknown = JSON.parse(item);
                if (key === 'calculation-training-history' && (!Array.isArray(value) || value.some(entry => normalizeHistory([entry]).length !== 1))) throw new Error('history');
                if (key === 'calculation-training-student-profiles-v2' && (!Array.isArray(value) || value.some(entry => !entry || typeof entry !== 'object' || !['grade5', 'middle2'].includes(entry.id) || typeof entry.name !== 'string' || !Number.isFinite(entry.dailyGoal)))) throw new Error('profiles');
                if (key === 'calculation-training-reports-v1') {
                    const reports = Array.isArray(value) ? value : value && typeof value === 'object' && 'records' in value ? (value as { records: unknown }).records : null;
                    if (!Array.isArray(reports) || !reports.every(isValidReportRecord)) throw new Error('reports');
                }
            } catch {
                throw new Error('バックアップの保存データが壊れています。');
            }
        }
    }
    const active = parsed.data['calculation-training-active-profile-v2'];
    if (active !== null && active !== 'grade5' && active !== 'middle2') throw new Error('バックアップの保存データが壊れています。');
    return parsed as BackupData;
};

export const restoreBackupData = (backup: BackupData, storage?: BackupStorage) => {
    validateBackupData(backup);
    const target = storage ?? localStorage;
    const previous = Object.fromEntries(BACKUP_KEYS.map(key => [key, target.getItem(key)])) as Record<string, string | null>;
    try {
        BACKUP_KEYS.forEach(key => {
            const value = backup.data[key];
            if (typeof value === 'string') target.setItem(key, value);
            else target.removeItem(key);
        });
    } catch (error) {
        let rolledBack = true;
        BACKUP_KEYS.forEach(key => {
            try {
                const value = previous[key];
                if (typeof value === 'string') target.setItem(key, value);
                else target.removeItem(key);
            } catch {
                rolledBack = false;
            }
        });
        console.error('Backup restore failed and was rolled back:', error);
        throw new Error(rolledBack ? '復元できませんでした。元の学習記録は変更していません。' : '復元と元の記録への戻し処理に失敗しました。バックアップファイルを保管し、端末の空き容量や保存設定を確認してください。');
    }
};

export const downloadBackup = (): boolean => {
    let url = '';
    try {
        const backup: BackupData = {
            app: 'calculation-training5-app',
            version: 1,
            exportedAt: new Date().toISOString(),
            data: Object.fromEntries(BACKUP_KEYS.map(key => [key, localStorage.getItem(key)])),
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `math-training-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        return true;
    } catch (error) {
        console.error('Backup download failed:', error);
        return false;
    } finally {
        if (url) URL.revokeObjectURL(url);
    }
};

export const restoreBackup = async (file: File) => {
    let raw: unknown;
    try {
        raw = JSON.parse(await file.text());
    } catch {
        throw new Error('バックアップファイルを読み取れません。');
    }
    restoreBackupData(validateBackupData(raw));
};
