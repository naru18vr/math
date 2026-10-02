

import React, { useState, useEffect, useMemo, useReducer, useCallback, useRef } from 'react';
import { TOPICS_BY_GRADE, MAX_ATTEMPTS, ENCOURAGEMENT_MESSAGES } from './constants';
import type { Grade, Topic, Question, QuizResult, QuestionResult, Difficulty, StudentProfile } from './types';
import { generateMixedQuestions, generateQuestions, generateTopicMixQuestions } from './services/questionService';
import { useStudentProfile } from './hooks/useStudentProfile';
import { getCourseTopics, getLessonContent, getProfileCourseGrades, getRecommendedTopic, getTopicProgress, getWeakTopics } from './services/learningService';
import { isAnswerCorrect } from './services/answerService';
import { downloadBackup, restoreBackup } from './services/backupService';
import { downloadHistoryCsv } from './services/reportService';
import { buildDailyReportText, buildWeeklyReportText, copyText, getWeeklySummary, mergeCompatibleReports, quizResultToReport, readReportStore, saveReportRecord } from './services/reportingService';
import type { LearningReportRecord } from './services/reportingService';
import { splitMathText } from './services/utils';
import { normalizeHistory, readHistory, saveHistory } from './services/historyService';
import { Header, Keypad, TopicSelector, QuizSetup, UIIcon } from './components/LearningUI';

// --- Helper Functions ---
const formatTime = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 1) return "1秒未満";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let timeStr = '';
    if (minutes > 0) timeStr += `${minutes}分`;
    if (seconds > 0) timeStr += `${seconds}秒`;
    return timeStr || '0秒';
};


// --- Components ---

const Footer = () => (
    <footer className="text-center py-4 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} 数学・計算トレーニング</p>
    </footer>
);


const BackButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
    <button onClick={onClick} className="mb-6 min-h-12 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {children}
    </button>
);

const LearnerSelector = ({ profiles, activeProfile, onSelect }: {
    profiles: StudentProfile[];
    activeProfile: StudentProfile;
    onSelect: (id: StudentProfile['id']) => void;
}) => (
    <div className="learner-selector">
        <p className="text-sm font-semibold text-slate-600 mb-2">だれが学習する？</p>
        <div className="grid grid-cols-2 gap-3">
            {profiles.map(profile => (
                <button
                    key={profile.id}
                    onClick={() => onSelect(profile.id)}
                    aria-pressed={profile.id === activeProfile.id}
                    className={`learner-card p-3 rounded-lg border-2 text-left transition-colors ${profile.id === activeProfile.id
                        ? 'border-sky-500 bg-sky-50 text-sky-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'}`}
                >
                    <span className="learner-name">{profile.name}<span aria-hidden="true">{profile.id === activeProfile.id ? '✓' : ''}</span></span>
                    <span className="text-xs">{profile.id === 'grade5' ? '小4のおさらい＋小5〜中3' : '中1のおさらい＋中2〜中3'}</span>
                </button>
            ))}
        </div>
    </div>
);

