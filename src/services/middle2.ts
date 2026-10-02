
import React from 'react';
import type { Topic, Question, Difficulty } from '../types';
import { randInt } from './utils';

// Helper for formatting equations
const formatEq = (a: number, b: number, c: number, xVar = 'x', yVar = 'y') => {
    let eq = '';
    if (a !== 0) {
        if (a === 1) eq += `${xVar} `;
        else if (a === -1) eq += `-${xVar} `;
        else eq += `${a}${xVar} `;
    }
    if (b !== 0) {
        if (b > 0 && a !== 0) eq += `+ `;
        else if (b < 0) {
            eq += `- `;
        }
        if (Math.abs(b) === 1) eq += `${yVar} `;
        else eq += `${Math.abs(b)}${yVar} `;
    }
    return eq.trim() + ` = ${c}`;
};

export const generateM2Question = (topic: Topic, difficulty: Difficulty): Omit<Question, 'id'> => {
  let text = '';
  let answer = '';
  let explanation = '';
  let figure: React.ReactNode | undefined = undefined;

  switch (topic.id) {
    case 'm2_simultaneous_equations_elimination': { // 加減法
        const x = randInt(-5, 5, [0]);
        const y = randInt(-5, 5, [0, x]);
        let a1: number, b1: number, c1: number, a2: number, b2: number, c2: number;

        if (difficulty === '基礎') {
            // x+y=c1, x-y=c2
            a1 = 1; b1 = 1; a2 = 1; b2 = -1;
            if (Math.random() < 0.5) [a2, b2] = [-1, 1]; // -x+y=c2
            c1 = a1 * x + b1 * y;
            c2 = a2 * x + b2 * y;
            explanation = `基礎：2つの式をそのまま足すか引くことで、どちらかの文字を消去できます。答えは x=${x}, y=${y} です。`;
        } else if (difficulty === '標準') {
            // 2x+y=c1, 3x+2y=c2
            const mult = randInt(2, 3);
            a1 = randInt(1, 3); b1 = 1;
            a2 = randInt(1, 3, [a1, a1 * mult]); b2 = mult;
            c1 = a1 * x + b1 * y;
            c2 = a2 * x + b2 * y;
            explanation = `標準：片方の式を${mult}倍して係数をそろえ、加減法で解きます。答えは x=${x}, y=${y} です。`;
        } else { // 発展
            // 2x+3y=c1, 3x-2y=c2
            a1 = randInt(2, 3); b1 = randInt(2, 3);
            a2 = randInt(2, 3, [a1]); b2 = randInt(-3, -2, [b1]);
            c1 = a1 * x + b1 * y;
            c2 = a2 * x + b2 * y;
            explanation = `発展：両方の式を適切な数で倍分し、係数をそろえてから加減法で解きます。答えは x=${x}, y=${y} です。`;
        }
        text = `連立方程式を解きなさい: ${formatEq(a1,b1,c1)},  ${formatEq(a2,b2,c2)} (例: x=5,y=-2)`;
        answer = `x=${x},y=${y}`;
        break;
    }
    case 'm2_simultaneous_equations_substitution': { // 代入法
        const x = randInt(-5, 5, [0]);
        const y = randInt(-5, 5, [0, x]);
        let firstEqText: string, secondEqText: string;

        if (difficulty === '基礎') {
            // y = Ax+B or x = Ay+B
            const substituteX = Math.random() < 0.5;
            let a2 = randInt(2, 4);
            const b2 = randInt(2, 4);

            if (substituteX) { // x = ...
                const A = randInt(1, 3) * (Math.random() < 0.5 ? 1 : -1);
                const B = x - A * y;
                if (b2 + a2 * A === 0) a2 += 1;
                firstEqText = `x = ${A === 1 ? '' : A === -1 ? '-' : A}y ${B >= 0 ? `+ ${B}` : `- ${-B}`}`;
            } else { // y = ...
                const A = randInt(1, 3) * (Math.random() < 0.5 ? 1 : -1);
                const B = y - A * x;
                if (a2 + b2 * A === 0) a2 += 1;
                firstEqText = `y = ${A === 1 ? '' : A === -1 ? '-' : A}x ${B >= 0 ? `+ ${B}` : `- ${-B}`}`;
            }
            secondEqText = formatEq(a2, b2, a2 * x + b2 * y);
            explanation = `基礎：最初の式を2番目の式に代入して解きます。答えは x=${x}, y=${y} です。`;
        } else if (difficulty === '標準') {
            // 2x+y=c1, ax+by=c2  -> y = -2x+c1
            const a1 = randInt(2, 4); const b1 = 1;
            const b2 = randInt(2, 4);
            const a2 = randInt(2, 4, [a1, a1 * b2]);
            const c1 = a1*x + b1*y;
            const c2 = a2*x + b2*y;
            firstEqText = formatEq(a1, b1, c1);
            secondEqText = formatEq(a2, b2, c2);
            explanation = `標準：最初の式を y=... の形に変形し、2番目の式に代入します。答えは x=${x}, y=${y} です。`;
        } else { // 発展
             // ax+by=c1, dx+ey=c2  (no coeffs are 1)
            const a1 = randInt(2, 4); const b1 = randInt(2, 4);
            const b2 = randInt(2, 4, [b1]);
            const a2 = randInt(2, 4, [a1, a1 * b2 / b1]);
            const c1 = a1*x + b1*y;
            const c2 = a2*x + b2*y;
            firstEqText = formatEq(a1, b1, c1);
            secondEqText = formatEq(a2, b2, c2);
            explanation = `発展：どちらかの式を x=... または y=... の形に変形して代入します。分数が出てくる可能性があります。答えは x=${x}, y=${y} です。`;
        }
        text = `連立方程式を解きなさい: ${firstEqText},  ${secondEqText} (例: x=5,y=-2)`;
        answer = `x=${x},y=${y}`;
        break;
    }
    case 'm2_linear_functions_value': { // 値の計算
        const a = randInt(-3, 3, [0]);
        const b = randInt(-5, 5);
        const funcStr = `y = ${a === 1 ? '' : a === -1 ? '-' : a}x ${b >= 0 ? `+ ${b}` : `- ${-b}`}`;

        if (difficulty === '基礎') {
            const x = randInt(1, 5);
            const y = a * x + b;
            text = `一次関数 ${funcStr} について、x=${x}のときのyの値を求めなさい。`;
            answer = y.toString();
            explanation = `${funcStr} の式に x=${x} を代入します。y = ${a} × ${x} ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${y}。`;
        } else if (difficulty === '標準') {
            const x = randInt(-5, -1);
            const y = a * x + b;
            text = `一次関数 ${funcStr} について、x=${x}のときのyの値を求めなさい。`;
            answer = y.toString();
            explanation = `${funcStr} の式に x=${x} を代入します。y = ${a} × (${x}) ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${y}。`;
        } else { // 発展
            const x1 = randInt(-4, 0);
            const x2 = randInt(1, 5);
            const y1 = a * x1 + b;
            const y2 = a * x2 + b;
            text = `一次関数 ${funcStr} で、xの値が${x1}から${x2}まで増加するときの変化の割合を求めなさい。`;
            answer = a.toString();
            explanation = `変化の割合は一次関数の傾きaと同じです。この関数の傾きは ${a} です。計算する場合: (yの増加量)/(xの増加量) = (${y2} - ${y1}) / (${x2} - ${x1}) = ${y2-y1}/${x2-x1} = ${a}。`;
        }
        break;
    }
    case 'm2_linear_functions_equation': { // 式の決定
        const a = randInt(-3, 3, [0]);
        const b = randInt(-5, 5);
        const answerStr = `y=${a === 1 ? '' : a === -1 ? '-' : a}x${b > 0 ? `+${b}` : b < 0 ? `${b}` : ''}`;
        
        if (difficulty === '基礎') {
            const x1 = randInt(-5, 5, [0]);
            const y1 = a * x1 + b;
            text = `傾きが${a}で、点(${x1}, ${y1})を通る一次関数の式を求めなさい。(例: y=2x+3)`;
            explanation = `y=ax+b に傾きa=${a}を代入し y=${a}x+b。次に点(${x1}, ${y1})を代入して ${y1}=${a}×(${x1})+b を解き、b=${b}を求めます。答えは ${answerStr}。`;
        } else if (difficulty === '標準') {
            const x1 = randInt(-5, 0);
            const y1 = a * x1 + b;
            let x2 = randInt(1, 5);
            const y2 = a * x2 + b;
            text = `2点(${x1}, ${y1}), (${x2}, ${y2})を通る一次関数の式を求めなさい。(例: y=2x+3)`;
            explanation = `まず傾きaを求めます。a = (${y2} - ${y1}) / (${x2} - ${x1}) = ${a}。次にy=${a}x+bにどちらかの点を代入してbを求めます。答えは ${answerStr}。`;
        } else { // 発展
            const x1 = randInt(-5, 0);
            const y1 = a * x1 + b;
            let x2 = randInt(1, 5);
            const y2 = a * x2 + b;
            text = `yはxの一次関数で、x=${x1}のときy=${y1}、x=${x2}のときy=${y2}です。この一次関数の式を求めなさい。(例: y=2x+3)`;
            explanation = `これは2点(${x1}, ${y1}), (${x2}, ${y2})を通る直線の式を求めるのと同じです。傾きa=${a}、切片b=${b}となります。答えは ${answerStr}。`;
        }
        answer = answerStr;
        break;
    }
    case 'm2_expression_expansion_basic': { // 式の展開（基本）
        if (difficulty === '基礎') {
            const a = randInt(2, 5) * (Math.random() < 0.5 ? 1 : -1);
            const b = randInt(1, 5);
            const c = randInt(-5, 5, [0]);
            text = `${a}(${b}x ${c >= 0 ? `+ ${c}` : `- ${-c}`}) を展開しなさい。`;
            const xCoeff = a * b;
            const constTerm = a * c;
            answer = `${xCoeff}x${constTerm >= 0 ? `+${constTerm}` : `${constTerm}`}`;
            explanation = `分配法則を使ってかっこを外します。${a}をかっこの中の各項に掛けます。答えは ${answer}。`;
        } else if (difficulty === '標準') {
            const a = randInt(-7, 7, [0]);
            const b = randInt(-7, 7, [0, -a]);
            text = `(x ${a > 0 ? `+ ${a}` : `- ${-a}`})(x ${b > 0 ? `+ ${b}` : `- ${-b}`}) を展開しなさい。`;
            const xCoeff = a + b;
            const constTerm = a * b;
            let res = 'x^2';
            if (xCoeff !== 0) res += `${xCoeff > 0 ? '+' : ''}${xCoeff === 1 ? '' : xCoeff === -1 ? '-' : xCoeff}x`;
            if (constTerm !== 0) res += `${constTerm > 0 ? '+' : ''}${constTerm}`;
            answer = res;
            explanation = `公式 (x+a)(x+b) = x^2+(a+b)x+ab を使います。答えは ${answer}`.replace(/\+-/g, '-');
        } else { // 発展
            const a = randInt(-3, 3, [0, 1, -1]);
            const b = randInt(-5, 5, [0]);
            const c = randInt(-3, 3, [0, 1, -1]);
            const d = randInt(-5, 5, [0, b]);
            text = `(${a}x ${b > 0 ? `+ ${b}` : `- ${-b}`})(${c}x ${d > 0 ? `+ ${d}` : `- ${-d}`}) を展開しなさい。`;
            const x2Coeff = a * c;
            const xCoeff = a * d + b * c;
            const constTerm = b * d;
            let res = `${x2Coeff === 1 ? '' : x2Coeff === -1 ? '-' : x2Coeff}x^2`;
            if (xCoeff !== 0) res += `${xCoeff > 0 ? '+' : ''}${xCoeff === 1 ? '' : xCoeff === -1 ? '-' : xCoeff}x`;
            if (constTerm !== 0) res += `${constTerm > 0 ? '+' : ''}${constTerm}`;
            answer = res;
            explanation = `1つずつ分配法則で展開します。(${a}x)×(${c}x) + (${a}x)×(${d}) + (${b})×(${c}x) + (${b})×(${d}) を計算し、まとめます。答えは ${answer}。`;
        }
        break;
    }
    case 'm2_expression_expansion_formula': { // 式の展開（公式）
        const a = randInt(2, 9);
        if (difficulty === '基礎') {
            text = `(x + ${a})^2 を展開しなさい。`;
            answer = `x^2+${2 * a}x+${a * a}`;
            explanation = `公式 (a+b)² = a²+2ab+b² を使います。答えは ${answer}。`;
        } else if (difficulty === '標準') {
            if (Math.random() < 0.5) {
                text = `(x - ${a})^2 を展開しなさい。`;
                answer = `x^2-${2 * a}x+${a * a}`;
                explanation = `公式 (a-b)² = a²-2ab+b² を使います。答えは ${answer}。`;
            } else {
                text = `(x + ${a})(x - ${a}) を展開しなさい。`;
                answer = `x^2-${a * a}`;
                explanation = `公式 (a+b)(a-b) = a²-b² を使います。答えは ${answer}。`;
            }
        } else { // 発展
            const coeffX = randInt(2, 4);
            text = `(${coeffX}x + ${a})^2 を展開しなさい。`;
            answer = `${coeffX*coeffX}x^2+${2*coeffX*a}x+${a*a}`;
            explanation = `公式 (a+b)² = a²+2ab+b² を使います。この場合 a=${coeffX}x, b=${a} です。答えは ${answer}。`;
        }
        break;
    }
    case 'm2_angle_problems': { // 多角形の角度
        if (difficulty === '基礎') {
            const angle1 = randInt(30, 80);
            const angle2 = randInt(30, 80);
            const angle3 = 180 - angle1 - angle2;
            text = `三角形の2つの内角が ${angle1}° と ${angle2}° のとき、残りの1つの内角の大きさは何度ですか？`;
            answer = angle3.toString();
            explanation = `三角形の内角の和は180°です。180 - ${angle1} - ${angle2} = ${angle3}°。`;
        } else if (difficulty === '標準') {
            const sides = randInt(5, 8); // 5角形から8角形
            const totalInteriorAngle = (sides - 2) * 180;
            text = `${sides}角形の内角の和を求めなさい。`;
            answer = totalInteriorAngle.toString();
            explanation = `n角形の内角の和は (n-2)×180° で求められます。(${sides} - 2) × 180° = ${totalInteriorAngle}°。`;
        } else { // 発展
            const sides = [5, 6, 8, 9, 10][randInt(0,4)];
            if (Math.random() < 0.5) {
                const oneInteriorAngle = ((sides - 2) * 180) / sides;
                text = `正${sides}角形の1つの内角の大きさを求めなさい。`;
                answer = oneInteriorAngle.toString();
                explanation = `正${sides}角形の内角の和は ${(sides-2)*180}°。これを${sides}で割ると、1つの内角は ${answer}°。`;
            } else {
                const oneExteriorAngle = 360 / sides;
                text = `正${sides}角形の1つの外角の大きさを求めなさい。`;
                answer = oneExteriorAngle.toString();
                explanation = `多角形の外角の和は常に360°です。正${sides}角形なので、360 ÷ ${sides} = ${answer}°。`;
            }
        }
        break;
    }
    case 'm2_proof_fill_in_the_blank': { // 合同の証明（穴埋め）
        const conditions = [
            { id: 1, text: "3組の辺がそれぞれ等しい", sides: 3, angles: 0 },
            { id: 2, text: "2組の辺とその間の角がそれぞれ等しい", sides: 2, angles: 1 },
            { id: 3, text: "1組の辺とその両端の角がそれぞれ等しい", sides: 1, angles: 2 },
        ];
        const chosen = conditions[randInt(0, conditions.length - 1)];

        if (difficulty === '基礎') {
            if (Math.random() < 0.5) {
                text = `合同条件「${chosen.text}」では、等しい必要がある「辺」はいくつですか？`;
                answer = chosen.sides.toString();
            } else {
                text = `合同条件「${chosen.text}」では、等しい必要がある「角」はいくつですか？`;
                answer = chosen.angles.toString();
            }
            explanation = `「${chosen.text}」なので、辺は${chosen.sides}つ、角は${chosen.angles}つ等しい必要があります。`;
        } else if (difficulty === '標準') {
            text = `△ABCと△DEFで、AB=DE, BC=EFのとき、あと1つ「辺」に関する条件を追加して合同にするには、何が等しければよいですか？(例: AC=DF)`;
            answer = `ac=df`;
            explanation = `2組の辺が等しいので、残りの1組の辺(AC=DF)が等しければ「3組の辺がそれぞれ等しい」で合同になります。または、間の角(∠B=∠E)が等しければ「2組の辺とその間の角」で合同になります。`;
        } else { // 発展
             text = `△ABCと△DEFで、AB=DE, ∠B=∠Eのとき、合同条件「1組の辺とその両端の角がそれぞれ等しい」を使うには、あとどの「角」が等しい必要がありますか？(例: A=D)`;
             answer = `a=d`;
             explanation = `辺ABの両端の角は∠Aと∠Bです。辺DEの両端の角は∠Dと∠Eです。∠B=∠Eがわかっているので、残りの∠A=∠Dが等しければ合同が証明できます。`;
        }
        break;
    }
    default:
      return { text: `「${topic.name}」の問題は準備中です。`, answer: '', explanation: '' };
  }
  return { text, answer, explanation, figure };
};
