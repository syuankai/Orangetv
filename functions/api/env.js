/**
 * Cloudflare Pages Functions - 旗艦正式版 (支援 D1/KV & 延遲監控)
 */
export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB; 
    const kv = env.SETTINGS; 
    
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers });

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // 1. 延遲檢測 (資源探測)
        if (action === "proxy_ping") {
            const target = url.searchParams.get("u");
            const start = Date.now();
            try {
                await fetch(target, { method: "HEAD", signal: AbortSignal.timeout(2000) });
                return new Response(JSON.stringify({ ms: Date.now() - start }), { headers });
            } catch (e) {
                return new Response(JSON.stringify({ ms: -1 }), { headers });
            }
        }

        // 2. 基礎設施延遲檢測 (D1/KV)
        if (action === "kv_ping") {
            const start = Date.now();
            if (kv) await kv.get("ping");
            return new Response(JSON.stringify({ ms: Date.now() - start }), { headers });
        }
        if (action === "d1_ping") {
            const start = Date.now();
            if (db) await db.prepare("SELECT 1").run();
            return new Response(JSON.stringify({ ms: Date.now() - start }), { headers });
        }

        // 3. 數據同步 (我的儲存 & 雲端歷史)
        if (action === "load_db") {
            if (!db) return new Response(JSON.stringify({ fav: [], history: [] }), { headers });
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("user_default").all();
            return new Response(results.length ? results[0].content : JSON.stringify({ fav: [], history: [] }), { headers });
        }
        if (action === "sync_db" && request.method === "POST") {
            const body = await request.json();
            if (db) await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                .bind("user_default", JSON.stringify(body.payload)).run();
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        return new Response(JSON.stringify({ status: "active" }), { headers });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
}

