import { classifyItem } from "./lib/classifyer.mjs";

const testCases = [
    { item: "Empty soda can", expected: "blue_bin" },
    { item: "Greasy pizza box", expected: "green_bin" },
    { item: "Old newspaper", expected: "black_bin" },
    { item: "Broken drinking glass", expected: "garbage" },
    { item: "AA Battery", expected: "others" }, // HHW
    { item: "Banana peel", expected: "green_bin" },
    { item: "Plastic milk jug", expected: "blue_bin" }
];

async function runTests() {
    console.log("Starting Tests...\n");
    let passed = 0;

    for (const test of testCases) {
        try {
            console.log(`Testing item: "${test.item}"`);
            const result = await classifyItem(test.item);
            console.log("Response:", JSON.stringify(result, null, 2));

            if (result.type === test.expected) {
                console.log("✅ Classification matches expectation.");
                passed++;
            } else {
                console.log(`⚠️  Warning: Expected ${test.expected}, got ${result.type}. Check reason: ${result.reason}`);
            }
        } catch (error) {
            console.error(`❌ Error testing "${test.item}":`, error.message);
        }
        console.log("-".repeat(40));
    }

    console.log(`\nTests Completed. Matches: ${passed}/${testCases.length}`);
    if (passed === testCases.length) {
        console.log("Note: Perfect match depends on AI interpretation. Review warnings manually.");
    }
}

runTests();
