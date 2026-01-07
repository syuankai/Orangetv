/**
 * Cloudflare Pages Functions - Auth & D1 Manager
 * 修正了密碼比對邏輯與免密登入檢測
 */

export async function onRequest(context) {
    const { request, env } = context;
    const startTime = Date.now();
    const sitePassword = env.PASSWORD; // 環境變數中的密碼

    // CORS 預檢請求
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    try {
        const db = env.DB;
        const body = request.method === "POST" ? await request.json() : null;
        
        // 密碼校驗邏輯：僅在 sitePassword 存在時執行
        if (sitePassword && sitePassword.trim() !== "") {
            const userToken = request.headers.get("Authorization") || (body && body.token);
            
            // 如果是檢查密碼的請求或一般數據請求，驗證 Token 是否一致
            if (userToken !== sitePassword) {
                return new Response(JSON.stringify({ 
                    error: "Unauthorized", 
                    needPassword: true,
                    debug: "Token mismatch" 
                }), { 
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // 如果只是單純檢查密碼是否正確的 POST 請求
        if (body && body.action === 'check') {
            return new Response(JSON.stringify({ status: "success", message: "Authenticated" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!db) return new Response(JSON.stringify({ error: "D1 Binding Missing" }), { status: 500 });

        let responseData = {};

        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            responseData = {
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
            responseData = { status: "success" };
        }

        return new Response(JSON.stringify({
            ...responseData,
            latency: Date.now() - startTime
        }), { 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

