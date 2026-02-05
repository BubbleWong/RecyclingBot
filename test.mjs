import { classifyItem } from "./lib/classifyer.mjs";
import fs from "fs/promises";
import path from "path";

const testCases = [
    { item: "Empty soda can", expected: "blue_bin" },
    { item: "Greasy pizza box", expected: "green_bin" },
    { item: "Old newspaper", expected: "black_bin" },
    { item: "Broken drinking glass", expected: "garbage" },
    { item: "AA Battery", expected: "others" }, // HHW
    { item: "Banana peel", expected: "green_bin" },
    { item: "Plastic milk jug", expected: "blue_bin" },
    { item: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/1200px-Oranges_-_whole-halved-segment.jpg", expected: "green_bin" }
];

async function addLocalImageTests() {
    try {
        const testsDir = path.resolve("tests");
        const files = await fs.readdir(testsDir);

        for (const file of files) {
            if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
                const filePath = path.join(testsDir, file);
                const buffer = await fs.readFile(filePath);
                const base64 = buffer.toString("base64");
                const mimeType = file.endsWith(".png") ? "image/png" : "image/jpeg";
                const dataUri = `data:${mimeType};base64,${base64}`;

                testCases.push({
                    item: dataUri,
                    expected: "unknown",
                    name: `Local File: ${file}`
                });
            }
        }
    } catch (error) {
        console.log("No local 'tests' directory found or error reading it:", error.message);
    }
}

async function runTests() {
    await addLocalImageTests();
    console.log(`Starting Tests (${testCases.length} cases)...\n`);
    let passed = 0;

    for (const test of testCases) {
        const testName = test.name || `"${test.item.substring(0, 50)}${test.item.length > 50 ? "..." : ""}"`;
        try {
            console.log(`Testing item: ${testName}`);
            const result = await classifyItem(test.item);
            console.log("Response:", JSON.stringify(result, null, 2));

            if (test.expected === "unknown") {
                console.log(`ℹ️  Local Image Result: ${result.type}`);
                passed++; // Count as passed since we don't have an expectation
            } else if (result.type === test.expected) {
                console.log("✅ Classification matches expectation.");
                passed++;
            } else {
                console.log(`⚠️  Warning: Expected ${test.expected}, got ${result.type}. Check reason: ${result.reason}`);
            }
        } catch (error) {
            console.error(`❌ Error testing ${testName}:`, error.message);
        }
        console.log("-".repeat(40));
    }

    console.log(`\nTests Completed. Matches/Valid Runs: ${passed}/${testCases.length}`);
}

runTests();
