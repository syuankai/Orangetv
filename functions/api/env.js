/**
 * Cloudflare Pages Functions
 * 整合：D1 儲存、KV 設定、延遲檢測、搜尋代理
 */
export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const kv = env.SETTINGS; 
    
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // 搜尋代理 (保持不動)
        if (action === "proxy_search") {
            const target = url.searchParams.get("u");
            const res = await fetch(target, { cf: { timeout: 5000 } });
            const data = await res.text();
            return new Response(data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 延遲檢測 PING
        if (action === "ping") {
            return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
        }

        // KV 設定同步
        if (action === "get_settings") {
            const data = await kv?.get("config");
            return new Response(data || '{"bg":"https://images.unsplash.com/photo-1614850523296-d8c1af93d400","mode":"glass"}', { headers: corsHeaders });
        }
        
        if (action === "set_settings" && request.method === "POST") {
            const body = await request.json();
            await kv?.put("config", JSON.stringify(body.payload));
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // D1 雲端儲存 (一併處理 fav 與 history)
        if (db) {
            const userId = "standard_user"; 
            if (action === "load_db") {
                const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind(userId).all();
                return new Response(results.length ? results[0].content : JSON.stringify({ fav: [], history: [] }), { headers: corsHeaders });
            }
            if (request.method === "POST" && (action === "sync_db")) {
                const body = await request.json();
                await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                    .bind(userId, JSON.stringify(body.payload)).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }

        return new Response(JSON.stringify({ status: "online" }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

