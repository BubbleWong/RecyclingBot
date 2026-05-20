import Koa from "koa";
import Router from "koa-router";
import { koaBody } from "koa-body";
import serve from "koa-static";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { classifyItem } from "./lib/classifyer.mjs";

const app = new Koa();
const router = new Router();
const PORT = 3000;
const WEBAPP_VERSION = randomUUID();
const serviceWorkerTemplate = await fs.readFile(path.resolve("public", "sw.js"), "utf-8");

// Middleware
app.use(async (ctx, next) => {
    if (ctx.path !== "/sw.js") {
        await next();
        return;
    }

    ctx.type = "application/javascript";
    ctx.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    ctx.set("Pragma", "no-cache");
    ctx.set("Expires", "0");
    ctx.set("Service-Worker-Allowed", "/");
    ctx.set("X-RecyclingBot-Version", WEBAPP_VERSION);
    ctx.body = serviceWorkerTemplate.replaceAll("__WEBAPP_VERSION__", WEBAPP_VERSION);
});
app.use(serve(path.resolve("public")));
app.use(koaBody({ multipart: true }));

// Routes
router.post("/api/classify", async (ctx) => {
    try {
        const file = ctx.request.files?.image;
        const model = ctx.request.body.model; // Extract model from ctx.request.body

        if (!file) {
            ctx.status = 400;
            ctx.body = { error: "No image file uploaded" };
            return;
        }

        const buffer = await fs.readFile(file.filepath);
        const base64 = buffer.toString("base64");
        const mimeType = file.mimetype || "image/jpeg";
        const dataUri = `data:${mimeType};base64,${base64}`;

        console.log(`Processing image upload: ${file.originalFilename} with model: ${model || 'default'}`);
        const result = await classifyItem(dataUri, model); // Pass model to classifyItem

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
    console.log(`RecyclingBot webapp version: ${WEBAPP_VERSION}`);
});
