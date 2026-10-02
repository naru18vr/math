import { describe, expect, it } from 'vitest';
import { DIFFICULTY_LEVELS, TOPICS_BY_GRADE } from '../constants';
import type { Difficulty, Topic } from '../types';
import { generateQuestions, generateTopicMixQuestions } from './questionService';

const topics = Object.values(TOPICS_BY_GRADE).flat();
const difficulties = DIFFICULTY_LEVELS.map(level => level.id);

const assertValidQuestion = (topic: Topic, difficulty: Difficulty) => {
    const questions = generateQuestions(topic, 100, difficulty);

    expect(questions, `${topic.id} (${difficulty})`).toHaveLength(100);
    questions.forEach((question, index) => {
        expect(question.id).toBe(index);
        expect(question.text.trim()).not.toBe('');
        expect(question.answer.trim()).not.toBe('');
        expect(question.explanation.trim()).not.toBe('');
        expect(question.text).not.toContain('準備中です');
        expect(`${question.text}${question.answer}${question.explanation}`).not.toMatch(/NaN|undefined|Infinity/);
    });
};

describe('question generators', () => {
    it('lists every topic once and includes the added middle 3 practice areas', () => {
        expect(new Set(topics.map(topic => topic.id)).size).toBe(topics.length);
        expect(TOPICS_BY_GRADE['中3'].map(topic => topic.id)).toEqual(expect.arrayContaining([
            'm3_quadratic_equations_square', 'm3_quadratic_equation_word', 'm3_quadratic_function_rate',
            'm3_quadratic_function_range', 'm3_similarity_area_volume', 'm3_similarity_parallel',
            'm3_similarity_conditions', 'm3_pythagorean_application', 'm3_sampling_method',
        ]));
    });
    it('generates a complete, answerable set for every topic and difficulty', () => {
        topics.forEach(topic => {
            difficulties.forEach(difficulty => assertValidQuestion(topic, difficulty));
        });
    });

    it('assigns stable sequential ids to a generated quiz', () => {
        const questions = generateQuestions(topics[0], 10, '標準');
        expect(questions.map(question => question.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('builds a mixed test only from selected topics', () => {
        const selected = topics.slice(0, 3);
        const questions = generateTopicMixQuestions(selected, 20, '標準');
        expect(questions).toHaveLength(20);
        expect(questions.every(question => selected.some(topic => topic.id === question.topicId))).toBe(true);
    });
});
