/**
 * Cloudflare Pages Functions - 核心處理邏輯
 * 支援 D1 (歷史/收藏), KV (UI 設定), 及多源解析加速
 */

export async function onRequest(context) {
    const { request, env } = context;
    const sitePassword = env.PASSWORD ? String(env.PASSWORD).trim() : null;
    const db = env.DB;
    const kv = env.SETTINGS; 
    
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        let body = null;
        if (request.method === "POST") {
            const text = await request.text();
            body = text ? JSON.parse(text) : null;
        }

        const userToken = request.headers.get("Authorization") || (body ? body.token : null);
        if (sitePassword && sitePassword !== "" && userToken !== sitePassword) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action") || (body ? body.action : null);

        // UI 偏好設定同步 (KV)
        if (action === "get_settings") {
            const settings = await kv?.get("user_ui_config") || '{"bg":"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564","mode":"glass"}';
            return new Response(settings, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        if (action === "set_settings") {
            await kv?.put("user_ui_config", JSON.stringify(body.payload));
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // 豆瓣加速器 (API 緩存處理)
        if (action === "douban") {
            const doubanRes = await fetch(`https://api.douban.com/v2/movie/in_theaters?apikey=0b2bdeda43b5688921839c8ecb20399b&count=24`, {
                headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15" }
            });
            return new Response(doubanRes.body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // D1 雲端數據處理
        if (db) {
            const userId = "primary_user";
            if (request.method === "GET") {
                const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind(userId).all();
                const data = results.length ? JSON.parse(results[0].content) : { fav: [], history: [] };
                return new Response(JSON.stringify({ data }), { headers: corsHeaders });
            } else if (action === "save" || action === "history") {
                const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind(userId).all();
                let current = results.length ? JSON.parse(results[0].content) : { fav: [], history: [] };
                if (action === "save") current.fav = body.payload;
                if (action === "history") current.history = body.payload;
                await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                    .bind(userId, JSON.stringify(current)).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }

        return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

