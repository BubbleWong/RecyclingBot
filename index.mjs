import { classifyItem } from "./lib/classifyer.mjs";

const item = "plastic bottle";

const result = await classifyItem(item);


console.log(result);