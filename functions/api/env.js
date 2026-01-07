/**
 * Cloudflare Pages Functions - 強化生產環境穩定性
 */
export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB; // 需綁定 D1 命名為 DB
    const kv = env.SETTINGS; // 需綁定 KV 命名為 SETTINGS
    
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // 1. 搜尋代理 (核心邏輯保持鎖定)
        if (action === "proxy_search") {
            const target = url.searchParams.get("u");
            const res = await fetch(target, { cf: { timeout: 5000 } });
            const data = await res.text();
            return new Response(data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 2. KV 設定存取 (檢查是否存在綁定)
        if (action === "get_settings") {
            if (!kv) {
                return new Response(JSON.stringify({ 
                    bg: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400", 
                    mode: "glass",
                    error: "KV_BINDING_MISSING" 
                }), { headers: corsHeaders });
            }
            const data = await kv.get("config");
            return new Response(data || '{"bg":"https://images.unsplash.com/photo-1614850523296-d8c1af93d400","mode":"glass"}', { headers: corsHeaders });
        }
        
        if (action === "set_settings" && request.method === "POST") {
            if (!kv) throw new Error("KV Binding 'SETTINGS' is missing.");
            const body = await request.json();
            await kv.put("config", JSON.stringify(body.payload));
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // 3. D1 數據同步
        if (action === "load_db") {
            if (!db) return new Response(JSON.stringify({ fav: [], history: [], error: "D1_BINDING_MISSING" }), { headers: corsHeaders });
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("standard_user").all();
            return new Response(results.length ? results[0].content : JSON.stringify({ fav: [], history: [] }), { headers: corsHeaders });
        }

        if (request.method === "POST" && action === "sync_db") {
            if (!db) throw new Error("D1 Binding 'DB' is missing.");
            const body = await request.json();
            await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("standard_user", JSON.stringify(body.payload)).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ status: "online", db: !!db, kv: !!kv }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

