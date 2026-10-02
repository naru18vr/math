
import React from 'react';
import type { Topic, Question, Difficulty } from '../types';
import { randInt, gcd } from './utils';

// Helper for fraction simplification
const simplifyFraction = (num: number, den: number): [number, number] => {
    if (den < 0) { // Keep denominator positive
        num = -num;
        den = -den;
    }
    const common = gcd(Math.abs(num), Math.abs(den));
    return [num / common, den / common];
};

// Helper to format factorization answers to be flexible with order
const formatFactorAnswer = (p1: string, p2: string): string => {
    // Sort alphabetically to create a canonical answer, so (x+2)(x+3) and (x+3)(x+2) are both correct
    if (p1 > p2) [p1, p2] = [p2, p1];
    return `${p1}${p2}`;
}

export const generateM3Question = (topic: Topic, difficulty: Difficulty): Omit<Question, 'id'> => {
  let text = '';
  let answer = '';
  let explanation = '';
  let figure: React.ReactNode | undefined = undefined;

  switch (topic.id) {
    case 'm3_factorization_basic': { // x² + bx + c
        let r1: number, r2: number;
        if (difficulty === '基礎') {
            r1 = randInt(1, 5);
            r2 = randInt(1, 5);
        } else if (difficulty === '標準') {
            r1 = randInt(-7, 7, [0]);
            r2 = randInt(-7, 7, [0, r1, -r1]);
        } else { // 発展
            r1 = randInt(-12, 12, [0, 1, -1]);
            r2 = randInt(-12, 12, [0, r1, -r1]);
        }

        const b = r1 + r2;
        const c = r1 * r2;
        if (c === 0) return generateM3Question(topic, difficulty);

        let bStr = '';
        if (b !== 0) bStr = ` ${b > 0 ? '+' : '-'} ${Math.abs(b)}x`;
        if (b === 1) bStr = ' + x';
        if (b === -1) bStr = ' - x';
        const cStr = ` ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
        text = `x^2${bStr}${cStr} を因数分解しなさい。`;

        const r1Str = `(x${r1 > 0 ? `+${r1}` : `${r1}`})`;
        const r2Str = `(x${r2 > 0 ? `+${r2}` : `${r2}`})`;
        answer = formatFactorAnswer(r1Str, r2Str);
        explanation = `足して ${b}、かけて ${c} になる2つの数は ${r1} と ${r2} です。したがって、${r1Str}${r2Str} と因数分解できます。`;
        break;
    }

    case 'm3_factorization_common_factor': { // 共通因数
        if (difficulty === '基礎') {
            const common = randInt(2, 5);
            const a = randInt(1, 5);
            const b = randInt(1, 5, [a]);
            const factor = common * gcd(a, b);
            const innerA = common * a / factor;
            const innerB = common * b / factor;
            text = `${common * a}x + ${common * b} を因数分解しなさい。`;
            answer = `${factor}(${innerA === 1 ? '' : innerA}x+${innerB})`;
            explanation = `最大の共通因数 ${factor} でくくります。答えは ${answer}。`;
        } else if (difficulty === '標準') {
            const common = randInt(2, 5);
            const commonVar = Math.random() < 0.5 ? 'x' : 'y';
            const a = randInt(1, 5);
            const b = randInt(1, 5);
            const otherVar = commonVar === 'x' ? 'y' : 'x';
            const factor = common * gcd(a, b);
            const innerA = common * a / factor;
            const innerB = common * b / factor;
            text = `${common * a}${commonVar}${otherVar} + ${common * b}${commonVar} を因数分解しなさい。`;
            answer = `${factor}${commonVar}(${innerA === 1 ? '' : innerA}${otherVar}+${innerB})`;
            explanation = `最大の共通因数 ${factor}${commonVar} でくくります。答えは ${answer}。`;
        } else { // 発展
            const common = ['a', 'b'][randInt(0, 1)];
            const p1 = randInt(1, 2);
            const p2 = randInt(1, 2);
            const v1 = 'x';
            const v2 = 'y';
            const term1 = p1 === 1 ? v1 : `${v1}^${p1}`;
            const term2 = p2 === 1 ? v2 : `${v2}^${p2}`;
            text = `${common}${term1} + ${common}${term2} を因数分解しなさい。`;
            answer = `${common}(${term1}+${term2})`;
            explanation = `共通因数 ${common} でくくります。答えは ${answer}。`;
        }
        break;
    }

    case 'm3_factorization_formula': { // 公式
        const a = randInt(2, 9);
        if (difficulty === '基礎') {
            if (Math.random() < 0.5) {
                text = `x^2 + ${2 * a}x + ${a * a} を因数分解しなさい。`;
                answer = `(x+${a})^2`;
                explanation = `公式 a²+2ab+b² = (a+b)² を使います。答えは ${answer}。`;
            } else {
                text = `x^2 - ${2 * a}x + ${a * a} を因数分解しなさい。`;
                answer = `(x-${a})^2`;
                explanation = `公式 a²-2ab+b² = (a-b)² を使います。答えは ${answer}。`;
            }
        } else if (difficulty === '標準') {
            text = `x^2 - ${a * a} を因数分解しなさい。`;
            answer = formatFactorAnswer(`(x+${a})`, `(x-${a})`);
            explanation = `公式 a²-b² = (a+b)(a-b) を使います。答えは (x+${a})(x-${a})。`;
        } else { // 発展
            const coeff = randInt(2, 4);
            const candidates = [2, 3, 4, 5].filter(value => gcd(coeff, value) === 1);
            const term = candidates[randInt(0, candidates.length - 1)];
            const v1 = 'x';
            const v2 = 'y';
            text = `${coeff*coeff}${v1}^2 - ${term*term}${v2}^2 を因数分解しなさい。`;
            const p1 = `(${coeff}${v1}+${term}${v2})`;
            const p2 = `(${coeff}${v1}-${term}${v2})`;
            answer = formatFactorAnswer(p1, p2);
            explanation = `公式 a²-b² = (a+b)(a-b) を使います。この場合 a=${coeff}${v1}, b=${term}${v2} です。答えは ${p1}${p2}。`;
        }
        break;
    }

    case 'm3_square_roots_simplify': { // 平方根の簡略化
        if (difficulty === '基礎') {
            const n = randInt(2, 12);
            text = `√${n*n} を計算しなさい。`;
            answer = n.toString();
            explanation = `√${n*n} は2乗すると${n*n}になる正の数なので、答えは ${n} です。`;
        } else if (difficulty === '標準') {
            const inside = [2, 3, 5, 6, 7];
            const outside = randInt(2, 5);
            const num = (outside ** 2) * inside[randInt(0, inside.length - 1)];
            text = `√${num} を簡単にしなさい。(a√bの形で)`;
            answer = `${outside}√${num / (outside ** 2)}`;
            explanation = `${num}を素因数分解すると ${outside}^2 × ${num / (outside ** 2)} となります。√の外に出せるのは${outside}です。答えは ${answer}。`;
        } else { // 発展
            const num = randInt(2, 7);
            const den = [2, 3, 5, 6, 7][randInt(0, 4)];
            text = `${num}/√${den} の分母を有理化しなさい。`;
            const common = gcd(num, den);
            const sNum = num / common;
            const sDen = den / common;

            answer = `${sNum}√${den}/${sDen}`;
            if(sDen === 1) answer = `${sNum}√${den}`;
            
            explanation = `分母と分子に√${den}を掛けます。(${num}×√${den})/(√${den}×√${den}) = ${num}√${den}/${den}。約分して ${answer}。`;
        }
        break;
    }

    case 'm3_square_roots_calculation': { // 平方根の計算
        if (difficulty === '基礎') {
            const a = randInt(2, 7);
            const b = randInt(2, 7, [a]);
            text = `√${a} × √${b} = ?`;
            const num = a*b;
            let outside = 1;
            let inside = num;
            for (let i = 4; i > 1; i--) { // Check for squares of 4,3,2
                const sq = i*i;
                if(inside % sq === 0) {
                    outside *= i;
                    inside /= sq;
                    i++; // Re-check the same factor
                }
            }
            answer = outside === 1 ? `√${inside}` : `${outside}√${inside}`;
            explanation = `√a × √b = √(ab) です。√( ${a} × ${b} ) = √${num}。これを簡単にして ${answer} となります。`;
        } else if (difficulty === '標準') {
            const a = randInt(1, 5);
            const b = randInt(1, 5);
            const c = [2, 3, 5, 7][randInt(0, 3)];
            if (Math.random() > 0.5) {
                text = `${a === 1 ? '' : a}√${c} + ${b === 1 ? '' : b}√${c} = ?`;
                answer = `${a + b}√${c}`;
                explanation = `√の中が同じなので、係数を足し算します。(${a}+${b})√${c} = ${answer}。`;
            } else {
                const bigA = Math.max(a, b);
                const smallA = Math.min(a, b);
                text = `${bigA === 1 ? '' : bigA}√${c} - ${smallA === 1 ? '' : smallA}√${c} = ?`;
                const res = bigA - smallA;
                answer = res === 0 ? '0' : res === 1 ? `√${c}` : `${res}√${c}`;
                explanation = `√の中が同じなので、係数を引き算します。(${bigA}-${smallA})√${c} = ${answer}。`;
            }
        } else { // 発展
            const root = [2,3,5][randInt(0,2)];
            const c1 = randInt(1,3);
            const c2 = randInt(2,4);
            const c3 = randInt(2,4);
            const n2 = c2*c2*root;
            const n3 = c3*c3*root;
            if (n2 === n3) return generateM3Question(topic, difficulty);
            text = `${c1}√${root} + √${n2} - √${n3} = ?`;
            const resultCoeff = c1 + c2 - c3;
            answer = resultCoeff === 0 ? '0' : resultCoeff === 1 ? `√${root}` : `${resultCoeff}√${root}`;
            explanation = `まず√を簡単にします。√${n2}=${c2}√${root}, √${n3}=${c3}√${root}。式は ${c1}√${root} + ${c2}√${root} - ${c3}√${root} となります。係数を計算して(${c1}+${c2}-${c3})√${root} = ${answer}。`;
        }
        break;
    }

    case 'm3_quadratic_equations_factorization': { // 二次方程式（因数分解）
        if (difficulty === '基礎') {
            const r1 = randInt(1, 5);
            const r2 = randInt(-5, -1);
            const b = -(r1 + r2);
            const c = r1 * r2;
            let bStr = b !== 0 ? (b > 0 ? `+${b}x` : `${b}x`) : '';
            let cStr = c !== 0 ? (c > 0 ? `+${c}` : `${c}`) : '';
            text = `二次方程式 x^2 ${bStr} ${cStr} = 0 を解きなさい。(例: x=2,3)`;
            const roots = [r1, r2].sort((a,b) => a - b);
            answer = `x=${roots.join(',')}`;
            explanation = `因数分解すると (x ${r1 > 0 ? `- ${r1}`: `+ ${-r1}`})(x ${r2 > 0 ? `- ${r2}`: `+ ${-r2}`}) = 0 となります。したがって、解は x = ${r1} と x = ${r2} です。`;
        } else if (difficulty === '標準') {
            const root = randInt(2,9) * (Math.random() < 0.5 ? 1 : -1);
            text = `x^2 ${-root >= 0 ? `+ ${-root}` : `- ${root}`}x = 0 を解きなさい。(例: x=0,2)`;
            const sortedRoots = [0, root].sort((a,b)=>a-b);
            answer = `x=${sortedRoots.join(',')}`;
            explanation = `共通因数xでくくると x(x ${-root >= 0 ? `+ ${-root}` : `- ${root}`}) = 0 となります。したがって、解は x=0 と x=${root} です。`;
        } else { // 発展
            const a = randInt(2,3);
            const r1_num = randInt(1,5) * (Math.random() < 0.5 ? 1: -1);
            const r2 = randInt(1,5) * (Math.random() < 0.5 ? 1: -1);
            // (ax+c)(x+d) = 0 => x=-c/a, x=-d
            const x2Coeff = a;
            const xCoeff = a*r2 + r1_num;
            const constTerm = r1_num*r2;
            if (xCoeff === 0 || constTerm === 0) return generateM3Question(topic, difficulty);
            
            let xStr = xCoeff > 0 ? `+${xCoeff}x` : `${xCoeff}x`;
            let constStr = constTerm > 0 ? `+${constTerm}`: `${constTerm}`;
            text = `${x2Coeff}x^2 ${xStr} ${constStr} = 0 を解きなさい。(例: x=2,3/2)`;
            
            const [sNum, sDen] = simplifyFraction(-r1_num, a);
            const root1Str = sDen === 1 ? sNum.toString() : `${sNum}/${sDen}`;
            const root2Val = -r2;
            
            const r1Val = sNum/sDen;
            const sortedRoots = [r1Val, root2Val].sort((a,b)=>a-b);
            const finalRoots = sortedRoots.map(r => r === r1Val ? root1Str : root2Val.toString());
            
            answer = `x=${finalRoots.join(',')}`;
            explanation = `因数分解すると (${a}x ${r1_num>0?`+${r1_num}`:`${r1_num}`})(x ${r2>0?`+${r2}`:`${r2}`})=0。解は x=${root1Str} と x=${root2Val} です。`;
        }
        break;
    }

    case 'm3_quadratic_equations_formula': { // 二次方程式（解の公式）
        let a: number, b: number, c: number;
        if (difficulty === '基礎') {
            a = 1;
            b = randInt(-7, 7, [0]);
            c = randInt(-10, 10, [0]);
        } else if (difficulty === '標準') {
            a = randInt(2, 3);
            b = randInt(-9, 9, [0]);
            c = randInt(-9, 9, [0]);
        } else { // 発展 (重解)
            a = randInt(1, 4);
            const k = randInt(1,5);
            b = 2 * a * k;
            c = a * k * k;
            if(Math.random() < 0.5) b = -b;
        }

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0 || Math.sqrt(discriminant) % 1 !== 0) {
            return generateM3Question(topic, difficulty); // Avoid irrational or complex roots
        }

        let aStr = a === 1 ? 'x^2' : `${a}x^2`;
        let bStr = b !== 0 ? ` ${b > 0 ? '+' : '-'} ${Math.abs(b)}x` : '';
        let cStr = c !== 0 ? ` ${c > 0 ? '+' : '-'} ${Math.abs(c)}` : '';
        text = `二次方程式 ${aStr}${bStr}${cStr} = 0 を解の公式を使って解きなさい。(例: x=2,3)`;

        const sqrtD = Math.sqrt(discriminant);
        const den = 2*a;
        
        if (discriminant === 0) {
            const [s_num, s_den] = simplifyFraction(-b, den);
            answer = `x=${s_den === 1 ? s_num : `${s_num}/${s_den}`}`;
            explanation = `解の公式 x = (-b ± √(b²-4ac))/2a を使います。判別式D=b²-4ac=0なので、解は1つ(重解)です。答えは ${answer} です。`;
        } else {
            const x1_num = -b + sqrtD;
            const x2_num = -b - sqrtD;
            const [s1_num, s1_den] = simplifyFraction(x1_num, den);
            const [s2_num, s2_den] = simplifyFraction(x2_num, den);
            const roots = [
                { numerator: s1_num, denominator: s1_den },
                { numerator: s2_num, denominator: s2_den },
            ].sort((first, second) =>
                first.numerator * second.denominator - second.numerator * first.denominator,
            );
            const finalRoots = roots.map(({ numerator, denominator }) =>
                denominator === 1 ? numerator.toString() : `${numerator}/${denominator}`,
            );
            answer = `x=${finalRoots.join(',')}`;
            explanation = `解の公式 x = (-b ± √(b²-4ac))/2a を使います。答えは ${answer} です。`;
        }
        break;
    }
    
    case 'm3_pythagorean_theorem': { // 三平方の定理
        text = '図の直角三角形について、xの長さを求めなさい。';

        let aStr: string, bStr: string, cStr: string;
        let a_val: number, b_val: number;

        if (difficulty === '基礎') {
            const triples = [[3, 4, 5], [5, 12, 13]];
            const [a, b, c] = triples[randInt(0, triples.length - 1)];
            aStr = a.toString(); bStr = b.toString(); cStr = 'x';
            answer = c.toString();
            a_val = a; b_val = b;
            explanation = `三平方の定理 a² + b² = c² より、x² = ${a}² + ${b}² = ${a*a + b*b} = ${c*c}。よって x = ${c}。`;
        } else if (difficulty === '標準') {
            const triples = [[8, 15, 17], [7, 24, 25]];
            const multiplier = randInt(1,2);
            const [a, b, c] = triples[randInt(0, triples.length - 1)].map(n => n * multiplier);
            if (Math.random() < 0.5) {
                aStr = 'x'; bStr = b.toString(); cStr = c.toString();
                answer = a.toString();
                a_val = a; b_val = b;
                explanation = `三平方の定理 a² + b² = c² より、x² + ${b}² = ${c}²。 x² = ${c*c - b*b} = ${a*a}。よって x = ${a}。`;
            } else {
                aStr = a.toString(); bStr = 'x'; cStr = c.toString();
                answer = b.toString();
                a_val = a; b_val = b;
                explanation = `三平方の定理 a² + b² = c² より、${a}² + x² = ${c}²。 x² = ${c*c - a*a} = ${b*b}。よって x = ${b}。`;
            }
        } else { // 発展
            const side1 = randInt(2, 11);
            const side2 = randInt(2, 11, [side1]);
            if (Math.random() < 0.5) { // find hypotenuse
                 aStr = `√${side1}`; bStr = `√${side2}`; cStr = 'x';
                 a_val = Math.sqrt(side1); b_val = Math.sqrt(side2);
                 const ans_inside = side1+side2;
                 answer = `√${ans_inside}`;
                 explanation = `三平方の定理 a² + b² = c² より、x² = (√${side1})² + (√${side2})² = ${side1} + ${side2} = ${ans_inside}。よって x = √${ans_inside}。`;
            } else { // find a leg
                const c_val = side1+side2;
                aStr = `√${side1}`; bStr = 'x'; cStr = `√${c_val}`;
                a_val = Math.sqrt(side1); b_val = Math.sqrt(side2);
                answer = `√${side2}`;
                explanation = `三平方の定理 a² + b² = c² より、(√${side1})² + x² = (√${c_val})²。${side1} + x² = ${c_val}。 x² = ${c_val}-${side1}=${side2}。よって x = √${side2}。`;
            }
        }

        const svgWidth = 220, svgHeight = 200;
        const maxDim = 160;
        const scale = maxDim / Math.max(a_val, b_val);
        const base = a_val * scale;
        const height = b_val * scale;
        const xOffset = (svgWidth - base) / 2;
        const yOffset = (svgHeight - height) / 2;
        
        figure = React.createElement('svg', { width: svgWidth, height: svgHeight, viewBox: `0 0 ${svgWidth} ${svgHeight}`, style: { pointerEvents: 'none' } },
            React.createElement('polygon', {
                points: `${xOffset},${yOffset+height} ${xOffset+base},${yOffset+height} ${xOffset+base},${yOffset}`,
                fill: "rgba(80, 160, 240, 0.3)",
                stroke: "#334155",
                strokeWidth: "2"
            }),
            React.createElement('rect', {
                x: xOffset+base-10, y: yOffset+height-10,
                width: "10", height: "10",
                stroke: "#334155", strokeWidth: "1.5", fill: "none"
            }),
            React.createElement('text', { x: xOffset+base/2, y: yOffset+height+20, textAnchor:"middle", fontSize:"16" }, aStr),
            React.createElement('text', { x: xOffset+base+10, y: yOffset+height/2, dominantBaseline:"middle", fontSize:"16" }, bStr),
            React.createElement('text', { x: xOffset+base/2-10, y: yOffset+height/2-10, dominantBaseline:"middle", textAnchor:"end", transform: `rotate(-${Math.atan(height/base)*180/Math.PI} ${xOffset+base/2} ${yOffset+height/2})`, fontSize:"16" }, cStr)
        );
        break;
    }
    default:
      return { text: `「${topic.name}」の問題は準備中です。`, answer: '', explanation: '' };
  }
  return { text, answer, explanation, figure };
};
