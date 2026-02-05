import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";

const MODEL_MAPPING = {
    // Mapping futuristic requested models to currently available ones for testing
    "Gemini 2.5 Flash": "google/gemini-2.5-flash",
    "GPT 5.2": "openai/gpt-5.2"
};

const classifyItem = async (item, modelName = "Gemini 2.5 Flash") => {
    // 1. Load config
    const configPath = path.resolve("config.json");
    let config;
    try {
        const configFile = await fs.readFile(configPath, "utf-8");
        config = JSON.parse(configFile);
    } catch (error) {
        throw new Error(`Failed to load config.json: ${error.message}. Please ensure it exists with OPENROUTER_API_KEY.`);
    }

    const apiKey = config.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not found in config.json");
    }

    // 2. Setup OpenAI client for OpenRouter
    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
    });

    // 3. Load System Prompt and Guidelines
    const wikiDir = path.resolve("wiki");
    let systemPromptText;
    let guidelineText;

    try {
        systemPromptText = await fs.readFile(path.join(wikiDir, "system_prompt.md"), "utf-8");
        guidelineText = await fs.readFile(path.join(wikiDir, "guideline.md"), "utf-8");
    } catch (error) {
        throw new Error(`Failed to read wiki files: ${error.message}`);
    }

    const fullSystemPrompt = `${systemPromptText}\n\n${guidelineText}`;

    // 4. Determine Model ID
    const modelId = MODEL_MAPPING[modelName] || modelName;

    // 5. Call OpenRouter
    const response = await openai.chat.completions.create({
        model: modelId,
        messages: [
            {
                role: "system",
                content: fullSystemPrompt
            },
            {
                role: "user",
                content: `Classify this item: ${item}.
Return the result in JSON format with the following keys:
- type: One of 'green_bin', 'black_bin', 'blue_bin', 'garbage', 'others'
- reason: A short explanation of why it belongs to this category.
Ensure the 'type' is strictly one of the allowed values and in lowercase.`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;

    // Clean output (remove markdown code blocks if present)
    const cleanContent = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    try {
        const parsed = JSON.parse(cleanContent);
        // Handle case where model returns an array [ { ... } ]
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
        }
        return parsed;
    } catch (e) {
        return { type: "unknown", reason: "Failed to parse JSON", raw: content };
    }
}

export {
    classifyItem,
}