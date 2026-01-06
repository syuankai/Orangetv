export async function onRequest(context) {
  const { env } = context;

  // 過濾並導出前端所需的變數
  const clientConfig = {
    D1_READY: !!env.DB, // 檢查是否有綁定名稱為 DB 的 D1 資料庫
    STORAGE_TYPE: env.STORAGE || "local", // 'd1' 或 'local'
    HAS_PASSWORD: !!env.PASSWORD,
    RUNTIME_VERSION: "5.1.0",
    TIMESTAMP: new Date().toISOString()
  };

  return new Response(JSON.stringify(clientConfig), {
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

