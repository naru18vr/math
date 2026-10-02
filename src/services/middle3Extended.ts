import type { Difficulty, Question, Topic } from '../types';
import { gcd, randInt } from './utils';

export const M3_EXTENDED_TOPIC_IDS = new Set([
    'm3_quadratic_equations_square', 'm3_quadratic_equation_word',
    'm3_quadratic_function_rate', 'm3_quadratic_function_range',
    'm3_similarity_area_volume', 'm3_similarity_parallel',
    'm3_similarity_conditions', 'm3_pythagorean_application', 'm3_sampling_method',
]);

export const generateM3ExtendedQuestion = (topic: Topic, difficulty: Difficulty): Omit<Question, 'id'> => {
    const max = difficulty === '基礎' ? 5 : difficulty === '標準' ? 9 : 12;
    switch (topic.id) {
        case 'm3_quadratic_equations_square': {
            const shift = difficulty === '基礎' ? 0 : randInt(1, max);
            const n = difficulty === '基礎' ? randInt(2, max) ** 2 : [2, 3, 5, 6, 7][randInt(0, 4)];
            const term = shift ? `(x-${shift})^2` : 'x^2';
            const root = Number.isInteger(Math.sqrt(n)) ? String(Math.sqrt(n)) : `√${n}`;
            const answer = shift ? `x=${shift}-${root},${shift}+${root}` : `x=-${root},${root}`;
            const text = difficulty === '発展'
                ? `x^2-${2 * shift}x+${shift * shift - n}=0 を平方完成して解きなさい。解はコンマで区切って答えなさい。`
                : `${term}=${n} を解きなさい。解はコンマで区切って答えなさい。`;
            return { text, answer, explanation: `${term}=${n}なので、${shift ? `x-${shift}` : 'x'}は${root}または-${root}です。答えは ${answer}。` };
        }
        case 'm3_quadratic_equation_word': {
            const short = randInt(2, max);
            const difference = randInt(1, max);
            const area = short * (short + difference);
            return { text: `長方形の長い辺は短い辺より${difference}cm長く、面積は${area}cm²です。短い辺の長さを求めなさい。`, answer: String(short), explanation: `短い辺をx cmとすると x(x+${difference})=${area}。整理して (x-${short})(x+${short + difference})=0。長さは正なので、x=${short}cmです。` };
        }
        case 'm3_quadratic_function_rate': {
            const a = randInt(-4, 4, [0]);
            const left = randInt(-max, max - 1);
            const right = randInt(left + 1, max);
            const rate = a * (left + right);
            return { text: `y=${a}x^2 で、xが${left}から${right}まで増加するときの変化の割合を求めなさい。`, answer: String(rate), explanation: `変化の割合は(yの増加量)÷(xの増加量)。(${a * right ** 2}-(${a * left ** 2}))÷(${right}-(${left}))=${rate}です。y=ax²では a×(区間の両端の和)でも求められます。` };
        }
        case 'm3_quadratic_function_range': {
            const a = randInt(-3, 3, [0]);
            const left = difficulty === '基礎' ? randInt(1, max) : -randInt(1, max);
            const right = randInt(Math.max(1, left + 1), max + 2);
            const values = [a * left ** 2, a * right ** 2, ...(left <= 0 && right >= 0 ? [0] : [])];
            const low = Math.min(...values), high = Math.max(...values);
            return { text: `y=${a}x^2 で、${left}≦x≦${right}のときのyの最小値と最大値を、この順にコンマで区切って答えなさい。`, answer: `${low},${high}`, explanation: `両端でのyは${values[0]}と${values[1]}です。${values.length === 3 ? '区間にx=0を含むので、頂点のy=0も比べます。' : 'この区間ではx=0を含みません。'}最小値は${low}、最大値は${high}です。` };
        }
        case 'm3_similarity_area_volume': {
            const small = randInt(1, 4), large = randInt(small + 1, 7);
            const power = difficulty === '基礎' ? 2 : difficulty === '発展' ? 3 : randInt(2, 3);
            const divisor = gcd(small ** power, large ** power);
            const answer = `${small ** power / divisor}:${large ** power / divisor}`;
            return { text: `相似な${power === 2 ? '図形' : '立体'}の相似比が${small}:${large}です。${power === 2 ? '面積比' : '体積比'}を最も簡単な整数の比で答えなさい。`, answer, explanation: `${power === 2 ? '面積比は相似比の2乗' : '体積比は相似比の3乗'}なので、${small}^${power}:${large}^${power}=${answer}です。` };
        }
        case 'm3_similarity_parallel': {
            const ad = randInt(2, max), db = randInt(1, max), scale = randInt(2, 4);
            const ae = ad * scale, ec = db * scale;
            return { text: `三角形ABCで、Dは辺AB上、Eは辺AC上にあり、DE∥BCです。AD=${ad}cm、DB=${db}cm、AE=${ae}cmのとき、ECの長さを求めなさい。`, answer: String(ec), explanation: `平行線と線分の比より AD:DB=AE:EC。${ad}:${db}=${ae}:EC なので、EC=${ae}×${db}÷${ad}=${ec}cmです。` };
        }
        case 'm3_similarity_conditions': {
            const condition = difficulty === '基礎' ? 3 : difficulty === '標準' ? 1 : 2;
            const evidence = condition === 1 ? '対応する3組の辺の比がすべて等しい'
                : condition === 2 ? '対応する2組の辺の比が等しく、その間の角が等しい'
                : '対応する2組の角がそれぞれ等しい';
            return { text: `2つの三角形で「${evidence}」ことが分かりました。証明で使う相似条件を番号で答えなさい。1:3組の辺の比が等しい、2:2組の辺の比とその間の角が等しい、3:2組の角がそれぞれ等しい。`, answer: String(condition), explanation: `与えられた条件は「${evidence}」なので、相似条件${condition}を使って相似を示せます。対応する頂点の順序もそろえましょう。` };
        }
        case 'm3_pythagorean_application': {
            if (difficulty === '発展') {
                const scale = randInt(1, 3);
                const a = 2 * scale, b = 3 * scale, c = 6 * scale;
                return { text: `辺の長さが${a}cm、${b}cm、${c}cmの直方体で、向かい合う頂点を結ぶ対角線の長さを求めなさい。`, answer: String(7 * scale), explanation: `三平方の定理を2回使うと、対角線の2乗は${a}²+${b}²+${c}²=${49 * scale ** 2}。したがって${7 * scale}cmです。` };
            }
            const scale = randInt(1, max), height = 3 * scale, base = 4 * scale;
            return { text: `壁から${base}m離れた地面の点から、壁の高さ${height}mの点まで、まっすぐはしごをかけます。壁と地面は直角です。はしごの長さを求めなさい。`, answer: String(5 * scale), explanation: `はしごは直角三角形の斜辺なので、長さは√(${base}²+${height}²)=√${25 * scale ** 2}=${5 * scale}mです。` };
        }
        case 'm3_sampling_method': {
            const options = difficulty === '基礎'
                ? ['学校の全生徒からくじで100人選ぶ', '数学部員だけを選ぶ', '朝早く来た人だけを選ぶ']
                : difficulty === '標準'
                ? ['製品全体から乱数で番号を選んで調べる', '箱の一番上だけを調べる', '大きい製品だけを調べる']
                : ['名簿の全員に番号を付けて乱数で選ぶ', '回答を希望した人だけに聞く', '特定の地区だけで聞く'];
            const offset = randInt(0, 2);
            const rotated = options.slice(offset).concat(options.slice(0, offset));
            return { text: `母集団全体を推定するため、標本の選び方として最も適切なものを番号で答えなさい。${rotated.map((option, index) => `${index + 1}:${option}`).join('、')}。`, answer: String(rotated.indexOf(options[0]) + 1), explanation: '母集団のどの対象も選ばれる機会を持つよう、無作為に選びます。特定の集団や希望者だけに限定すると偏りが生じるおそれがあります。' };
        }
        default: throw new Error(`未登録の中3単元: ${topic.id}`);
    }
};
