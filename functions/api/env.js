/**
 * Cloudflare Pages Functions - D1 & Environment Handler
 * 負責處理 D1 資料庫的持久化儲存與環境變數讀取
 */

export async function onRequest(context) {
    const { request, env } = context;
    const { origin } = new URL(request.url);

    // 跨域預檢 (CORS)
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
        const db = env.DB; // 必須在 Pages 控制台綁定 D1 資料庫為 DB
        if (!db) {
            return new Response(JSON.stringify({ error: "D1 Binding 'DB' Missing" }), { 
                status: 500, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // GET: 載入使用者資料
        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            const userData = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };
            
            return new Response(JSON.stringify({
                status: "success",
                data: userData,
                env_info: {
                    region: request.cf?.colo || "UNKNOWN",
                    mode: env.NODE_ENV || "production"
                }
            }), { headers: { "Content-Type": "application/json" } });
        }

        // POST: 儲存使用者資料
        if (request.method === "POST") {
            const { action, payload } = await request.json();
            
            // 讀取目前的資料以便合併或更新
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            let currentData = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };

            if (action === "save") currentData.fav = payload;
            if (action === "history") currentData.history = payload;

            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("primary_user", JSON.stringify(currentData))
                .run();

            return new Response(JSON.stringify({ status: "success" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
}

