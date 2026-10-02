import type React from 'react';

export type Grade = '小4' | '小5' | '小6' | '中1' | '中2' | '中3';
export type Difficulty = '基礎' | '標準' | '発展';

export type TopicId = 
  'mixed' |
  // 小4
  'g4_addition_subtraction' | 'g4_multiplication' | 'g4_division' | 'g4_fractions_intro' | 'g4_rounding' | 'g4_unit_conversion' | 'g4_rectangle_area' |
  // 小5
  'g5_decimals_multiplication' | 'g5_decimals_division' | 'g5_fractions_simplify' | 'g5_fractions_common_denominator' | 'g5_fractions_addition' | 'g5_fractions_subtraction' | 'g5_percentages' | 'g5_common_multiples' | 'g5_common_divisors' | 'g5_triangle_area' |
  'g5_volume' | 'g5_average' |
  // 小6
  'g6_fractions_addition' | 'g6_fractions_subtraction' | 'g6_fractions_multiplication' | 'g6_fractions_division' | 'g6_speed' | 'g6_time' | 'g6_distance' | 'g6_ratios' | 'g6_per_unit_quantity' | 'g6_circle_area' |
  'g6_symmetry' | 'g6_scale' | 'g6_data' |
  // 中1
  'm1_int_addition' | 'm1_int_subtraction' | 'm1_int_multiplication' | 'm1_int_division' |
  'm1_algebra_simplify' | 'm1_algebra_distributive' |
  'm1_linear_equations_basic' | 'm1_linear_equations_parentheses' |
  'm1_direct_proportion' | 'm1_inverse_proportion' |
  'm1_prime_factorization' | 'm1_solid_volume' |
  'm1_equation_word' | 'm1_probability' | 'm1_data' |
  // 中2
  'm2_simultaneous_equations_elimination' | 'm2_simultaneous_equations_substitution' | 'm2_linear_functions_value' | 'm2_linear_functions_equation' | 'm2_expression_expansion_basic' | 'm2_expression_expansion_formula' | 'm2_angle_problems' | 'm2_proof_fill_in_the_blank' |
  'm2_polynomial' | 'm2_equation_word' | 'm2_probability' | 'm2_data' |
  // 中3
  'm3_factorization_basic' | 'm3_factorization_common_factor' | 'm3_factorization_formula' | 'm3_square_roots_simplify' | 'm3_square_roots_calculation' | 'm3_quadratic_equations_factorization' | 'm3_quadratic_equations_formula' | 'm3_pythagorean_theorem' |
  'm3_expansion' | 'm3_quadratic_function' | 'm3_similarity' | 'm3_circle' | 'm3_sampling' |
  'm3_quadratic_equations_square' | 'm3_quadratic_equation_word' | 'm3_quadratic_function_rate' | 'm3_quadratic_function_range' |
  'm3_similarity_area_volume' | 'm3_similarity_parallel' | 'm3_similarity_conditions' | 'm3_pythagorean_application' | 'm3_sampling_method';

export interface Topic {
  id: TopicId;
  name: string;
}

export interface Question {
  id: number;
  topicId?: TopicId;
  text: string;
  answer: string;
  explanation: string;
  figure?: React.ReactNode;
}

export interface QuestionResult {
  question: Question;
  attempts: number; // 0 for correct on first try, 1 for second, etc.
  isCorrect: boolean; // true if answered correctly
  isSkipped: boolean; // true if skipped after 5 attempts
}

export interface QuizResult {
  studentId?: string;
  grade: Grade;
  topic: Topic;
  difficulty: Difficulty | null;
  results: QuestionResult[];
  startTime: number;
  endTime: number;
}

export interface StudentProfile {
  id: 'grade5' | 'middle2';
  name: string;
  startGrade: '小5' | '中2';
  dailyGoal: number;
  examDate?: string;
  targetScore?: number;
}
