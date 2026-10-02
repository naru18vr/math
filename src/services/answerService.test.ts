import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, normalizeAnswer } from './answerService';

describe('answer service', () => {
    it('accepts squared and cubed units after symbol normalization', () => {
        for (const input of ['12cm²', '12cm³', '12m²', '12m³', '12ml']) expect(isAnswerCorrect(input, '12')).toBe(true);
    });

    it('compares radical expressions and numeric values safely', () => {
        expect(isAnswerCorrect('3', '√9')).toBe(true);
        expect(isAnswerCorrect('√4', '2')).toBe(true);
        expect(isAnswerCorrect('1/√2', '√2/2')).toBe(true);
        expect(isAnswerCorrect('(2+√8)/2', '1+√2')).toBe(true);
        expect(isAnswerCorrect('1/0', '1')).toBe(false);
        expect(isAnswerCorrect('globalThis.alert(1)', '1')).toBe(false);
        expect(isAnswerCorrect('', '')).toBe(false);
    });

    it('keeps prime factorization answers as products of primes', () => {
        expect(isAnswerCorrect('2*2*3*5', '2^2*3*5')).toBe(true);
        expect(isAnswerCorrect('60', '2^2*3*5')).toBe(false);
        expect(isAnswerCorrect('6*10', '2^2*3*5')).toBe(false);
        expect(isAnswerCorrect('(x+2)(x+2)', '(x+2)^2')).toBe(true);
    });

    it('compares each solution value while preserving variable identity', () => {
        expect(isAnswerCorrect('x=2/4,3', 'x=3,1/2')).toBe(true);
        expect(isAnswerCorrect('x=-√8,x=√8', 'x=2√2,-2√2')).toBe(true);
        expect(isAnswerCorrect('x=1+√2,1-√2', 'x=(2-√8)/2,(2+√8)/2')).toBe(true);
        expect(isAnswerCorrect('y=0.5,x=3/2', 'x=1.5,y=1/2')).toBe(true);
        expect(isAnswerCorrect('x=0.5,y=1.5', 'x=1.5,y=1/2')).toBe(false);
        expect(isAnswerCorrect('x=2,2', 'x=2')).toBe(true);
    });

    it('accepts equivalent ratios but keeps ordered value pairs ordered', () => {
        expect(isAnswerCorrect('4:6', '2:3')).toBe(true);
        expect(isAnswerCorrect('3:2', '2:3')).toBe(false);
        expect(isAnswerCorrect('0,2/4', '0,0.5')).toBe(true);
        expect(isAnswerCorrect('3,0', '0,3')).toBe(false);
    });
    it('accepts full-width input and common units', () => {
        expect(isAnswerCorrect('１２cm', '12')).toBe(true);
        expect(normalizeAnswer('ＳＱＲＴ ９')).toBe('√9');
    });

    it('accepts equivalent fractions and decimals', () => {
        expect(isAnswerCorrect('2/4', '1/2')).toBe(true);
        expect(isAnswerCorrect('0.5', '1/2')).toBe(true);
    });

    it('does not accept a different value', () => {
        expect(isAnswerCorrect('2/3', '1/2')).toBe(false);
    });

    it('accepts common math symbols and superscript input', () => {
        expect(isAnswerCorrect('x²＋5x＋6', 'x^2+5x+6')).toBe(true);
        expect(isAnswerCorrect('3×4', '3*4')).toBe(true);
        expect(isAnswerCorrect('12÷3', '12/3')).toBe(true);
    });

    it('accepts solutions and simultaneous answers in either order', () => {
        expect(isAnswerCorrect('x=3,2', 'x=2,3')).toBe(true);
        expect(isAnswerCorrect('y=3,x=2', 'x=2,y=3')).toBe(true);
        expect(isAnswerCorrect('d=a', 'a=d')).toBe(true);
    });

    it('accepts equivalent radical and reordered polynomial forms', () => {
        expect(isAnswerCorrect('2√2', '√8')).toBe(true);
        expect(isAnswerCorrect('3√2/2', '√18/2')).toBe(true);
        expect(isAnswerCorrect('6+5x+x^2', 'x^2+5x+6')).toBe(true);
        expect(isAnswerCorrect('x^2+4x+6', 'x^2+5x+6')).toBe(false);
    });
});
