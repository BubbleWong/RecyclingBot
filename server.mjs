import Koa from "koa";
import Router from "koa-router";
import { koaBody } from "koa-body";
import serve from "koa-static";
import path from "path";
import fs from "fs/promises";
import { classifyItem } from "./lib/classifyer.mjs";

const app = new Koa();
const router = new Router();
const PORT = 3000;

// Middleware
app.use(serve(path.resolve("public")));
app.use(koaBody({ multipart: true }));

// Routes
router.post("/api/classify", async (ctx) => {
    try {
        const file = ctx.request.files?.image;
        if (!file) {
            ctx.status = 400;
            ctx.body = { error: "No image file uploaded" };
            return;
        }

        const buffer = await fs.readFile(file.filepath);
        const base64 = buffer.toString("base64");
        const mimeType = file.mimetype || "image/jpeg";
        const dataUri = `data:${mimeType};base64,${base64}`;

        console.log(`Processing image upload: ${file.originalFilename}`);
        const result = await classifyItem(dataUri);

        ctx.body = result;
    } catch (error) {
        console.error("Error processing request:", error);
        ctx.status = 500;
        ctx.body = { error: "Internal Server Error", details: error.message };
    }
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
    console.log(`RecyclingBot Server running on http://localhost:${PORT}`);
});
