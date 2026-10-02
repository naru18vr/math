import type { Difficulty, Question, Topic } from '../types';
import { gcd, randInt } from './utils';

const rangeFor = (difficulty: Difficulty) => difficulty === '基礎' ? 6 : difficulty === '標準' ? 10 : 15;
const fraction = (numerator: number, denominator: number) => {
    const divisor = gcd(numerator, denominator);
    return `${numerator / divisor}/${denominator / divisor}`;
};

export const SUPPLEMENTAL_TOPIC_IDS = new Set([
    'g5_volume', 'g5_average', 'g6_symmetry', 'g6_scale', 'g6_data',
    'm1_equation_word', 'm1_probability', 'm1_data',
    'm2_polynomial', 'm2_equation_word', 'm2_probability', 'm2_data',
    'm3_expansion', 'm3_quadratic_function', 'm3_similarity', 'm3_circle', 'm3_sampling',
]);

export const generateSupplementalQuestion = (topic: Topic, difficulty: Difficulty): Omit<Question, 'id'> => {
    const max = rangeFor(difficulty);

    switch (topic.id) {
        case 'g5_volume': {
            const width = randInt(2, max);
            const depth = randInt(2, max);
            const height = randInt(2, max);
            const value = width * depth * height;
            return { text: `たて${width}cm、横${depth}cm、高さ${height}cmの直方体の体積を求めなさい。`, answer: value.toString(), explanation: `直方体の体積＝たて×横×高さなので、${width}×${depth}×${height}＝${value}cm³です。` };
        }
        case 'g5_average':
        case 'g6_data':
        case 'm1_data': {
            const average = randInt(3, max);
            const d1 = randInt(1, Math.max(2, max - 2));
            const d2 = randInt(1, Math.max(2, max - 2));
            const values = [average - d1, average + d1, average - d2, average + d2].map(value => Math.max(0, value));
            const adjustedAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
            return { text: `${values.join('、')} の平均を求めなさい。`, answer: adjustedAverage.toString(), explanation: `合計を個数で割ります。(${values.join('+')})÷${values.length}＝${adjustedAverage}です。` };
        }
        case 'g6_symmetry': {
            const sides = [3, 4, 5, 6, 8][randInt(0, 4)];
            return { text: `正${sides}角形の対称の軸は何本ありますか。`, answer: sides.toString(), explanation: `正多角形の対称の軸の本数は辺の数と同じなので、${sides}本です。` };
        }
        case 'g6_scale':
        case 'm3_similarity': {
            const ratio = randInt(2, Math.min(5, max));
            const original = randInt(2, max);
            const enlarged = original * ratio;
            return { text: `対応する長さの比が 1:${ratio} のとき、短い方が${original}cmなら長い方は何cmですか。`, answer: enlarged.toString(), explanation: `対応する長さは${ratio}倍なので、${original}×${ratio}＝${enlarged}cmです。` };
        }
        case 'm1_equation_word': {
            const x = randInt(2, max);
            const price = randInt(2, 8) * 10;
            const extra = randInt(1, max) * 10;
            const total = price * x + extra;
            return { text: `1個${price}円の商品をx個と、${extra}円の商品を買うと合計${total}円でした。xを求めなさい。`, answer: `x=${x}`, explanation: `${price}x+${extra}=${total}より、${price}x=${total - extra}、x=${x}です。` };
        }
        case 'm1_probability':
        case 'm2_probability': {
            const total = difficulty === '基礎' ? 6 : difficulty === '標準' ? 8 : 12;
            const favorable = randInt(1, total - 1);
            return { text: `同様に確からしい${total}個の結果のうち、条件に合うものが${favorable}個あります。確率を分数で求めなさい。`, answer: fraction(favorable, total), explanation: `確率＝条件に合う場合の数÷全体の場合の数なので、${favorable}/${total}＝${fraction(favorable, total)}です。` };
        }
        case 'm2_polynomial': {
            const a = randInt(1, max);
            const b = randInt(-max, max, [0]);
            const c = randInt(1, max);
            const d = randInt(-max, max, [0]);
            const xCoeff = a + c;
            const constant = b + d;
            const format = (coefficient: number, variable = '') => `${coefficient >= 0 ? '+' : '-'}${Math.abs(coefficient)}${variable}`;
            const answer = `${xCoeff}x${format(constant)}`.replace(/\+-/, '-');
            return { text: `(${a}x${format(b)})+(${c}x${format(d)}) を計算しなさい。`, answer, explanation: `xの項と数の項をそれぞれまとめると、(${a}+${c})x+(${b}+${d})＝${answer}です。` };
        }
        case 'm2_equation_word': {
            const adults = randInt(2, max);
            const children = randInt(2, max);
            const people = adults + children;
            const total = adults * 800 + children * 500;
            return { text: `大人800円、子ども500円で合計${people}人、料金は${total}円でした。大人x人、子どもy人として答えなさい。(例: x=2,y=3)`, answer: `x=${adults},y=${children}`, explanation: `x+y=${people}、800x+500y=${total}を連立して解くと、x=${adults}, y=${children}です。` };
        }
        case 'm2_data': {
            const base = randInt(2, max);
            const values = Array.from({ length: 8 }, (_, index) => base + index * 2);
            const q1 = (values[1] + values[2]) / 2;
            const q2 = (values[3] + values[4]) / 2;
            const q3 = (values[5] + values[6]) / 2;
            const target = difficulty === '基礎' ? '第1四分位数' : difficulty === '標準' ? '第3四分位数' : '四分位範囲';
            const answer = difficulty === '基礎' ? q1 : difficulty === '標準' ? q3 : q3 - q1;
            return { text: `データ ${values.join('、')} の${target}を求めなさい。`, answer: String(answer), explanation: `下半分の中央値Q1=${q1}、全体の中央値Q2=${q2}、上半分の中央値Q3=${q3}。四分位範囲はQ3-Q1=${q3 - q1}です。したがって${target}は${answer}です。` };
        }
        case 'm3_expansion': {
            const a = randInt(1, max);
            const b = randInt(1, max);
            return { text: `(x+${a})(x+${b}) を展開しなさい。`, answer: `x^2+${a + b}x+${a * b}`, explanation: `分配法則より x²+(${a}+${b})x+${a}×${b}＝x²+${a + b}x+${a * b}です。` };
        }
        case 'm3_quadratic_function': {
            const a = difficulty === '基礎' ? randInt(1, 4) : randInt(-4, 4, [0]);
            const x = randInt(-max, max, [0]);
            const y = a * x * x;
            return { text: `y=${a}x^2 で、x=${x}のときのyを求めなさい。`, answer: y.toString(), explanation: `x=${x}を代入して、y=${a}×(${x})²＝${y}です。` };
        }
        case 'm3_circle': {
            const central = randInt(2, 8) * 20;
            return { text: `同じ弧に対する中心角が${central}度のとき、円周角は何度ですか。`, answer: (central / 2).toString(), explanation: `円周角は同じ弧に対する中心角の半分なので、${central}÷2＝${central / 2}度です。` };
        }
        case 'm3_sampling': {
            const sample = difficulty === '基礎' ? 50 : 100;
            const hits = randInt(5, sample / 2);
            const population = difficulty === '発展' ? 3000 : 1000;
            const estimate = population * hits / sample;
            return { text: `${population}個から無作為に${sample}個を調べると${hits}個が条件に合いました。全体では約何個と推定できますか。`, answer: estimate.toString(), explanation: `標本の割合 ${hits}/${sample} を全体にかけて、${population}×${hits}/${sample}＝${estimate}個です。` };
        }
        default:
            return { text: `「${topic.name}」の問題は準備中です。`, answer: '', explanation: '' };
    }
};
