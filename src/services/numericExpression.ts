// A small, bounded parser for numeric answers. Never executes user input.
export const parseNumericExpression = (source: string): number | null => {
    if (!source || source.length > 200 || !/^[0-9.+\-*/^()√]+$/.test(source)) return null;
    let position = 0;
    let depth = 0;
    const primary = (): number => {
        if (++depth > 32) throw new Error('深すぎる式');
        let value: number;
        if (source[position] === '(') {
            position++;
            value = sum();
            if (source[position++] !== ')') throw new Error('かっこ');
        } else if (source[position] === '√') {
            position++;
            value = Math.sqrt(primary());
        } else {
            const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
            if (!match) throw new Error('数');
            position += match[0].length;
            value = Number(match[0]);
        }
        depth--;
        return value;
    };
    const unary = (): number => {
        if (source[position] === '+' || source[position] === '-') {
            const sign = source[position++] === '-' ? -1 : 1;
            return sign * unary();
        }
        let value = primary();
        if (source[position] === '^') {
            position++;
            const exponent = source.slice(position).match(/^\d+/);
            if (!exponent || Number(exponent[0]) > 10) throw new Error('指数');
            position += exponent[0].length;
            value **= Number(exponent[0]);
        }
        return value;
    };
    const product = (): number => {
        let value = unary();
        while (position < source.length) {
            const operator = source[position];
            if (operator === '*' || operator === '/') {
                position++;
                const next = unary();
                if (operator === '/' && next === 0) throw new Error('ゼロ除算');
                value = operator === '*' ? value * next : value / next;
            } else if (operator === '√' || operator === '(') {
                value *= unary();
            } else break;
        }
        return value;
    };
    const sum = (): number => {
        let value = product();
        while (source[position] === '+' || source[position] === '-') {
            const operator = source[position++];
            const next = product();
            value = operator === '+' ? value + next : value - next;
        }
        return value;
    };
    try {
        const value = sum();
        return position === source.length && Number.isFinite(value) ? value : null;
    } catch { return null; }
};
