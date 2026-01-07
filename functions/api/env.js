/**
 * Cloudflare Pages Functions - D1 & Environment Handler
 * 負責處理 D1 資料庫持久化儲存與 API 延遲監控
 */

export async function onRequest(context) {
    const { request, env } = context;
    const startTime = Date.now();

    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    try {
        const db = env.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: "D1 Binding Missing" }), { status: 500 });
        }

        let responsePayload = {};

        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            responsePayload = {
                status: "success",
                data: results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] }
            };
        } else if (request.method === "POST") {
            const { action, payload } = await request.json();
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            let currentData = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };

            if (action === "save") currentData.fav = payload;
            if (action === "history") currentData.history = payload;

            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("primary_user", JSON.stringify(currentData))
                .run();
            responsePayload = { status: "success" };
        }

        return new Response(JSON.stringify({
            ...responsePayload,
            db_latency: Date.now() - startTime
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

