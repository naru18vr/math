import { useState } from 'react';
import { DIFFICULTY_LEVELS, NUM_QUESTIONS_OPTIONS } from '../constants';
import type { Difficulty, Topic } from '../types';

export const UIIcon = ({ kind, size = 22 }: { kind: 'home' | 'history' | 'progress' | 'settings' | 'arrow' | 'play'; size?: number }) => {
    const paths = {
        home: 'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9',
        history: 'M4 5v5h5M4 10a8 8 0 1 1 1 8M12 7v5l3 2',
        progress: 'M4 20h16M7 16v-5M12 16V5M17 16V8',
        settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
        arrow: 'M5 12h14M13 6l6 6-6 6',
        play: 'm9 5 10 7-10 7Z',
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
};

export const Header = ({ title, activeScreen, focused, onHistoryClick, onProfileClick, onParentClick, onHomeClick, onQuit }: {
    title: string; activeScreen: string; focused: boolean;
    onHistoryClick: () => void; onProfileClick: () => void; onParentClick: () => void; onHomeClick: () => void; onQuit: () => void;
}) => {
    const items = [
        { label: '学習', icon: 'home' as const, active: !['history', 'parent', 'profile'].includes(activeScreen), action: onHomeClick },
        { label: '履歴', icon: 'history' as const, active: activeScreen === 'history', action: onHistoryClick },
        { label: '進捗', icon: 'progress' as const, active: activeScreen === 'parent', action: onParentClick },
        { label: '設定', icon: 'settings' as const, active: activeScreen === 'profile', action: onProfileClick },
    ];
    return <header className={`app-header ${focused ? 'is-focused' : ''}`}>
        <div className="header-inner">
            <div className="brand"><span className="brand-mark" aria-hidden="true">＋</span><div><h1>数学トレーニング</h1><p>{focused ? 'ひとつずつ、じっくり。' : title}</p></div></div>
            {focused ? <button className="quiet-button" onClick={onQuit}>練習を終了</button> : <nav className="main-navigation" aria-label="メインメニュー">{items.map(item => <button key={item.label} onClick={item.action} aria-current={item.active ? 'page' : undefined} className={item.active ? 'is-active' : ''}><UIIcon kind={item.icon} /><span>{item.label}</span></button>)}</nav>}
        </div>
    </header>;
};

export const QuizSetup = ({ topic, onStart, onBack }: { topic: Topic; onStart: (level: Difficulty, count: number) => void; onBack: () => void }) => {
    const [level, setLevel] = useState<Difficulty>('基礎');
    const [count, setCount] = useState(10);
    return <div className="screen-padding setup-screen">
        <button className="back-link" onClick={onBack}>← 学習ポイントに戻る</button>
        <p className="eyebrow">練習の準備</p><h2 className="screen-title">自分のペースで始めよう</h2><p className="screen-description">{topic.name}</p>
        <div className="surface setup-card">
            <fieldset><legend>1. 難易度</legend><div className="choice-grid">{DIFFICULTY_LEVELS.map(item => <button key={item.id} aria-pressed={level === item.id} onClick={() => setLevel(item.id)} className={`choice-button ${level === item.id ? 'is-selected' : ''}`}><strong>{item.name}</strong><span>{item.description}</span></button>)}</div></fieldset>
            <fieldset><legend>2. 問題数</legend><div className="choice-grid">{NUM_QUESTIONS_OPTIONS.map(item => <button key={item.num} aria-pressed={count === item.num} onClick={() => setCount(item.num)} className={`choice-button ${count === item.num ? 'is-selected' : ''}`}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div></fieldset>
            <p className="setup-summary">{level} · {count}問<span>解いたあとに解説を確認できます</span></p>
            <button className="primary-button" onClick={() => onStart(level, count)}>{count}問で始める<UIIcon kind="arrow" /></button>
        </div>
    </div>;
};

export const TopicSelector = ({ topics, onSelectTopic, onBack }: { topics: Topic[]; onSelectTopic: (topic: Topic) => void; onBack: () => void }) => {
    const [query, setQuery] = useState('');
    const visible = topics.filter(topic => topic.name.includes(query.trim()));
    return <div className="screen-padding">
        <button onClick={onBack} className="back-link">← 学年選択に戻る</button>
        <p className="eyebrow">学びたいところから</p><h2 className="screen-title">単元を選ぼう</h2>
        <label className="search-field"><span>単元を探す</span><input type="search" placeholder="例：平方根、相似" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className="list-count" role="status">{visible.length}単元</p>
        <div className="topic-grid">{visible.map(topic => <button key={topic.id} onClick={() => onSelectTopic(topic)} className="topic-card"><span><small>学習ポイントと練習</small><strong>{topic.name}</strong></span><UIIcon kind="arrow" /></button>)}</div>
        {visible.length === 0 && <div className="empty-state"><p>該当する単元がありません。</p><button className="secondary-button" onClick={() => setQuery('')}>検索をクリア</button></div>}
    </div>;
};

export const Keypad = ({ onKeyPress, answer }: { onKeyPress: (key: string) => void; answer: string }) => {
    const [showMore, setShowMore] = useState(false);
    const order = ['+', '*', '(', ')', '^', '=', ',', ':', '√', 'π', 'x', 'y', 'a', 'b', 'c', 'd', 'e', 'f', 'r'];
    const required = order.filter(key => answer.includes(key));
    const symbols = showMore ? order : required;
    const keyButton = (key: string, label = key, className = '') => <button key={key} className={`keypad-key ${className}`} onClick={() => onKeyPress(key)} aria-label={key === '⌫' ? '1文字消す' : key === 'clear' ? '答えをすべて消す' : label}>{label}</button>;
    return <div className="answer-keypad" aria-label="解答用キーパッド">
        <div className="number-keys">
            {['7', '8', '9'].map(key => keyButton(key))}{keyButton('⌫', '⌫', 'edit-key')}
            {['4', '5', '6'].map(key => keyButton(key))}{keyButton('clear', '全消去', 'edit-key clear-key')}
            {['1', '2', '3'].map(key => keyButton(key))}{keyButton('-', '−', 'symbol-key')}
            {keyButton('0', '0', 'zero-key')}{keyButton('.')}{keyButton('/', '÷', 'symbol-key')}
        </div>
        {symbols.length > 0 && <div className="symbol-keys">{symbols.map(key => keyButton(key, key === '*' ? '×' : key === 'r' ? 'あまり' : key, 'symbol-key'))}</div>}
        <button className="more-symbols" aria-expanded={showMore} onClick={() => setShowMore(!showMore)}>{showMore ? 'この問題の記号だけにする' : 'ほかの記号を使う'}<span aria-hidden="true">{showMore ? '−' : '＋'}</span></button>
    </div>;
};
