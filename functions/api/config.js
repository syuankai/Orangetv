export async function onRequest(context) {
  const { env, request } = context;
  const startTime = Date.now();
  
  const PASSWORD = env.PASSWORD || "";
  const STORAGE = env.STORAGE || "local"; // d1 或 local

  // 處理 POST 請求 (驗證與資料寫入)
  if (request.method === "POST") {
    const body = await request.json();
    
    // 密碼驗證
    if (body.action === "verify") {
      return new Response(JSON.stringify({ 
        success: body.password === PASSWORD,
        storageType: STORAGE
      }), { headers: { "Content-Type": "application/json" } });
    }

    // D1 存儲邏輯
    if (STORAGE === "d1" && env.DB) {
      if (body.action === "save_history") {
        await env.DB.prepare("INSERT OR REPLACE INTO history (uid, vod_id, vod_name, progress, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(body.uid, body.id, body.name, body.progress, Date.now()).run();
      }
      if (body.action === "toggle_fav") {
        // 收藏切換邏輯
      }
      return new Response(JSON.stringify({ success: true }));
    }
  }

  // 處理 GET 請求 (獲取配置與 Ping 延遲)
  const dbStartTime = Date.now();
  let dbStatus = "ok";
  let dbLatency = 0;

  if (STORAGE === "d1" && env.DB) {
    try {
      await env.DB.prepare("SELECT 1").first();
      dbLatency = Date.now() - dbStartTime;
    } catch (e) {
      dbStatus = "error";
    }
  }

  return new Response(JSON.stringify({
    storageMode: STORAGE,
    hasPassword: PASSWORD !== "",
    dbStatus: dbStatus,
    latency: dbLatency,
    serverTime: Date.now() - startTime
  }), { 
    headers: { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache" 
    } 
  });
}

        
