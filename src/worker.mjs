import { classifyItem } from './classifier.mjs';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
};

function jsonResponse(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...JSON_HEADERS,
            ...headers,
        },
    });
}

function methodNotAllowed() {
    return jsonResponse(
        {
            error: 'Method Not Allowed',
        },
        405,
        {
            allow: 'POST',
        },
    );
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
}

async function fileToDataUri(file) {
    const mimeType = file.type || 'image/jpeg';
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);

    return `data:${mimeType};base64,${base64}`;
}

async function parseClassifyForm(request) {
    let formData;

    try {
        formData = await request.formData();
    } catch {
        return {
            error: jsonResponse(
                {
                    error: 'Invalid multipart form data',
                },
                400,
            ),
        };
    }

    const image = formData.get('image');

    if (!(image instanceof File)) {
        return {
            error: jsonResponse(
                {
                    error: 'No image file uploaded',
                },
                400,
            ),
        };
    }

    if (image.type && !image.type.startsWith('image/')) {
        return {
            error: jsonResponse(
                {
                    error: 'Uploaded file must be an image',
                },
                400,
            ),
        };
    }

    if (image.size > MAX_UPLOAD_BYTES) {
        return {
            error: jsonResponse(
                {
                    error: 'Image upload is too large',
                    maxBytes: MAX_UPLOAD_BYTES,
                },
                413,
            ),
        };
    }

    const model = formData.get('model');

    return {
        image,
        modelName: typeof model === 'string' ? model : undefined,
    };
}

async function handleClassify(request, env) {
    if (request.method !== 'POST') {
        return methodNotAllowed();
    }

    const parsed = await parseClassifyForm(request);

    if (parsed.error) {
        return parsed.error;
    }

    try {
        const dataUri = await fileToDataUri(parsed.image);
        const result = await classifyItem(dataUri, {
            apiKey: env.OPENROUTER_API_KEY,
            modelName: parsed.modelName,
        });

        return jsonResponse(result);
    } catch (error) {
        console.error('Error processing request:', error);

        return jsonResponse(
            {
                error: 'Internal Server Error',
                details: error.message,
            },
            500,
        );
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api/classify') {
            return handleClassify(request, env);
        }

        if (url.pathname.startsWith('/api/')) {
            return jsonResponse(
                {
                    error: 'Not Found',
                },
                404,
            );
        }

        return env.ASSETS.fetch(request);
    },
};
