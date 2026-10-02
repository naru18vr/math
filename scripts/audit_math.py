"""Independently verify generated math using Python, not the answer checker."""
import ast
import json
import math
import re
from pathlib import Path


def calculate(expression, **variables):
    expression = expression.replace('×', '*').replace('÷', '/').replace('^', '**').replace(' ', '')
    expression = re.sub(r'√(\d+)', r'sqrt(\1)', expression)
    expression = re.sub(r'(\d|\))(?=[xyab(]|sqrt)', r'\1*', expression)
    expression = re.sub(r'([xyab])(?=[xyab(])', r'\1*', expression)
    def visit(node):
        if isinstance(node, ast.Expression): return visit(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)): return node.value
        if isinstance(node, ast.Name): return variables[node.id]
        if isinstance(node, ast.UnaryOp):
            return -visit(node.operand) if isinstance(node.op, ast.USub) else visit(node.operand)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'sqrt':
            return math.sqrt(visit(node.args[0]))
        if isinstance(node, ast.BinOp):
            a, b = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return a + b
            if isinstance(node.op, ast.Sub): return a - b
            if isinstance(node.op, ast.Mult): return a * b
            if isinstance(node.op, ast.Div): return a / b
            if isinstance(node.op, ast.Pow): return a ** b
        raise ValueError(expression)
    return visit(ast.parse(expression, mode='eval'))


def equal(a, b):
    assert math.isclose(a, b, abs_tol=1e-8, rel_tol=1e-10), (a, b)


def check(q):
    tid, text, answer = q['topicId'], q['text'], q['answer']
    assert text and answer and q['explanation']
    assert not re.search(r'NaN|Infinity|undefined|準備中', text + answer + q['explanation'])
    if tid in {'m1_int_addition', 'm1_int_subtraction', 'm1_int_multiplication', 'm1_int_division', 'm3_square_roots_calculation'}:
        equal(calculate(text.split('=')[0]), calculate(answer))
    elif tid in {'m1_algebra_simplify', 'm1_algebra_distributive', 'm2_polynomial', 'm2_expression_expansion_basic', 'm2_expression_expansion_formula', 'm3_expansion', 'm3_factorization_basic', 'm3_factorization_common_factor', 'm3_factorization_formula'}:
        expression = re.split(r' を| =', text)[0]
        for x, y, a, b in [(0, 1, 2, 3), (1, 2, -3, 4), (-2, 3, 4, -5), (3, -4, 5, 6), (5, 6, 7, 8)]:
            equal(calculate(expression, x=x, y=y, a=a, b=b), calculate(answer, x=x, y=y, a=a, b=b))
    elif tid in {'m1_linear_equations_basic', 'm1_linear_equations_parentheses', 'm3_quadratic_equations_factorization', 'm3_quadratic_equations_formula', 'm3_quadratic_equations_square'}:
        expression = re.split(r' を', text.removeprefix('二次方程式 '))[0]
        left, right = expression.split('=')
        roots = {round(calculate(value), 12) for value in answer.removeprefix('x=').split(',')}
        for x in roots: equal(calculate(left, x=x), calculate(right, x=x))
        def f(x): return calculate(left, x=x) - calculate(right, x=x)
        c = f(0); b = (f(1) - f(-1)) / 2; a = (f(1) + f(-1)) / 2 - c
        assert len(roots) == (1 if abs(a) < 1e-8 or abs(b*b-4*a*c) < 1e-8 else 2)
    elif tid in {'m2_simultaneous_equations_elimination', 'm2_simultaneous_equations_substitution'}:
        equations = text.split(': ', 1)[1].split(' (例:')[0].split(',')
        values = {name: calculate(value) for name, value in (part.split('=') for part in answer.split(','))}
        rows = []
        for equation in equations:
            left, right = equation.split('=')
            equal(calculate(left, **values), calculate(right, **values))
            def f(x, y): return calculate(left, x=x, y=y) - calculate(right, x=x, y=y)
            c = f(0, 0); rows.append((f(1, 0)-c, f(0, 1)-c))
        assert rows[0][0]*rows[1][1] - rows[0][1]*rows[1][0] != 0, '解が一意でない連立方程式'
    elif tid == 'm3_square_roots_simplify':
        equal(calculate(text.split(' を')[0].split(' の')[0]), calculate(answer))
    elif tid == 'm3_pythagorean_theorem':
        labels = q['figureLabels']
        values = [calculate(answer if label == 'x' else label) for label in labels]
        assert len(values) == 3
        equal(values[0]**2 + values[1]**2, values[2]**2)
    elif tid == 'm3_quadratic_function_rate':
        a = int(re.search(r'y=(-?\d+)x', text)[1]); left, right = map(int, re.search(r'xが(-?\d+)から(-?\d+)', text).groups())
        equal(calculate(answer), (a*right**2-a*left**2)/(right-left))
    elif tid == 'm3_quadratic_function_range':
        a = int(re.search(r'y=(-?\d+)x', text)[1]); left, right = map(int, re.search(r'(-?\d+)≦x≦(-?\d+)', text).groups())
        values = [a*left**2, a*right**2] + ([0] if left <= 0 <= right else [])
        assert list(map(int, answer.split(','))) == [min(values), max(values)]
    elif tid == 'm3_quadratic_equation_word':
        difference, area = map(int, re.search(r'より(\d+)cm長く、面積は(\d+)cm', text).groups()); x = calculate(answer)
        assert x > 0; equal(x*(x+difference), area)
    elif tid == 'm3_similarity_area_volume':
        a, b = map(int, re.search(r'相似比が(\d+):(\d+)', text).groups()); u, v = map(int, answer.split(':'))
        p = 3 if '体積比' in text else 2
        assert u*b**p == v*a**p and math.gcd(u, v) == 1
    elif tid == 'm3_similarity_parallel':
        ad, db, ae = map(int, re.search(r'AD=(\d+)cm、DB=(\d+)cm、AE=(\d+)cm', text).groups()); equal(calculate(answer), db*ae/ad)
    elif tid == 'm3_pythagorean_application':
        values = list(map(int, re.findall(r'(\d+)(?:cm|m)', text))); equal(calculate(answer)**2, sum(value**2 for value in values))
    elif tid == 'm3_sampling':
        population, sample, hits = map(int, re.search(r'(\d+)個から無作為に(\d+)個を調べると(\d+)個', text).groups()); equal(calculate(answer), population*hits/sample)
    elif tid == 'm2_data':
        values = list(map(int, re.search(r'データ (.+) の', text)[1].split('、')))
        def median(v): return (v[(len(v)-1)//2] + v[len(v)//2])/2
        half = len(values)//2; q1 = median(values[:half]); q3 = median(values[-half:])
        expected = q1 if '第1' in text else q3 if '第3' in text else q3-q1
        equal(calculate(answer), expected)
    else: return False
    return True


path = Path('.math-audit.json')
try:
    questions = json.loads(path.read_text())
    verified = 0
    for question in questions:
        try: verified += check(question)
        except Exception as error: raise AssertionError(question) from error
    print(f'Generated {len(questions)} questions; independently verified {verified} mathematical answers.')
finally:
    path.unlink(missing_ok=True)
