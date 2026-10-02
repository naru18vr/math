import { GRADES, TOPICS_BY_GRADE } from '../constants';
import type { Grade, QuizResult, StudentProfile, Topic, TopicId } from '../types';

export interface TopicProgress {
    attempts: number;
    answered: number;
    correct: number;
    accuracy: number;
    mastery: number;
    lastStudiedAt: number | null;
}

export interface LessonContent {
    overview: string;
    points: string[];
    example: string;
}

const EMPTY_PROGRESS: TopicProgress = {
    attempts: 0,
    answered: 0,
    correct: 0,
    accuracy: 0,
    mastery: 0,
    lastStudiedAt: null,
};

export const getTopicProgress = (history: QuizResult[], topicId: TopicId): TopicProgress => {
    const sessions = history.filter(result =>
        result.topic.id === topicId || result.results.some(item => item.question.topicId === topicId),
    ).slice(0, 5);
    if (sessions.length === 0) return EMPTY_PROGRESS;

    const relevantResults = sessions.flatMap(session => session.topic.id === topicId
        ? session.results
        : session.results.filter(item => item.question.topicId === topicId));
    const answered = relevantResults.length;
    const correct = sessions.reduce(
        (total, session) => total + (session.topic.id === topicId
            ? session.results.filter(result => result.isCorrect).length
            : session.results.filter(result => result.question.topicId === topicId && result.isCorrect).length),
        0,
    );
    const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);
    const difficultyBonus = Math.max(...sessions.map(session =>
        session.difficulty === '発展' ? 15 : session.difficulty === '標準' ? 8 : 0,
    ));
    const practiceBonus = Math.min(15, sessions.length * 3);

    return {
        attempts: sessions.length,
        answered,
        correct,
        accuracy,
        mastery: Math.min(100, Math.round(accuracy * 0.75 + difficultyBonus + practiceBonus)),
        lastStudiedAt: sessions[0].endTime,
    };
};

export const getCourseTopics = (grades: Grade[]): Array<{ grade: Grade; topic: Topic }> =>
    grades.flatMap(grade => TOPICS_BY_GRADE[grade].map(topic => ({ grade, topic })));

export const getProfileCourseGrades = (profile: StudentProfile): Grade[] => {
    const startIndex = GRADES.indexOf(profile.startGrade);
    const reviewStartIndex = Math.max(0, startIndex - 1);
    return GRADES.slice(reviewStartIndex);
};

export const getRecommendedTopic = (history: QuizResult[], grades: Grade[]) => {
    const topics = getCourseTopics(grades);
    return [...topics].sort((first, second) => {
        const firstProgress = getTopicProgress(history, first.topic.id);
        const secondProgress = getTopicProgress(history, second.topic.id);
        if (firstProgress.mastery !== secondProgress.mastery) {
            return firstProgress.mastery - secondProgress.mastery;
        }
        if (firstProgress.lastStudiedAt === null && secondProgress.lastStudiedAt !== null) return -1;
        if (secondProgress.lastStudiedAt === null && firstProgress.lastStudiedAt !== null) return 1;
        return (firstProgress.lastStudiedAt ?? 0) - (secondProgress.lastStudiedAt ?? 0);
    })[0];
};

export const getWeakTopics = (history: QuizResult[], grades: Grade[], limit = 3) =>
    getCourseTopics(grades)
        .map(item => ({ ...item, progress: getTopicProgress(history, item.topic.id) }))
        .filter(item => item.progress.attempts > 0 && item.progress.mastery < 80)
        .sort((first, second) => first.progress.mastery - second.progress.mastery)
        .slice(0, limit);

