import type { QuizResult } from '../types';

const csvCell = (value: string | number) => {
    const text = String(value);
    const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
};

export const createHistoryCsv = (history: QuizResult[]): string => {
    const rows = history.map(session => {
        const correct = session.results.filter(result => result.isCorrect).length;
        const seconds = Math.round((session.endTime - session.startTime) / 1000);
        return [
            new Date(session.endTime).toLocaleString('ja-JP'), session.grade, session.topic.name,
            session.difficulty ?? '', session.results.length, correct,
            session.results.length ? Math.round(correct / session.results.length * 100) : 0, seconds,
        ];
    });
    return [
        ['日時', '学年', '単元', '難易度', '問題数', '正解数', '正答率(%)', '学習時間(秒)'],
        ...rows,
    ].map(row => row.map(csvCell).join(',')).join('\r\n');
};

export const downloadHistoryCsv = (history: QuizResult[], learnerName: string): boolean => {
    let url = '';
    try {
        const blob = new Blob([`\uFEFF${createHistoryCsv(history)}`], { type: 'text/csv;charset=utf-8' });
        url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const safeName = learnerName.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim() || '学習者';
        anchor.download = `${safeName}-学習記録-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        return true;
    } catch (error) {
        console.error('CSV download failed:', error);
        return false;
    } finally {
        if (url) URL.revokeObjectURL(url);
    }
};
