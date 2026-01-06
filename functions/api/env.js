/**
 * Cloudflare Pages Functions - D1 Manager & Env Handler
 * 負責處理前端的所有資料同步與環境變數讀取
 */

export async function onRequest(context) {
    const { request, env } = context;
    const { pathname } = new URL(request.url);

    // 1. 處理跨域與預檢請求
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
        // 2. 取得 D1 資料庫綁定 (假設綁定名稱為 DB)
        const db = env.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
        }

        // 3. 處理 GET 請求：讀取使用者配置與 D1 狀態
        if (request.method === "GET") {
            // 讀取 D1 中的資料 (假設資料表為 user_data)
            // 這裡使用一個固定的 key 'default_user' 作為展示，實際可配合 Auth 使用
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("default_user").all();
            
            const data = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };
            
            return new Response(JSON.stringify({
                status: "success",
                data: data,
                env_mode: env.NODE_ENV || "production",
                d1_connection: "active"
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // 4. 處理 POST 請求：寫入資料到 D1
        if (request.method === "POST") {
            const body = await request.json();
            const { action, payload } = body;

            // 先讀取現有資料
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("default_user").all();
            let currentData = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };

            // 根據 action 更新對應欄位
            if (action === "save") {
                currentData.fav = payload;
            } else if (action === "history") {
                currentData.history = payload;
            }

            // 寫回 D1
            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("default_user", JSON.stringify(currentData))
                .run();

            return new Response(JSON.stringify({ status: "success", message: "Data synced to D1" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

