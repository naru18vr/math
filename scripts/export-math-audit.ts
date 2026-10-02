import { TOPICS_BY_GRADE, DIFFICULTY_LEVELS } from '../src/constants';
import { generateQuestions } from '../src/services/questionService';
import { writeFileSync } from 'node:fs';
const output: unknown[] = [];
for (const topics of Object.values(TOPICS_BY_GRADE)) {
 for (const topic of topics) for (const level of DIFFICULTY_LEVELS) {

  const questions = generateQuestions(topic, 100, level.id);
  output.push(...questions.map(({figure, ...question}) => ({...question, difficulty: level.id, figureLabels: figure && typeof figure === 'object' && 'props' in figure ? (figure as any).props.children.filter((child: any) => child.type === 'text').map((child: any) => child.props.children) : []})));
 }
}
writeFileSync('.math-audit.json', JSON.stringify(output));
process.exit(0);
