import { describe, expect, it, vi } from 'vitest';
import { downloadBackup, restoreBackupData, validateBackupData, type BackupData } from './backupService';

const backup: BackupData = {
    app: 'calculation-training5-app',
    version: 1,
    exportedAt: '2026-07-17T00:00:00.000Z',
    data: {
        'calculation-training-history': '[]',
        'calculation-training-student-profiles-v2': '[]',
        'calculation-training-active-profile-v2': 'middle2',
        'calculation-training-reports-v1': null,
    },
};

describe('backup service', () => {
    it('rejects valid JSON with invalid records before any write', () => {
        for (const [key, value] of [
            ['calculation-training-history', '{"wrong":true}'],
            ['calculation-training-history', '[{"broken":true}]'],
            ['calculation-training-student-profiles-v2', '[null]'],
            ['calculation-training-reports-v1', '{"records":[{"broken":true}]}'],
            ['calculation-training-active-profile-v2', 'unknown'],
        ]) {
            const setItem = vi.fn();
            expect(() => restoreBackupData({ ...backup, data: { ...backup.data, [key]: value } }, { getItem: () => null, setItem, removeItem: vi.fn() })).toThrow();
            expect(setItem).not.toHaveBeenCalled();
        }
    });

    it('reports rollback failure honestly', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(() => restoreBackupData(backup, {
            getItem: () => 'old',
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); },
        })).toThrow('元の記録への戻し処理に失敗');
        consoleSpy.mockRestore();
    });
    it('reports a download failure without stopping the screen', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
        expect(downloadBackup()).toBe(false);
        vi.unstubAllGlobals();
        consoleSpy.mockRestore();
    });
    it('rejects damaged structured data before changing storage', () => {
        expect(() => validateBackupData({ ...backup, data: { ...backup.data, 'calculation-training-history': '{bad' } }))
            .toThrow('保存データが壊れています');
    });

    it('restores every supported key', () => {
        const values = new Map<string, string>();
        const storage = {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => { values.set(key, value); },
            removeItem: (key: string) => { values.delete(key); },
        };
        restoreBackupData(backup, storage);
        expect(values.get('calculation-training-active-profile-v2')).toBe('middle2');
        expect(values.has('calculation-training-reports-v1')).toBe(false);
    });

    it('rolls back all keys when a write fails midway', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const values = new Map<string, string>([
            ['calculation-training-history', '[{"old":true}]'],
            ['calculation-training-active-profile-v2', 'grade5'],
        ]);
        let shouldFail = true;
        const storage = {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => {
                if (shouldFail && key === 'calculation-training-student-profiles-v2') {
                    shouldFail = false;
                    throw new Error('quota');
                }
                values.set(key, value);
            },
            removeItem: (key: string) => { values.delete(key); },
        };
        expect(() => restoreBackupData(backup, storage)).toThrow('元の学習記録は変更していません');
        expect(Object.fromEntries(values)).toEqual({
            'calculation-training-history': '[{"old":true}]',
            'calculation-training-active-profile-v2': 'grade5',
        });
        consoleSpy.mockRestore();
    });
});
