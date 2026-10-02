import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const url = process.env.UI_CHECK_URL || 'http://127.0.0.1:4173/math/';
const server = process.env.UI_CHECK_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
const artifactDir = 'ui-artifacts';
await mkdir(artifactDir, { recursive: true });
let browser;
let currentPage;
let currentWidth;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const numericAnswer = async page => {
    const expression = (await page.locator('.question-text').innerText()).split('=')[0].trim();
    assert.match(expression, /^[\d+\-\s]+$/);
    const result = spawnSync('python3', ['-c', 'import ast,sys\nn=ast.parse(sys.argv[1],mode="eval").body\nassert isinstance(n,ast.BinOp) and isinstance(n.left,ast.Constant) and isinstance(n.right,ast.Constant)\nassert isinstance(n.op,(ast.Add,ast.Sub))\nprint(n.left.value+n.right.value if isinstance(n.op,ast.Add) else n.left.value-n.right.value)', expression], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
const snapshot = async (page, name, width) => {
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ path: `${artifactDir}/${width}-${name}.png`, fullPage: true, animations: 'disabled' });
    const size = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.documentElement.scrollWidth }));
    assert.ok(size.body <= size.viewport + 1, `${width}px ${name}: horizontal overflow ${JSON.stringify(size)}`);
    console.log(`Verified ${width}px ${name}`);
};
const nav = (page, label) => page.getByRole('navigation').getByRole('button', { name: label, exact: true });

