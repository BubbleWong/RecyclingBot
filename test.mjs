import { classifyItem } from './src/classifier.mjs';
import worker from './src/worker.mjs';
import fs from 'fs/promises';
import path from 'path';

const MOCK_API_KEY = 'test-openrouter-key';

const testCases = [
    { item: 'Empty soda can', expected: 'blue_bin' },
    { item: 'Greasy pizza box', expected: 'green_bin' },
    { item: 'Old newspaper', expected: 'black_bin' },
    { item: 'Broken drinking glass', expected: 'garbage' },
    { item: 'AA Battery', expected: 'others' },
    { item: 'Banana peel', expected: 'green_bin' },
    { item: 'Plastic milk jug', expected: 'blue_bin' },
    { item: 'Grass clippings', expected: 'green_bin' },
    {
        item: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/',
            'Oranges_-_whole-halved-segment.jpg/',
            '1200px-Oranges_-_whole-halved-segment.jpg',
        ].join(''),
        expected: 'green_bin',
    },
];

function parseEnvLine(line) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    const delimiterIndex = trimmed.indexOf('=');

    if (delimiterIndex === -1) {
        return null;
    }

    const key = trimmed.slice(0, delimiterIndex).trim();
    let value = trimmed.slice(delimiterIndex + 1).trim();

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    return [key, value];
}

async function loadLocalSecret() {
    if (process.env.OPENROUTER_API_KEY) {
        return process.env.OPENROUTER_API_KEY;
    }

    try {
        const envFile = await fs.readFile(path.resolve('.dev.vars'), 'utf-8');
        const lines = envFile.split(/\r?\n/);

        for (const line of lines) {
            const parsed = parseEnvLine(line);

            if (parsed?.[0] === 'OPENROUTER_API_KEY') {
                return parsed[1];
            }
        }
    } catch {
        return undefined;
    }

    return undefined;
}

async function addLocalImageTests() {
    try {
        const testsDir = path.resolve('tests');
        const files = await fs.readdir(testsDir);

        for (const file of files) {
            if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
                const filePath = path.join(testsDir, file);
                const buffer = await fs.readFile(filePath);
                const base64 = buffer.toString('base64');
                const mimeType = file.endsWith('.png')
                    ? 'image/png'
                    : 'image/jpeg';
                const dataUri = `data:${mimeType};base64,${base64}`;

                testCases.push({
                    item: dataUri,
                    expected: 'unknown',
                    name: `Local File: ${file}`,
                });
            }
        }
    } catch (error) {
        console.log(
            "No local 'tests' directory found or error reading it:",
            error.message,
        );
    }
}

async function runUnitTests() {
    const assetResponse = await worker.fetch(
        new Request('https://example.com/'),
        {
            ASSETS: {
                fetch: async () => new Response('asset ok'),
            },
        },
    );
    const getResponse = await worker.fetch(
        new Request('https://example.com/api/classify'),
        {},
    );
    const badFormResponse = await worker.fetch(
        new Request('https://example.com/api/classify', {
            method: 'POST',
            body: new FormData(),
        }),
        {},
    );

    if (await assetResponse.text() !== 'asset ok') {
        throw new Error('Static asset fallback failed');
    }

    if (getResponse.status !== 405) {
        throw new Error(`Unexpected GET status: ${getResponse.status}`);
    }

    if (badFormResponse.status !== 400) {
        throw new Error(`Unexpected bad form status: ${badFormResponse.status}`);
    }

    let requestUrl;
    let requestInit;

    const result = await classifyItem('Empty soda can', {
        apiKey: MOCK_API_KEY,
        fetcher: async (url, init) => {
            requestUrl = url;
            requestInit = init;

            return new Response(JSON.stringify({
                choices: [
                    {
                        message: {
                            content: [
                                '```json',
                                '{"type":"blue_bin","reason":"Metal can"}',
                                '```',
                            ].join('\n'),
                        },
                    },
                ],
            }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            });
        },
    });

    const body = JSON.parse(requestInit.body);

    if (!requestUrl.includes('openrouter.ai/api/v1/chat/completions')) {
        throw new Error('Unexpected OpenRouter endpoint');
    }

    if (requestInit.headers.authorization !== `Bearer ${MOCK_API_KEY}`) {
        throw new Error('Authorization header was not set');
    }

    if (body.model !== 'google/gemini-3.1-flash-lite-preview') {
        throw new Error(`Unexpected model mapping: ${body.model}`);
    }

    if (result.type !== 'blue_bin') {
        throw new Error(`Unexpected parsed result: ${result.type}`);
    }

    console.log('Unit Tests Completed: worker and classifier checks passed.');
}

async function runTests() {
    await runUnitTests();

    const apiKey = await loadLocalSecret();

    if (!apiKey) {
        console.log(
            [
                'Skipping live tests:',
                'OPENROUTER_API_KEY is not set in the environment',
                'or .dev.vars.',
            ].join(' '),
        );
        return;
    }

    await addLocalImageTests();
    console.log(`Starting Tests (${testCases.length} cases)...\n`);
    let passed = 0;

    for (const test of testCases) {
        const testName = test.name ||
            `"${test.item.substring(0, 50)}${test.item.length > 50 ? '...' : ''}"`;

        try {
            console.log(`Testing item: ${testName}`);
            const result = await classifyItem(test.item, {
                apiKey,
            });

            console.log('Response:', JSON.stringify(result, null, 2));

            if (test.expected === 'unknown') {
                console.log(`ℹ️  Local Image Result: ${result.type}`);
                passed++;
            } else if (result.type === test.expected) {
                console.log('✅ Classification matches expectation.');
                passed++;
            } else {
                console.log(
                    [
                        `⚠️  Warning: Expected ${test.expected},`,
                        `got ${result.type}.`,
                        `Check reason: ${result.reason}`,
                    ].join(' '),
                );
            }
        } catch (error) {
            console.error(`❌ Error testing ${testName}:`, error.message);
        }
        console.log('-'.repeat(40));
    }

    console.log(`\nTests Completed. Matches/Valid Runs: ${passed}/${testCases.length}`);
}

runTests();
