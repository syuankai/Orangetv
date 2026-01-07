/**
 * Cloudflare Pages Functions - Auth & D1 Manager
 */

export async function onRequest(context) {
    const { request, env } = context;
    const startTime = Date.now();
    const sitePassword = env.PASSWORD; // 從環境變數獲取密碼

    // 跨域處理
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
        const body = request.method === "POST" ? await request.json() : null;
        
        // 密碼校驗邏輯
        if (sitePassword) {
            const userToken = request.headers.get("Authorization") || (body && body.token);
            if (userToken !== sitePassword) {
                return new Response(JSON.stringify({ error: "Unauthorized", needPassword: true }), { 
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        if (!db) return new Response(JSON.stringify({ error: "D1 Missing" }), { status: 500 });

        let response = {};

        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            response = {
                status: "success",
                data: results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] }
            };
        } else if (request.method === "POST") {
            const { action, payload } = body;
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            let current = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };

            if (action === "save") current.fav = payload;
            if (action === "history") current.history = payload;

            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("primary_user", JSON.stringify(current))
                .run();
            response = { status: "success" };
        }

        return new Response(JSON.stringify({
            ...response,
            latency: Date.now() - startTime
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

