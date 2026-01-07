/**
 * Cloudflare Pages Functions - Auth & D1 Manager (Fixed Version)
 */

export async function onRequest(context) {
    const { request, env } = context;
    const sitePassword = env.PASSWORD ? String(env.PASSWORD).trim() : null;
    const db = env.DB;

    // CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let body = null;
        if (request.method === "POST") {
            body = await request.json();
        }

        // --- 核心密碼驗證邏輯 ---
        if (sitePassword && sitePassword !== "") {
            // 從 Header 或 Body 獲取用戶提供的密碼
            const userToken = request.headers.get("Authorization") || (body ? body.token : null);

            // 如果沒有 Token 或 Token 不正確
            if (!userToken || userToken !== sitePassword) {
                // 如果是檢查密碼的請求但失敗了，或是其他請求
                return new Response(JSON.stringify({ 
                    error: "Unauthorized", 
                    needPassword: true 
                }), { 
                    status: 401, 
                    headers: { ...corsHeaders, "Content-Type": "application/json" } 
                });
            }
        }

        // 如果是單純的密碼校驗 POST
        if (body && body.action === 'check') {
            return new Response(JSON.stringify({ status: "success", authenticated: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // --- D1 資料庫操作 ---
        if (!db) {
            return new Response(JSON.stringify({ error: "D1_NOT_FOUND" }), { 
                status: 200, // 回傳 200 以免前端因 500 崩潰
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        let resultData = { status: "success" };

        if (request.method === "GET") {
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
            resultData.data = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };
        } else if (request.method === "POST") {
            const { action, payload } = body;
            if (action === "save" || action === "history") {
                const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("primary_user").all();
                let current = results.length > 0 ? JSON.parse(results[0].content) : { fav: [], history: [] };
                
                if (action === "save") current.fav = payload;
                if (action === "history") current.history = payload;

                await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                    .bind("primary_user", JSON.stringify(current))
                    .run();
            }
        }

        return new Response(JSON.stringify(resultData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }
}