try {
    for (let attempt = 0; attempt < 100; attempt++) {
        try { if ((await fetch(url)).ok) break; } catch {}
        if (attempt === 99) throw new Error('Preview did not start');
        await sleep(100);
    }
    browser = await chromium.launch({ headless: true });
    for (const width of [320, 375, 1200]) {
        currentWidth = width;
        const context = await browser.newContext({ viewport: { width, height: width === 1200 ? 900 : 812 }, locale: 'ja-JP', reducedMotion: 'reduce' });
        const page = await context.newPage(); currentPage = page;
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.dismiss());
        await page.goto(url);
        await expect(page.getByRole('button', { name: 'おすすめの10問を始める' })).toBeVisible();
        await snapshot(page, 'home', width);
        for (const button of await page.getByRole('navigation').getByRole('button').all()) {
            const box = await button.boundingBox(); assert.ok(box.width >= 48 && box.height >= 48);
        }

        // Start directly, edit with the keypad, and verify conventional digit rows.
        await page.getByRole('button', { name: 'おすすめの10問を始める' }).click();
        await expect(page.getByRole('heading', { name: '第1問', exact: true })).toBeVisible();
        await expect(page.getByRole('navigation')).toHaveCount(0);
        const keys = await page.locator('.number-keys button').allTextContents();
        assert.deepEqual(keys, ['7', '8', '9', '⌫', '4', '5', '6', '全消去', '1', '2', '3', '−', '0', '.', '÷']);
        for (const button of await page.locator('.number-keys button').all()) {
            const box = await button.boundingBox(); assert.ok(box.width >= 48 && box.height >= 48);
        }
        for (const row of [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']]) {
            const boxes = await Promise.all(row.map(name => page.locator('.number-keys').getByRole('button', { name, exact: true }).boundingBox()));
            assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1 && Math.abs(boxes[1].y - boxes[2].y) < 1);
            assert.ok(boxes[0].x < boxes[1].x && boxes[1].x < boxes[2].x);
        }
        await page.locator('.number-keys').getByRole('button', { name: '1', exact: true }).click();
        await page.locator('.number-keys').getByRole('button', { name: '2', exact: true }).click();
        await expect(page.getByLabel('解答入力欄')).toHaveValue('12');
        await page.getByRole('button', { name: '1文字消す' }).click();
        await expect(page.getByLabel('解答入力欄')).toHaveValue('1');
        await page.getByRole('button', { name: '答えをすべて消す' }).click();
        await expect(page.getByLabel('解答入力欄')).toHaveValue('');
        await snapshot(page, 'quiz-keypad', width);

        await page.getByRole('button', { name: 'キーボード入力に切り替える' }).click();
        const input = page.getByLabel('解答入力欄');
        await input.fill('999999'); await input.press('Enter');
        await expect(page.getByText('✕ ちがいます。あと2回ためせます。')).toBeVisible();
        await page.waitForTimeout(650);
        await expect(page.getByText('✕ ちがいます。あと2回ためせます。')).toBeVisible();
        await input.fill(await numericAnswer(page)); await input.press('Enter');
        await expect(page.getByRole('heading', { name: '✓ 正解！' })).toBeVisible();
        await expect(page.locator('.answer-keypad')).toHaveCount(0);
        await expect(page.getByRole('button', { name: '次の問題へ' })).toBeFocused();
        await snapshot(page, 'quiz-explanation', width);
        await page.getByRole('button', { name: '次の問題へ' }).press('Enter');
        await expect(page.getByRole('heading', { name: '第2問', exact: true })).toBeVisible();
        await expect(page.getByLabel('解答入力欄')).not.toHaveAttribute('readonly');
        for (let number = 2; number <= 10; number++) {
            await expect(page.getByRole('heading', { name: `第${number}問`, exact: true })).toBeVisible();
            await page.getByLabel('解答入力欄').fill(await numericAnswer(page));
            await page.getByLabel('解答入力欄').press('Enter');
            await page.getByRole('button', { name: number === 10 ? '結果を見る' : '次の問題へ' }).click();
        }
        await expect(page.getByRole('heading', { name: '結果発表' })).toBeVisible();
        const history = await page.evaluate(() => JSON.parse(localStorage.getItem('calculation-training-history')));
        assert.equal(history.length, 1); assert.equal(history[0].results.length, 10);
        assert.ok(history[0].results.every(result => result.isCorrect));
        await snapshot(page, 'result', width);
        await nav(page, '履歴').click(); await snapshot(page, 'history', width);
        await nav(page, '進捗').click(); await snapshot(page, 'progress', width);
        await nav(page, '設定').click(); await snapshot(page, 'settings', width);
        await page.getByLabel('名前', { exact: true }).fill('あ'.repeat(40));
        await page.getByRole('button', { name: '保存する', exact: true }).click();
        await nav(page, '学習').click(); await snapshot(page, 'long-name', width);

        // Combined setup, topic search, and algebra keys.
        await page.getByRole('button', { name: /^中3.*22単元/ }).click();
        await snapshot(page, 'topics', width);
        await page.getByLabel('単元を探す').fill('存在しない単元');
        await expect(page.getByText('該当する単元がありません。')).toBeVisible();
        await page.getByRole('button', { name: '検索をクリア' }).click();
        await page.getByLabel('単元を探す').fill('平方完成');
        await page.getByRole('button', { name: /学習ポイントと練習.*平方完成/ }).click();
        await snapshot(page, 'lesson', width);
        await page.getByRole('button', { name: '練習問題へ進む' }).click();
        await page.getByRole('button', { name: /^標準/ }).click();
        await page.getByRole('button', { name: /^20問/ }).click();
        await snapshot(page, 'setup', width);
        await page.getByRole('button', { name: '20問で始める' }).click();
        await expect(page.getByText('1 / 20', { exact: true })).toBeVisible();
        await expect(page.locator('.symbol-keys').getByRole('button', { name: 'x', exact: true })).toBeVisible();
        await expect(page.locator('.symbol-keys').getByRole('button', { name: '√', exact: true })).toBeVisible();
        await snapshot(page, 'algebra-keypad', width);
        // Cancelling an exit must keep the active question and input.
        await page.locator('.number-keys').getByRole('button', { name: '1', exact: true }).click();
        await page.getByRole('button', { name: '練習を終了', exact: true }).click();
        await expect(page.getByLabel('解答入力欄')).toHaveValue('1');
        await page.reload();
        await expect(page.getByRole('button', { name: /おすすめの10問/ })).toBeVisible();
        await page.getByRole('button', { name: /範囲を選んでテスト/ }).click();
        await expect(page.getByRole('button', { name: '選択した範囲で20問を始める' })).toBeDisabled();
        await page.getByLabel('3桁以上の筆算（足し算・引き算）', { exact: true }).check();
        await expect(page.getByRole('button', { name: '選択した範囲で20問を始める' })).toBeEnabled();
        await snapshot(page, 'test-builder', width);
        await page.getByRole('button', { name: '選択した範囲で20問を始める' }).click();
        await expect(page.getByText('1 / 20', { exact: true })).toBeVisible();
        assert.deepEqual(errors, [], 'Browser runtime errors');
        await context.close();
    }
    console.log('UI checks passed at 320px, 375px and 1200px, including keyboard/keypad, full quiz persistence, topic search and test setup.');
} catch (error) {
    if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: `${artifactDir}/${currentWidth}-failure.png`, fullPage: true }).catch(() => {});
    throw error;
} finally {
    await browser?.close();
    server?.kill('SIGTERM');
}
