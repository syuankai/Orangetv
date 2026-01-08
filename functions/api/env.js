/**
 * Cloudflare Pages Functions - 旗艦正式版 (僅處理 D1 雲端同步)
 */
export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB; 
    
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

        // D1 雲端同步邏輯
        if (action === "load_db") {
            if (!db) return new Response(JSON.stringify({ fav: [], history: [] }), { headers });
            const { results } = await db.prepare("SELECT content FROM user_data WHERE id = ?").bind("user_default").all();
            return new Response(results.length ? results[0].content : JSON.stringify({ fav: [], history: [] }), { headers });
        }
        
        if (action === "sync_db" && request.method === "POST") {
            const body = await request.json();
            if (db) {
                await db.prepare("INSERT OR REPLACE INTO user_data (id, content) VALUES (?, ?)")
                    .bind("user_default", JSON.stringify(body.payload)).run();
            }
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        return new Response(JSON.stringify({ status: "active" }), { headers });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
}

