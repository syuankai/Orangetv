export async function onRequest(context) {
  const { env } = context;
  
  const PASSWORD = env.PASSWORD || "";
  const STORAGE = env.STORAGE || "local"; 

  if (context.request.method === "POST") {
    const body = await context.request.json();
    
    if (body.action === "verify") {
      return new Response(JSON.stringify({ 
        success: body.password === PASSWORD,
        storageType: STORAGE
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (STORAGE === "d1" && body.action === "save_history" && env.DB) {
      try {
        // 這裡提供一個基礎的 D1 寫入範例，需先建立對應的 Table
        // await env.DB.prepare("INSERT INTO history (vod_id, vod_name, source) VALUES (?, ?, ?)").bind(body.id, body.name, body.source).run();
        return new Response(JSON.stringify({ success: true }));
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
      }
    }
  }

  return new Response(JSON.stringify({
    storageMode: STORAGE,
    hasPassword: PASSWORD !== ""
  }), { headers: { "Content-Type": "application/json" } });
}