const lessonRules: Array<{ match: RegExp; content: LessonContent }> = [
    { match: /変化の割合/, content: { overview: '二次関数の変化の割合は区間によって変わります。', points: ['両端のxを式に代入する', 'yの増加量をxの増加量で割る', 'y=ax²ではa×(両端のxの和)で求められる'], example: 'y=2x²でxが1から3なら(18-2)÷(3-1)=8' } },
    { match: /三平方/, content: { overview: '直角三角形の斜辺の2乗は他の2辺の2乗の和です。', points: ['直角の向かい側が斜辺', '他の辺を求めるときは2乗の差を使う', '直方体の対角線は3辺の2乗の和の平方根'], example: '辺2,3,6の直方体の対角線は√(4+9+36)=7' } },
    { match: /四分位数|箱ひげ図/, content: { overview: '並べたデータを四つに区切り、分布の広がりを調べます。', points: ['第2四分位数は中央値', '下半分の中央値が第1四分位数', '上半分の中央値が第3四分位数、四分位範囲はQ3-Q1'], example: '1,2,3,4,5,6,7,8ならQ1=2.5、Q2=4.5、Q3=6.5' } },
    { match: /二次方程式/, content: { overview: '二次方程式は因数分解、平方根、解の公式で解きます。', points: ['まず右辺を0にして整理する', '平方根をとるときは正負の両方の解を考える', '文章題では長さなどの条件に合う解を選ぶ'], example: '(x-1)²=8 → x=1±2√2' } },
    { match: /変域/, content: { overview: '二次関数の区間内での最小値・最大値を調べます。', points: ['xの両端でのyを計算する', '区間がx=0を含むならy=0も比較する', 'aが負のときは最大と最小の向きに注意する'], example: 'y=-2x²、-1≦x≦3なら、-18≦y≦0' } },
    { match: /平行線と線分/, content: { overview: '平行線でできる相似な三角形から線分の比を求めます。', points: ['DE∥BCなら△ADE∽△ABC', 'AD:DB=AE:ECを使える', '辺全体と一部分の長さを区別する'], example: 'AD:DB=2:3、AE=4ならEC=6' } },
    { match: /相似条件/, content: { overview: '対応する辺の比や角から三角形の相似を示します。', points: ['3組の辺の比がすべて等しい', '2組の辺の比とその間の角がそれぞれ等しい', '2組の角がそれぞれ等しい'], example: '∠A=∠D、∠B=∠Eなら△ABC∽△DEF' } },
    { match: /面積比.*体積比/, content: { overview: '相似比から面積比・体積比を求めます。', points: ['面積比は相似比の2乗', '体積比は相似比の3乗', '対応する図形の順序をそろえる'], example: '相似比2:3 → 面積比4:9、体積比8:27' } },
    { match: /標本調査/, content: { overview: '母集団から無作為に選んだ標本で全体の傾向を推定します。', points: ['調べたい全体が母集団', '母集団から偏りなく標本を選ぶ', '推定値は必ず実際の値に一致するとは限らない'], example: '1000個のうち無作為に100個を調べて20個が該当 → 全体で約200個と推定' } },

    { match: /分数/, content: { overview: '分母は1をいくつに分けたか、分子はそのいくつ分かを表します。', points: ['計算前に分母が同じか確認する', '約分できるときは最も簡単な形にする', '割り算では割る数の逆数をかける'], example: '1/2 + 1/3 = 3/6 + 2/6 = 5/6' } },
    { match: /小数/, content: { overview: '小数点の位置と位取りに注意して計算します。', points: ['かけ算は先に整数として計算する', 'わり算は割る数を整数に直す', '答えの大きさを概算して確かめる'], example: '1.2 × 0.3 = 12 × 3 ÷ 100 = 0.36' } },
    { match: /割合|百分率/, content: { overview: '割合は「比べる量が、もとにする量の何倍か」を表します。', points: ['割合＝比べる量÷もとにする量', '比べる量＝もとにする量×割合', '百分率は割合を100倍する'], example: '80人中20人なら、20÷80＝0.25＝25%' } },
    { match: /速さ|時間|距離/, content: { overview: '速さ・時間・距離の関係を同じ単位にそろえて考えます。', points: ['速さ＝距離÷時間', '距離＝速さ×時間', '時間＝距離÷速さ'], example: '時速60kmで2時間進む距離は 60×2＝120km' } },
    { match: /方程式/, content: { overview: '等式の両辺に同じ操作をして、未知数だけを残します。', points: ['かっこを外して同類項を整理する', '文字の項と数の項を分ける', '求めた解を元の式に代入して確認する'], example: '3x+5=17 → 3x=12 → x=4' } },
    { match: /文字式|同類項|展開|因数分解/, content: { overview: '文字を数と同じように扱い、式の構造を見抜いて変形します。', points: ['同じ文字・次数の項だけをまとめる', '分配法則の符号に注意する', '展開と因数分解は逆の操作'], example: '(x+2)(x+3)=x²+5x+6' } },
    { match: /比例|反比例|一次関数/, content: { overview: '数量の変化を式・表・グラフで結び付けます。', points: ['xとyの対応を表で確認する', '変化の割合と切片を区別する', '求めた式に点の座標を代入して確認する'], example: '傾き2、切片3なら y=2x+3' } },
    { match: /二次関数/, content: { overview: 'y=ax²の式・表・グラフを結び付け、xの2乗に比例する変化を調べます。', points: ['xを代入するときは符号を含めて2乗する', 'aの符号でグラフの開く向きが決まる', '変化の割合は区間の両端の値から求める'], example: 'y=2x²でx=-3なら y=2×(-3)²=18' } },
    { match: /平方根/, content: { overview: '2乗するとその数になる値を平方根として扱います。', points: ['√a²では符号と範囲に注意する', '根号内の平方数を外に出す', '加減は同じ根号の項だけまとめる'], example: '√12=√(4×3)=2√3' } },
    { match: /筆算/, content: { overview: '位を縦にそろえ、くり上がり・くり下がりを一つずつ処理します。', points: ['一の位、十の位、百の位をそろえる', 'くり上がりやくり下がりを小さく書く', '答えを概算して大きさを確かめる'], example: '4,638+2,795 は位をそろえて 7,433' } },
    { match: /かけ算|わり算/, content: { overview: '計算の意味を確かめ、位取りとあまりに注意して求めます。', points: ['かける数・割る数の位を確認する', '途中の計算を省略しすぎない', '逆の計算で答えを確かめる'], example: '84÷7=12、確かめは 12×7=84' } },
    { match: /がい算|概数/, content: { overview: '目的の位の一つ下を見て、四捨五入して概数にします。', points: ['どの位までの概数か確認する', 'その一つ下の位が0〜4なら切り捨てる', '5〜9なら切り上げる'], example: '3,746を百の位までの概数にすると3,700' } },
    { match: /単位換算/, content: { overview: '単位どうしの関係を使い、同じ大きさを別の単位で表します。', points: ['1m=100cmなど基準を確認する', '大きい単位から小さい単位へは掛ける', '小さい単位から大きい単位へは割る'], example: '2m35cm=235cm' } },
    { match: /公倍数|公約数/, content: { overview: '倍数や約数を書き出し、共通する数を見つけます。', points: ['最小公倍数は共通する倍数のうち最小', '最大公約数は共通する約数のうち最大', '素因数分解でも求められる'], example: '12と18の最小公倍数は36、最大公約数は6' } },
    { match: /平均/, content: { overview: '全体を同じ大きさにならしたときの一つ分を求めます。', points: ['すべての値を合計する', '合計を個数で割る', '平均×個数で合計を確かめる'], example: '6, 8, 10 の平均は (6+8+10)÷3=8' } },
    { match: /比の計算/, content: { overview: '2つの数量の関係を同じ割合のまま簡単な整数で表します。', points: ['比の両方を同じ数で割る', '小数や分数は整数に直してから簡単にする', '比の順序を入れ替えない'], example: '12:18 は両方を6で割って 2:3' } },
    { match: /単位量/, content: { overview: '1人分、1m²分など「1あたり」の量にそろえて比べます。', points: ['何を1にそろえるか確認する', '全体の量を個数や面積で割る', '単位を答えに付ける'], example: '600円で4個なら、1個あたり600÷4=150円' } },
    { match: /対称/, content: { overview: '折り重なる線対称と、点のまわりに180度回す点対称を見分けます。', points: ['対応する点を確認する', '対称の軸からの距離は等しい', '正多角形の対称の軸も図で確かめる'], example: '正方形の対称の軸は4本' } },
    { match: /拡大図|縮図|相似/, content: { overview: '対応する角を等しくし、対応する長さを同じ比で拡大・縮小します。', points: ['対応する頂点の順序をそろえる', '長さには拡大率・縮小率を掛ける', '面積比は長さの比の2乗になる'], example: '長さの比が1:3なら、2cmに対応する長さは6cm' } },
    { match: /確率/, content: { overview: '起こり方が同様に確からしいとき、条件に合う場合の割合を求めます。', points: ['起こり得る場合を重複なく数える', '条件に合う場合の数を数える', '条件に合う場合÷全場合で求める'], example: 'さいころで偶数が出る確率は3/6=1/2' } },
    { match: /データ|資料|四分位|箱ひげ|標本/, content: { overview: 'データを並べたり代表値を求めたりして、全体の傾向を読み取ります。', points: ['まず小さい順に並べる', '平均・中央値・範囲を目的に応じて使う', '標本調査では標本の割合から全体を推定する'], example: '2, 4, 7, 9, 10 の中央値は7' } },
    { match: /素因数/, content: { overview: '自然数を素数だけの積になるまで分解します。', points: ['小さい素数2,3,5…から割る', '商が1になるまで続ける', '同じ素数は指数を使ってまとめる'], example: '60=2²×3×5' } },
    { match: /多項式/, content: { overview: '同じ文字と次数をもつ同類項だけをまとめて計算します。', points: ['かっこの前の符号に注意する', 'xの項と数の項を分ける', '異なる次数の項はまとめない'], example: '(3x+2)+(2x-5)=5x-3' } },
    { match: /円周角/, content: { overview: '同じ弧に対する円周角と中心角の関係を使います。', points: ['どの弧に対する角か確認する', '円周角は同じ弧の中心角の半分', '同じ弧に対する円周角は等しい'], example: '中心角80°に対する円周角は40°' } },
    { match: /角|合同|証明|三平方|面積|体積|図形/, content: { overview: '図に分かっている条件を書き込み、使える性質や公式を選びます。', points: ['求めるものと既知の条件を整理する', '対応する辺・角の順序をそろえる', '最後に単位を確認する'], example: '直角三角形では a²+b²=c²' } },
    { match: /正負/, content: { overview: '数直線上の向きと距離を意識して正負の数を計算します。', points: ['加法は符号と絶対値を分けて考える', '減法は反対の数を足す形に直す', '乗除は負の数の個数で符号を決める'], example: '(-3)-(+5)=(-3)+(-5)=-8' } },
];

export const getLessonContent = (topic: Topic): LessonContent =>
    lessonRules.find(rule => rule.match.test(topic.name))?.content ?? {
        overview: `${topic.name}の基本的な考え方と解き方を身につけます。`,
        points: ['問題文から必要な数や条件を取り出す', '途中式を書いて順序よく計算する', '答えを問題の条件に戻して確かめる'],
        example: '例題で手順を確認してから、基礎問題に挑戦しましょう。',
    };

export const hasSpecificLessonContent = (topic: Topic): boolean => lessonRules.some(rule => rule.match.test(topic.name));