const LearningDashboard = ({ grades, history, onContinue, onQuickStart, onSelectGrade, onMixedTest, onBuildTest, dailyGoal, reviewGrade }: {
    grades: Grade[]; history: QuizResult[]; dailyGoal: number; reviewGrade: Grade;
    onContinue: (grade: Grade, topic: Topic) => void; onQuickStart: (grade: Grade, topic: Topic) => void;
    onSelectGrade: (grade: Grade) => void; onMixedTest: () => void; onBuildTest: () => void;
}) => {
    const courseTopics = getCourseTopics(grades);
    const recommended = getRecommendedTopic(history, grades);
    const weakTopics = getWeakTopics(history, grades);
    const mastered = courseTopics.filter(({ topic }) => getTopicProgress(history, topic.id).mastery >= 80).length;
    const progress = courseTopics.length ? Math.round(mastered / courseTopics.length * 100) : 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const answeredToday = history.filter(session => session.endTime >= today.getTime() && session.endTime < tomorrow.getTime()).reduce((sum, session) => sum + session.results.length, 0);
    const dailyProgress = Math.min(100, Math.round(answeredToday / dailyGoal * 100));
    return <div className="screen-padding dashboard">
        <div className="dashboard-heading"><div><p className="eyebrow">少しずつ、できるを増やそう</p><h2 className="screen-title">今日もひとつ、学ぼう。</h2></div><span className="daily-badge">{dailyProgress >= 100 ? '目標達成 ✓' : '今日の目標'}<strong>{answeredToday}<small> / {dailyGoal}問</small></strong></span></div>
        <div className="goal-track" role="progressbar" aria-label="今日の目標の達成率" aria-valuenow={dailyProgress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${dailyProgress}%` }} /></div>
        {recommended && <section className="recommendation-card"><div className="recommendation-copy"><span className="recommendation-label">今日のおすすめ · {recommended.grade}</span><h3>{recommended.topic.name}</h3><p>まずは10問。解説を見ながら、自分のペースで。</p></div><div className="recommendation-actions"><button className="primary-button" onClick={() => onQuickStart(recommended.grade, recommended.topic)}><UIIcon kind="play" />おすすめの10問を始める</button><button className="text-button" onClick={() => onContinue(recommended.grade, recommended.topic)}>先に学習ポイントを見る →</button></div></section>}
        {weakTopics.length > 0 && <section><div className="section-heading"><h3>もう一度、練習しよう</h3><span>復習すると伸びる単元</span></div><div className="topic-grid">{weakTopics.map(({ grade, topic }) => <button key={topic.id} className="topic-card review-card" onClick={() => onContinue(grade, topic)}><span><small>{grade} · 復習</small><strong>{topic.name}</strong></span><UIIcon kind="arrow" /></button>)}</div></section>}
        <section><div className="section-heading"><h3>学年から選ぶ</h3><span>好きな単元を練習</span></div><div className="grade-grid">{grades.map(grade => <button key={grade} className="grade-card" onClick={() => onSelectGrade(grade)}><strong>{grade}</strong><span>{grade === reviewGrade ? 'おさらい' : `${TOPICS_BY_GRADE[grade].length}単元`}</span><UIIcon kind="arrow" size={18} /></button>)}</div></section>
        <section className="test-grid"><button className="test-card" onClick={onMixedTest}><span className="test-icon" aria-hidden="true">✓</span><span><strong>力だめし</strong><small>コースの範囲から20問</small></span><UIIcon kind="arrow" /></button><button className="test-card" onClick={onBuildTest}><span className="test-icon" aria-hidden="true">≡</span><span><strong>範囲を選んでテスト</strong><small>学校のテストに向けて</small></span><UIIcon kind="arrow" /></button></section>
        <section className="course-progress surface"><div><h3>これまでの積み重ね</h3><p>{mastered} / {courseTopics.length}単元を習得</p></div><strong>{progress}%</strong><div className="goal-track" role="progressbar" aria-label="コースの習得率" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></section>
    </div>;
};

const CopyReportPanel = ({ text, label }: { text: string; label: string }) => {
    const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
    const copy = async () => setCopyState(await copyText(text) ? 'success' : 'error');
    return <div className="w-full min-w-0">
        <button onClick={copy} className="min-h-12 w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-lg shadow-md whitespace-normal">{label}</button>
        {copyState === 'success' && <p role="status" className="mt-2 text-sm font-semibold text-emerald-800">✓ コピーできました。Google Chatに貼って送ってね。</p>}
        {copyState === 'error' && <div role="alert" className="mt-3"><p className="text-sm font-semibold text-rose-800 mb-2">⚠ コピーできませんでした。下の文章を長押しして選択し、手動でコピーしてください。</p><textarea aria-label="手動コピー用の報告文" readOnly value={text} onFocus={event => event.currentTarget.select()} className="w-full min-h-48 p-3 text-base border-2 border-rose-300 rounded-lg bg-white resize-y break-words" /></div>}
    </div>;
};

const ParentDashboard = ({ grades, history, learnerName, profile, onBack }: { grades: Grade[]; history: QuizResult[]; learnerName: string; profile: StudentProfile; onBack: () => void }) => {
    const [exportMessage, setExportMessage] = useState('');
    const topics = getCourseTopics(grades);
    const weakTopics = getWeakTopics(history, grades, 5);
    const totalAnswered = history.reduce((sum, session) => sum + session.results.length, 0);
    const totalCorrect = history.reduce((sum, session) => sum + session.results.filter(result => result.isCorrect).length, 0);
    const totalMinutes = Math.round(history.reduce((sum, session) => sum + Math.max(0, session.endTime - session.startTime), 0) / 60000);
    const accuracy = totalAnswered ? Math.round(totalCorrect / totalAnswered * 100) : 0;
    const mastered = topics.filter(({ topic }) => getTopicProgress(history, topic.id).mastery >= 80).length;
    const compatibleReports = mergeCompatibleReports(readReportStore(), history).filter(record => record.studentId === profile.id);
    const weeklySummary = getWeeklySummary(compatibleReports);
    const weeklyText = buildWeeklyReportText(weeklySummary, profile);

    return <div className="screen-padding">
        <BackButton onClick={onBack}>トップに戻る</BackButton>
        <div className="flex justify-between items-center mb-5"><h2 className="text-2xl font-bold text-slate-800">学習の進み具合</h2><button disabled={history.length === 0} onClick={() => setExportMessage(downloadHistoryCsv(history, learnerName) ? '✓ CSVを保存しました。' : '⚠ CSVを保存できませんでした。ダウンロード許可を確認してください。')} className="px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg disabled:bg-slate-300">CSV出力</button></div>
        {exportMessage && <p role="status" className={`mb-4 text-sm font-semibold ${exportMessage.startsWith('✓') ? 'text-emerald-700' : 'text-rose-700'}`}>{exportMessage}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[['学習回数', `${history.length}回`], ['学習時間', `${totalMinutes}分`], ['正答率', `${accuracy}%`], ['習得単元', `${mastered}/${topics.length}`]].map(([label, value]) => <div key={label} className="bg-white p-4 rounded-lg shadow"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-800">{value}</p></div>)}
        </div>
        <section className="bg-white p-4 rounded-xl shadow mb-5"><h3 className="font-bold mb-3">最近の学習</h3>{history.length === 0 ? <p className="text-slate-500">まだ学習記録がありません。</p> : history.slice(0, 7).map((session, index) => { const correct = session.results.filter(result => result.isCorrect).length; return <div key={`${session.endTime}-${index}`} className="flex justify-between py-2 border-b last:border-0"><span><span className="text-xs text-slate-500 block">{new Date(session.endTime).toLocaleDateString('ja-JP')}</span>{session.topic.name}</span><span className="font-bold">{correct}/{session.results.length}</span></div>; })}</section>
        <section className="bg-amber-50 border border-amber-200 p-4 rounded-xl"><h3 className="font-bold text-amber-900 mb-3">重点的に復習したい単元</h3>{weakTopics.length === 0 ? <p className="text-amber-800">学習を進めると苦手単元が表示されます。</p> : weakTopics.map(({ grade, topic, progress }) => <div key={topic.id} className="flex justify-between py-2"><span>{grade}・{topic.name}</span><span className="font-bold text-amber-800">習熟度 {progress.mastery}%</span></div>)}</section>
        <section className="bg-white p-4 rounded-xl shadow mt-5"><h3 className="font-bold text-slate-800 mb-1">1週間の学習報告</h3><p className="text-sm text-slate-500 mb-3">直近7日間を集計し、Google Chatなどへ貼り付けられます。</p>{weeklySummary.records.length === 0 ? <p className="mb-3 text-slate-600">まだ今週の学習記録がありません。</p> : <div className="grid grid-cols-3 gap-2 text-center mb-3"><div><span className="block text-xl font-bold">{weeklySummary.studyDays}</span><span className="text-xs">学習日</span></div><div><span className="block text-xl font-bold">{weeklySummary.total}</span><span className="text-xs">問題</span></div><div><span className="block text-xl font-bold">{weeklySummary.accuracy}%</span><span className="text-xs">正答率</span></div></div>}<CopyReportPanel text={weeklyText} label="週間報告をコピー" /></section>
    </div>;
};

const TestBuilder = ({ grades, reviewGrade, onStart, onBack }: { grades: Grade[]; reviewGrade: Grade; onStart: (topics: Topic[], count: number, difficulty: Difficulty) => void; onBack: () => void }) => {
    const courseTopics = getCourseTopics(grades);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [count, setCount] = useState(20);
    const [level, setLevel] = useState<Difficulty>('標準');
    const toggle = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    const toggleGrade = (grade: Grade) => setSelected(current => {
        const next = new Set(current); const allSelected = TOPICS_BY_GRADE[grade].every(topic => next.has(topic.id));
        TOPICS_BY_GRADE[grade].forEach(topic => { if (allSelected) next.delete(topic.id); else next.add(topic.id); });
        return next;
    });
    return <div className="screen-padding test-builder"><BackButton onClick={onBack}>トップに戻る</BackButton><p className="eyebrow">学校のテストに向けて</p><h2 className="screen-title">範囲を選んでテスト</h2><p className="screen-description">学年を開いて、練習したい単元にチェック。</p>
        {grades.map((grade, index) => <details key={grade} open={index === 0} className="grade-accordion surface"><summary><strong>{grade}{grade === reviewGrade && <small> おさらい</small>}</strong><span>{TOPICS_BY_GRADE[grade].filter(topic => selected.has(topic.id)).length} / {TOPICS_BY_GRADE[grade].length}単元</span></summary><div className="accordion-content"><button className="text-button" onClick={() => toggleGrade(grade)}>{TOPICS_BY_GRADE[grade].every(topic => selected.has(topic.id)) ? 'この学年の選択を解除' : 'この学年をすべて選択'}</button><div className="grid sm:grid-cols-2 gap-2">{TOPICS_BY_GRADE[grade].map(topic => <label key={topic.id} className={`p-3 rounded-lg border cursor-pointer ${selected.has(topic.id) ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200'}`}><input type="checkbox" checked={selected.has(topic.id)} onChange={() => toggle(topic.id)} />{topic.name}</label>)}</div></div></details>)}
        <div className="test-start-panel surface"><div className="test-controls"><label>難易度<select value={level} onChange={event => setLevel(event.target.value as Difficulty)}><option>基礎</option><option>標準</option><option>発展</option></select></label><label>問題数<select value={count} onChange={event => setCount(Number(event.target.value))}><option value={10}>10問</option><option value={20}>20問</option><option value={30}>30問</option></select></label></div><p className="selection-count" role="status">{selected.size ? `${selected.size}単元を選択中` : '単元を選ぶと開始できます'}</p><button disabled={selected.size === 0} onClick={() => onStart(courseTopics.filter(({ topic }) => selected.has(topic.id)).map(({ topic }) => topic), count, level)} className="primary-button">選択した範囲で{count}問を始める</button></div>
    </div>;
};

const LessonScreen = ({ topic, onStart, onBack }: { topic: Topic; onStart: () => void; onBack: () => void }) => {
    const lesson = getLessonContent(topic);
    return (
        <div className="screen-padding">
            <BackButton onClick={onBack}>単元選択に戻る</BackButton>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-indigo-600 text-white p-5"><p className="text-sm text-indigo-100">学習ポイント</p><h2 className="text-2xl font-bold">{topic.name}</h2></div>
                <div className="p-5 space-y-5">
                    <p className="text-slate-700 leading-7">{lesson.overview}</p>
                    <div><h3 className="font-bold text-slate-800 mb-2">解くときのポイント</h3><ol className="space-y-2">{lesson.points.map((point, index) => <li key={point} className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-center font-bold">{index + 1}</span><span>{point}</span></li>)}</ol></div>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4"><h3 className="font-bold text-sky-800 mb-1">例題</h3><p className="font-mono text-slate-800">{lesson.example}</p></div>
                    <button onClick={onStart} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow">練習問題へ進む</button>
                </div>
            </div>
        </div>
    );
};

const Quiz = ({
    questions,
    onQuizComplete,
    topicName,
    onBack,
}: {
    questions: Question[],
    onQuizComplete: (results: QuestionResult[]) => void,
    topicName: string,
    onBack: () => void;
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isWrong, setIsWrong] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [results, setResults] = useState<QuestionResult[]>([]);
    const [inputMode, setInputMode] = useState<'keypad' | 'keyboard'>('keypad');
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedRef = useRef(false);
    const nextLockedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);
    const explanationRef = useRef<HTMLDivElement>(null);

    useEffect(() => { nextLockedRef.current = false; window.scrollTo({ top: 0 }); }, [currentQuestionIndex]);
    useEffect(() => {
        if (showExplanation) {
            explanationRef.current?.scrollIntoView({ block: 'nearest' });
            nextButtonRef.current?.focus({ preventScroll: true });
        }
    }, [showExplanation]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const toggleInputMode = () => {
        setInputMode(prev => (prev === 'keypad' ? 'keyboard' : 'keypad'));
    };

    useEffect(() => {
        if (inputMode === 'keyboard' && !showExplanation) {
            inputRef.current?.focus();
        }
    }, [currentQuestionIndex, showExplanation, inputMode]);

    const handleKeypadPress = (key: string) => {
        if (showExplanation) return;

        if (key === 'OK') {
            handleSubmit();
        } else if (key === 'clear') {
            setUserAnswer('');
        } else if (key === '⌫') {
            setUserAnswer(prev => prev.slice(0, -1));
        } else {
            setUserAnswer(prev => prev + key);
        }
    };
    
    const handleSubmit = () => {
        if (showExplanation || resolvedRef.current || !userAnswer.trim()) return;

        const isCorrect = isAnswerCorrect(userAnswer, currentQuestion.answer);

        if (isCorrect) {
            resolvedRef.current = true;
            setResults(prev => [...prev, { question: currentQuestion, attempts, isCorrect: true, isSkipped: false }]);
            setShowExplanation(true);
        } else {
            setIsWrong(true);
            setTimeout(() => setIsWrong(false), 500);
            
            if (attempts + 1 >= MAX_ATTEMPTS) {
                resolvedRef.current = true;
                setResults(prev => [...prev, { question: currentQuestion, attempts: MAX_ATTEMPTS, isCorrect: false, isSkipped: false }]);
                setShowExplanation(true);
            } else {
                setAttempts(prev => prev + 1);
            }
        }
    };

    const handleNext = () => {
        if (!showExplanation || nextLockedRef.current) return;
        nextLockedRef.current = true;
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer('');
            setAttempts(0);
            setShowExplanation(false);
            resolvedRef.current = false;
            setIsWrong(false);
        } else {
            onQuizComplete(results);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.isComposing || e.repeat || e.target instanceof HTMLButtonElement) return;
            if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
            if (e.target instanceof HTMLElement && e.target.closest('button, a, select')) return;
            e.preventDefault();
            if (showExplanation && e.key === 'Enter') {
                handleNext();
            } else if (!showExplanation && e.key === 'Enter') {
                if (document.activeElement === inputRef.current && e.isComposing) {
                    return; // Don't submit while composing with an IME
                }
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showExplanation, userAnswer, currentQuestionIndex, attempts]);

    if (!currentQuestion) {
        return <div className="p-4 text-center">問題の読み込みに失敗しました。</div>;
    }
    
    if (currentQuestion.id === -1) {
         return (
            <div className="p-6 text-center">
                <p className="text-lg text-slate-700 mb-4">{currentQuestion.text}</p>
                <button
                    onClick={() => onQuizComplete([])}
                    className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors"
                >
                    戻る
                </button>
            </div>
        );
    }

    return (
        <div className="screen-padding quiz-screen">
            <div className="quiz-back">
                <button onClick={onBack} className="min-h-12 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     練習を終了する
                </button>
            </div>
            <div className="quiz-topic">{topicName}</div>
            <div className="quiz-progress-heading" aria-live="polite" aria-atomic="true">
                <h2 className="text-xl font-bold text-slate-800">
                    第{currentQuestionIndex + 1}問
                </h2>
                <div className="text-sm font-semibold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                    {currentQuestionIndex + 1} / {questions.length}
                </div>
            </div>

            <div className="quiz-track" role="progressbar" aria-label="解答の進み具合" aria-valuenow={currentQuestionIndex} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: `${currentQuestionIndex / questions.length * 100}%` }} /></div>
            <div className="question-card surface">
                <div>
                  <p className={`question-text ${currentQuestion.text.length > 50 ? 'is-prose' : ''}`}>
                    {splitMathText(currentQuestion.text).map((part, index) => part.superscript
                        ? <sup key={index}>{part.text}</sup>
                        : <React.Fragment key={index}>{part.text}</React.Fragment>)}
                  </p>
                  {currentQuestion.figure && <div className="mt-4 flex justify-center">{currentQuestion.figure}</div>}
                </div>
            </div>

            {!showExplanation && <div className="answer-area">
                <div className="answer-label-row"><label htmlFor="quiz-answer">答え</label>
                    <button
                        onClick={toggleInputMode}
                        className="input-mode-button"
                        aria-label={inputMode === 'keypad' ? "キーボード入力に切り替える" : "キーパッド入力に切り替える"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a2 2 0 00-2-2H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V8zM5 8a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2H9a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM5 12a1 1 0 011-1h7a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                        {inputMode === 'keypad' ? 'キーボードに切替' : '数字キーに切替'}
                    </button>
                </div>
                <div className={`relative ${isWrong ? 'animate-shake' : ''}`}>
                     <input
                        id="quiz-answer"
                        ref={inputRef}
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        type="text"
                        value={userAnswer}
                        readOnly={inputMode === 'keypad'}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="ここに答えを入力"
                        aria-label="解答入力欄"
                        className="answer-input"
                    />
                </div>
                <div aria-live="polite" className="min-h-6 mt-1 text-center text-sm font-semibold">
                    {attempts > 0 && !showExplanation && <span className="text-rose-700">✕ ちがいます。あと{MAX_ATTEMPTS - attempts}回ためせます。</span>}
                </div>
                {inputMode === 'keypad' && <Keypad key={currentQuestionIndex} onKeyPress={handleKeypadPress} answer={currentQuestion.answer} />}
                    <button
                        onClick={handleSubmit}
                        disabled={showExplanation || !userAnswer.trim()}
                        className="primary-button answer-submit"
                    >
                        答え合わせ<UIIcon kind="arrow" />
                    </button>
            </div>}

            {showExplanation && (
                <div ref={explanationRef} className={`explanation-card ${results[results.length-1].isCorrect ? 'is-correct' : 'is-review'}`} role="status">
                    <h3 className="font-bold text-lg mb-2 text-emerald-800">
                        {results[results.length-1].isCorrect ? '✓ 正解！' : '解き方を確認しよう'}
                    </h3>
                    {!results[results.length-1].isCorrect && <p className="correct-answer">答え：{currentQuestion.answer.replace(/\*/g, '×')}</p>}
                    <p className="explanation-text">{currentQuestion.explanation}</p>
                    <button ref={nextButtonRef} onClick={handleNext} className="primary-button next-question">
                        {currentQuestionIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
                    </button>
                </div>
            )}
        </div>
    );
};

const ResultsScreen = ({ result, reportRecord, streak, onRetry, onRetryWrong, onBackToTop }: { result: QuizResult, reportRecord: LearningReportRecord, streak: number, onRetry: () => void, onRetryWrong: () => void, onBackToTop: () => void }) => {
    const { results, startTime, endTime, grade, topic, difficulty } = result;
    const totalQuestions = results.length;
    
    if (totalQuestions === 0) {
        return (
             <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-slate-700 mb-4">エラー</h2>
                <p className="mb-6">問題がありませんでした。トップに戻ってください。</p>
                <button onClick={onBackToTop} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">トップに戻る</button>
            </div>
        )
    }

    const correctAnswers = results.filter(r => r.isCorrect).length;
    const incorrectAnswers = results.filter(r => !r.isCorrect);
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const timeTaken = Math.round((endTime - startTime) / 1000);
    
    const encouragement = useMemo(() => {
        if (score === 100) return ENCOURAGEMENT_MESSAGES.perfect;
        if (score >= 80) return ENCOURAGEMENT_MESSAGES.great;
        if (score >= 60) return ENCOURAGEMENT_MESSAGES.good;
        return ENCOURAGEMENT_MESSAGES.effort;
    }, [score]);

    return (
        <div className="screen-padding results-screen text-center">
            <h2 className="text-3xl font-black text-slate-700 mb-2">結果発表</h2>
            <p className="text-slate-500 mb-6">{grade} - {topic.name} {difficulty && `(${difficulty})`}</p>
            
            <div className="mb-6">
                <p className="text-xl font-bold text-sky-600">{encouragement}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                 <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-sm text-slate-500">スコア</p>
                    <p className="text-3xl font-bold text-slate-800">{score}<span className="text-lg font-medium">%</span></p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-sm text-slate-500">正解数</p>
                    <p className="text-3xl font-bold text-slate-800">{correctAnswers} / {totalQuestions}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-sm text-slate-500">タイム</p>
                    <p className="text-3xl font-bold text-slate-800">{timeTaken}<span className="text-lg font-medium">秒</span></p>
                </div>
            </div>

            <div className="result-actions">
                {incorrectAnswers.length > 0 && <button onClick={onRetryWrong} className="w-full sm:w-auto px-8 py-3 bg-rose-500 text-white font-bold rounded-lg shadow-md hover:bg-rose-600">間違えた問題だけ再挑戦</button>}
                <button onClick={onRetry} className="w-full sm:w-auto px-8 py-3 bg-sky-500 text-white font-bold rounded-lg shadow-md hover:bg-sky-600 transition-all transform hover:-translate-y-0.5 active:translate-y-0">もう一度挑戦</button>
                <button onClick={onBackToTop} className="w-full sm:w-auto px-8 py-3 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0">トップに戻る</button>
            </div>

            <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 mb-8 text-left"><h3 className="font-bold text-lg text-teal-900 mb-1">おうちの人に今日の結果を知らせよう</h3><p className="text-sm text-teal-800 mb-3">文章をコピーして、内容を確認してからGoogle Chatなどに貼って送れます。自動送信はしません。</p><CopyReportPanel text={buildDailyReportText(reportRecord, streak, `${window.location.origin}${window.location.pathname}#history`)} label="おうちの人に報告をコピー" /></div>

            {incorrectAnswers.length > 0 && (
                <div className="text-left mb-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-3">間違えた問題を確認</h3>
                    <div className="space-y-3">
                        {incorrectAnswers.map((item, index) => (
                            <details key={`${item.question.id}-${index}`} className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <summary className="font-semibold text-rose-800 cursor-pointer">{item.question.text}</summary>
                                <p className="mt-3"><span className="font-bold">正解：</span>{item.question.answer.replace(/\*/g, '×')}</p>
                                <p className="mt-1 text-sm text-slate-700">{item.question.explanation}</p>
                            </details>
                        ))}
                    </div>
                </div>
            )}


        </div>
    );
};

const HistoryScreen = ({ history, onBack, onClearHistory }: { history: QuizResult[], onBack: () => void, onClearHistory: () => void }) => {
    const groupedHistory = useMemo(() => {
        const groups: Record<string, { results: QuizResult[], totalTime: number }> = {};
        history.forEach(result => {
            const dateStr = new Date(result.endTime).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
            if (!groups[dateStr]) {
                groups[dateStr] = { results: [], totalTime: 0 };
            }
            groups[dateStr].results.push(result);
            const timeTaken = result.endTime - result.startTime;
            if (timeTaken > 0) {
                 groups[dateStr].totalTime += timeTaken;
            }
        });
        return Object.entries(groups);
    }, [history]);

    return (
        <div className="screen-padding">
            <div className="flex justify-between items-center mb-6">
                <BackButton onClick={onBack}>トップに戻る</BackButton>
                {history.length > 0 && 
                    <button onClick={onClearHistory} className="text-sm text-red-500 hover:text-red-700 font-medium">履歴を消去</button>
                }
            </div>
            <h2 className="text-2xl font-bold text-center mb-6 text-slate-700">学習履歴</h2>
            {history.length === 0 ? (
                <p className="text-center text-slate-500">まだ学習履歴がありません。</p>
            ) : (
                <div className="space-y-6">
                    {groupedHistory.map(([date, groupData]) => (
                        <div key={date}>
                            <div className="flex justify-between items-baseline pb-2 border-b border-slate-200 mb-3">
                                <h3 className="font-bold text-lg text-slate-600">{date}</h3>
                                <p className="text-sm font-semibold text-slate-500">合計: <span className="text-base text-sky-600 font-bold">{formatTime(groupData.totalTime)}</span></p>
                            </div>
                            <div className="space-y-4">
                                {groupData.results.map((result, index) => {
                                    const correctCount = result.results.filter(r => r.isCorrect).length;
                                    const total = result.results.length;
                                    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                                    const timeTaken = result.endTime - result.startTime;
                                    return (
                                        <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-slate-500">{new Date(result.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    <p className="font-semibold text-slate-800">{result.topic.name}
                                                       {result.difficulty && <span className="ml-2 text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{result.difficulty}</span>}
                                                    </p>
                                                    <p className="text-sm text-slate-500 mt-1">🕒 {formatTime(timeTaken)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-bold ${score === 100 ? 'text-amber-500' : 'text-slate-700'}`}>{score}%</p>
                                                    <p className="text-sm text-slate-600">{correctCount} / {total} 問</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const ProfileScreen = ({ studentName, updateStudentName, dailyGoal, updateDailyGoal, examDate, targetScore, updateExamSettings, consecutiveDays, onBack }: { studentName: string, updateStudentName: (name: string) => boolean, dailyGoal: number, updateDailyGoal: (goal: number) => boolean, examDate?: string, targetScore?: number, updateExamSettings: (date: string, score: number) => boolean, consecutiveDays: number, onBack: () => void }) => {
    const [name, setName] = useState(studentName);
    const [restoreMessage, setRestoreMessage] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [localExamDate, setLocalExamDate] = useState(examDate ?? '');
    const [localTargetScore, setLocalTargetScore] = useState(targetScore ?? 80);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleSave = () => {
        setSaveMessage(updateStudentName(name) ? '✓ 名前を保存しました。' : '⚠ 端末に保存できませんでした。空き容量やブラウザー設定を確認してください。');
    };

    const handleBackup = () => {
        setRestoreMessage(downloadBackup()
            ? '✓ バックアップを保存しました。ダウンロードフォルダを確認してください。'
            : '⚠ バックアップを保存できませんでした。ブラウザーのダウンロード許可を確認してください。');
    };

    return (
        <div className="screen-padding">
            <BackButton onClick={onBack}>トップに戻る</BackButton>
            <h2 className="text-2xl font-bold text-center mb-6 text-slate-700">学習の設定</h2>
            
             <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="mb-6 text-center">
                    <p className="text-slate-600">連続学習日数</p>
                    <p className="text-5xl font-bold text-sky-500">{consecutiveDays} <span className="text-2xl">日</span></p>
                </div>
                <div className="mb-4">
                    <label htmlFor="studentName" className="block text-sm font-medium text-slate-700 mb-1">名前</label>
                    <input
                        id="studentName"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setSaveMessage(''); }}
                        placeholder="名前を入力"
                        className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
                <button onClick={handleSave} className="min-h-12 w-full px-4 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">保存する</button>
                {saveMessage && <p role="status" className={`mt-2 text-sm font-semibold ${saveMessage.startsWith('✓') ? 'text-emerald-700' : 'text-rose-700'}`}>{saveMessage}</p>}
                <div className="mt-5"><label htmlFor="dailyGoal" className="block text-sm font-medium text-slate-700 mb-1">1日の目標問題数</label><select id="dailyGoal" value={dailyGoal} onChange={event => setSaveMessage(updateDailyGoal(Number(event.target.value)) ? '✓ 1日の目標を保存しました。' : '⚠ 1日の目標を端末に保存できませんでした。')} className="min-h-12 w-full p-2 border border-slate-300 rounded-md"><option value={10}>10問</option><option value={20}>20問</option><option value={30}>30問</option></select></div>
                <div className="border-t mt-6 pt-5"><h3 className="font-bold text-slate-700 mb-1">試験の目標（任意）</h3><p className="text-xs text-slate-500 mb-3">週間報告に残り日数と目標到達状況を表示します。</p><label htmlFor="examDate" className="block text-sm mb-1">試験日</label><input id="examDate" type="date" value={localExamDate} onChange={event => setLocalExamDate(event.target.value)} className="min-h-12 w-full p-2 border rounded-md mb-3" /><label htmlFor="targetScore" className="block text-sm mb-1">目標正答率</label><select id="targetScore" value={localTargetScore} onChange={event => setLocalTargetScore(Number(event.target.value))} className="min-h-12 w-full p-2 border rounded-md mb-3"><option value={60}>60%</option><option value={70}>70%</option><option value={80}>80%</option><option value={90}>90%</option></select><button onClick={() => setSaveMessage(updateExamSettings(localExamDate, localTargetScore) ? '✓ 試験目標を保存しました。' : '⚠ 試験目標を端末に保存できませんでした。')} className="min-h-12 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg">試験目標を保存</button></div>
                <div className="border-t mt-6 pt-5">
                    <h3 className="font-bold text-slate-700 mb-1">学習データ</h3>
                    <p className="text-xs text-slate-500 mb-3">端末変更やデータ消失に備えて保存できます。</p>
                    <p className="text-xs text-amber-700 mb-3">バックアップには学習記録が含まれます。公開場所へ貼らないでください。</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleBackup} className="min-h-12 px-3 py-2 bg-emerald-600 text-white font-semibold rounded-lg">バックアップ</button>
                        <button onClick={() => fileInputRef.current?.click()} className="min-h-12 px-3 py-2 bg-slate-600 text-white font-semibold rounded-lg">復元する</button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={async event => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try { await restoreBackup(file); setRestoreMessage('復元しました。画面を再読み込みします。'); window.setTimeout(() => window.location.reload(), 800); }
                        catch (error) { setRestoreMessage(error instanceof Error ? error.message : '復元できませんでした。'); }
                    }} />
                    {restoreMessage && <p role="status" aria-live="polite" className="text-sm mt-2 text-slate-700">{restoreMessage}</p>}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
type Screen = 'grade' | 'topic' | 'lesson' | 'difficulty' | 'num_questions' | 'quiz' | 'result' | 'history' | 'profile' | 'parent' | 'test_builder';

// --- Navigation State Management (useReducer) ---
type NavState = {
  screen: Screen;
};

type NavAction =
  | { type: 'NAVIGATE'; to: Screen }
  | { type: 'RESET' };

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'NAVIGATE':
      return { screen: action.to };
    case 'RESET':
      return { screen: 'grade' };
    default:
      return state;
  }
}


const App = () => {
    const [nav, dispatch] = useReducer(navReducer, {
        screen: 'grade',
    });
    const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [quizStartTime, setQuizStartTime] = useState<number>(0);
    const [history, setHistory] = useState<QuizResult[]>([]);
    const [storageMessage, setStorageMessage] = useState('');
    const { profiles, activeProfile, activeHistory, selectProfile, updateStudentName, updateDailyGoal, updateExamSettings, consecutiveDays } = useStudentProfile(history);

    useEffect(() => {
        setHistory(readHistory());
        if (window.location.hash === '#history') dispatch({ type: 'NAVIGATE', to: 'history' });
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0 });
        document.getElementById('main-content')?.focus({ preventScroll: true });
    }, [nav.screen]);

    const resetSelection = useCallback(() => {
        setSelectedGrade(null);
        setSelectedTopic(null);
        setDifficulty(null);
        setQuestions([]);
        setQuizResult(null);
    }, []);

    const navigate = (to: Screen) => {
        if (to === 'grade') {
            resetSelection();
            dispatch({ type: 'RESET' });
        } else {
            dispatch({ type: 'NAVIGATE', to: to });
        }
    };

    const handleSelectGrade = (grade: Grade) => {
        setSelectedGrade(grade);
        navigate('topic');
    };

    const handleStartQuiz = (num: number, level: Difficulty | null = difficulty) => {
        if (!selectedTopic) return;
        const generatedQuestions = generateQuestions(selectedTopic, num, level);
        setDifficulty(level);
        setQuestions(generatedQuestions);
        setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const handleQuickStart = (grade: Grade, topic: Topic) => {
        const level: Difficulty = getTopicProgress(activeHistory, topic.id).accuracy >= 80 ? '標準' : '基礎';
        setSelectedGrade(grade); setSelectedTopic(topic); setDifficulty(level);
        setQuestions(generateQuestions(topic, 10, level)); setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const quitQuiz = () => {
        if (window.confirm('練習を終了しますか？途中の解答は保存されません。')) navigate(selectedTopic?.id === 'mixed' ? 'grade' : 'difficulty');
    };

    const handleStartMixedTest = (grades: Grade[]) => {
        const generatedQuestions = generateMixedQuestions(grades, 20, '標準');
        setSelectedGrade(activeProfile.startGrade);
        setSelectedTopic({ id: 'mixed', name: '総合テスト' });
        setDifficulty('標準');
        setQuestions(generatedQuestions);
        setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const handleStartCustomTest = (topics: Topic[], count: number, level: Difficulty) => {
        setSelectedGrade(activeProfile.startGrade);
        setSelectedTopic({ id: 'mixed', name: '範囲指定テスト' });
        setDifficulty(level);
        setQuestions(generateTopicMixQuestions(topics, count, level));
        setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const handleQuizComplete = (results: QuestionResult[]) => {
        if (!selectedGrade || !selectedTopic) {
             navigate('grade');
             return;
        };

        if (results.length > 0) {
            const newResult: QuizResult = {
                studentId: activeProfile.id,
                grade: selectedGrade,
                topic: selectedTopic,
                difficulty: difficulty,
                results,
                startTime: quizStartTime,
                endTime: Date.now(),
            };
            setQuizResult(newResult);
            const reportSaved = saveReportRecord(quizResultToReport(newResult));
            const newHistory = normalizeHistory([newResult, ...history]);
            setHistory(newHistory);
            const historySaved = saveHistory(newHistory);
            setStorageMessage(historySaved && reportSaved ? '' : '⚠ 今回の結果を端末に保存できませんでした。結果画面は確認できますが、空き容量やブラウザー設定を確認してください。');
        }

        navigate('result');
    };
    
    const handleClearHistory = () => {
        if(window.confirm(`${activeProfile.name}さんの学習履歴をすべて削除しますか？`)) {
            const remaining = history.filter(result => (result.studentId ?? 'grade5') !== activeProfile.id);
            if (saveHistory(remaining)) {
                setHistory(remaining);
                setStorageMessage('✓ 学習履歴を削除しました。');
            } else {
                setStorageMessage('⚠ 学習履歴を削除できませんでした。端末の記録は残しています。');
            }
        }
    }
    
    const handleRetry = () => {
        if (!selectedTopic || questions.length === 0) {
            navigate('grade');
            return;
        }
        setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const handleRetryWrong = () => {
        if (!quizResult) return;
        const wrongQuestions = quizResult.results.filter(result => !result.isCorrect).map((result, index) => ({ ...result.question, id: index }));
        if (wrongQuestions.length === 0) return;
        setQuestions(wrongQuestions);
        setQuizStartTime(Date.now());
        dispatch({ type: 'NAVIGATE', to: 'quiz' });
    };

    const getScreenTitle = () => {
        switch(nav.screen) {
            case 'history': return '学習履歴';
            case 'profile': return 'プロフィール';
            case 'parent': return '保護者向け進捗';
            case 'test_builder': return '範囲指定テスト';
            default: return `${activeProfile.name}さんの学習`;
        }
    }

    const renderScreen = () => {
        switch (nav.screen) {
            case 'grade':
                const availableGrades = getProfileCourseGrades(activeProfile);
                const reviewGrade = availableGrades[0];
                return <>
                    <LearnerSelector profiles={profiles} activeProfile={activeProfile} onSelect={(id) => {
                        setStorageMessage(selectProfile(id) ? '' : '⚠ 学習者の選択を端末に保存できませんでした。');
                        resetSelection();
                    }} />
                    <LearningDashboard grades={availableGrades} reviewGrade={reviewGrade} history={activeHistory} dailyGoal={activeProfile.dailyGoal} onQuickStart={handleQuickStart} onMixedTest={() => handleStartMixedTest(availableGrades)} onBuildTest={() => navigate('test_builder')} onSelectGrade={handleSelectGrade} onContinue={(grade, topic) => {
                        setSelectedGrade(grade);
                        setSelectedTopic(topic);
                        navigate('lesson');
                    }} />
                </>;
            case 'topic':
                return selectedGrade && <TopicSelector topics={TOPICS_BY_GRADE[selectedGrade]} onSelectTopic={(topic) => {
                    setSelectedTopic(topic);
                    navigate('lesson');
                }} onBack={() => navigate('grade')} />;
            case 'lesson':
                return selectedTopic && <LessonScreen topic={selectedTopic} onStart={() => navigate('difficulty')} onBack={() => navigate('topic')} />;
            case 'difficulty':
            case 'num_questions':
                return selectedTopic && <QuizSetup topic={selectedTopic} onStart={(level, count) => handleStartQuiz(count, level)} onBack={() => navigate('lesson')} />;
            case 'quiz':
                return questions.length > 0 && selectedTopic ? <Quiz questions={questions} onQuizComplete={handleQuizComplete} topicName={selectedTopic.name} onBack={quitQuiz} /> : <div>Loading...</div>;
            case 'result':
                return quizResult && <ResultsScreen result={quizResult} reportRecord={quizResultToReport(quizResult)} streak={consecutiveDays} onRetry={handleRetry} onRetryWrong={handleRetryWrong} onBackToTop={() => navigate('grade')} />;
            case 'history':
                return <HistoryScreen history={activeHistory} onBack={() => navigate('grade')} onClearHistory={handleClearHistory} />;
            case 'profile':
                return <ProfileScreen studentName={activeProfile.name} updateStudentName={updateStudentName} dailyGoal={activeProfile.dailyGoal} updateDailyGoal={updateDailyGoal} examDate={activeProfile.examDate} targetScore={activeProfile.targetScore} updateExamSettings={updateExamSettings} consecutiveDays={consecutiveDays} onBack={() => navigate('grade')} />;
            case 'parent':
                return <ParentDashboard grades={getProfileCourseGrades(activeProfile)} history={activeHistory} learnerName={activeProfile.name} profile={activeProfile} onBack={() => navigate('grade')} />;
            case 'test_builder':
                return <TestBuilder grades={getProfileCourseGrades(activeProfile)} reviewGrade={getProfileCourseGrades(activeProfile)[0]} onStart={handleStartCustomTest} onBack={() => navigate('grade')} />;
            default:
                return <div>Error</div>;
        }
    };

    return (
        <div className={`app-shell min-h-screen flex flex-col ${nav.screen === 'quiz' ? 'quiz-mode' : ''}`}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-sky-700 focus:shadow-lg">本文へ移動</a>
            <Header 
                title={getScreenTitle()} 
                onHistoryClick={() => navigate('history')} 
                onProfileClick={() => navigate('profile')}
                onParentClick={() => navigate('parent')}
                onHomeClick={() => navigate('grade')}
                activeScreen={nav.screen}
                focused={nav.screen === 'quiz'}
                onQuit={quitQuiz}
            />
            <main id="main-content" className="app-main flex-grow" tabIndex={-1}>
                {storageMessage && <div role="status" className={`mx-2 mt-2 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm font-semibold sm:mx-4 ${storageMessage.startsWith('✓') ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'}`}><span>{storageMessage}</span><button onClick={() => setStorageMessage('')} aria-label="通知を閉じる" className="min-h-12 min-w-12 shrink-0 rounded-lg">×</button></div>}
                 <div className={`screen-content screen-${nav.screen}`}>
                    {renderScreen()}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default App;
