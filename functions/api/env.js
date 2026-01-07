/**
 * Cloudflare Pages Functions - D1 & Environment Handler
 * 負責 D1 資料同步與延遲偵測
 */

export async function onRequest(context) {
    const { request, env } = context;
    const startTime = Date.now();

    // 跨域預檢
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

        let responseData = {};

        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            responseData = {
                status: "success",
                data: results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] },
                server_time: Date.now()
            };
        } else if (request.method === "POST") {
            const { action, payload } = await request.json();
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            let current = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };

            if (action === "save") current.fav = payload;
            if (action === "history") current.history = payload;

            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("primary_user", JSON.stringify(current))
                .run();
            responseData = { status: "success" };
        }

        // 回傳包含處理耗時，用於前端計算 D1 延遲
        const endTime = Date.now();
        return new Response(JSON.stringify({
            ...responseData,
            processing_ms: endTime - startTime
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

