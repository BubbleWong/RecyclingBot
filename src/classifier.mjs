import {
    FULL_SYSTEM_PROMPT,
    RESPONSE_INSTRUCTIONS,
} from './prompt.mjs';

const DEFAULT_MODEL = 'Gemini 3.1 Flash Lite';
const OPENROUTER_CHAT_COMPLETIONS_URL =
    'https://openrouter.ai/api/v1/chat/completions';

const MODEL_MAPPING = {
    'Gemini 3.1 Flash Lite': 'google/gemini-3.1-flash-lite-preview',
    'GPT 5.4': 'openai/gpt-5.4',
};

function resolveModel(modelName = DEFAULT_MODEL) {
    return MODEL_MAPPING[modelName] || modelName;
}

function buildUserContent(item) {
    const isImage = item.startsWith('http') || item.startsWith('data:image');

    if (isImage) {
        return [
            {
                type: 'text',
                text: `Classify this item.${RESPONSE_INSTRUCTIONS}`,
            },
            {
                type: 'image_url',
                image_url: {
                    url: item,
                },
            },
        ];
    }

    return [
        'Classify this item, focus on the main portion of the photo, ignore',
        `the background and the surrounding objects: ${item}.`,
        RESPONSE_INSTRUCTIONS,
    ].join(' ');
}

async function readErrorBody(response) {
    try {
        return await response.text();
    } catch {
        return '';
    }
}

function parseModelJson(content) {
    const cleanContent = content
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');

    try {
        const parsed = JSON.parse(cleanContent);

        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
        }

        return parsed;
    } catch {
        return {
            type: 'unknown',
            reason: 'Failed to parse JSON',
            raw: content,
        };
    }
}

async function classifyItem(
    item,
    {
        apiKey,
        modelName = DEFAULT_MODEL,
        fetcher = fetch,
    } = {},
) {
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY secret is not configured');
    }

    const response = await fetcher(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            'http-referer': 'https://recycle.bubbleh.com/',
            'x-title': 'RecyclingBot',
        },
        body: JSON.stringify({
            model: resolveModel(modelName),
            messages: [
                {
                    role: 'system',
                    content: FULL_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: buildUserContent(item),
                },
            ],
            response_format: {
                type: 'json_object',
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await readErrorBody(response);

        throw new Error(
            [
                `OpenRouter request failed with ${response.status}`,
                response.statusText,
                errorBody,
            ].filter(Boolean).join(': '),
        );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
        throw new Error('OpenRouter response did not include message content');
    }

    return parseModelJson(content);
}

export {
    classifyItem,
    resolveModel,
};
