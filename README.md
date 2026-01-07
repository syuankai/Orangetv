🍊 OrangePlayer - 高端聚合影視門戶 🍊
這是一個基於 Cloudflare Pages + D1 資料庫 構建的極致影視聚合解決方案。它不僅擁有流暢的 UI 交互，還整合了多達 25+ 資源站的搜尋功能，並支持雲端歷史紀錄與收藏同步。
🌟 專案亮點 🌟
🚀 極速響應：採用原生 JS 與 Tailwind CSS，在 Cloudflare Edge 節點毫秒級加載
🛰️ 聚合搜索：一鍵檢索全球主流影視資源站，資源再也不難找
☁️ 雲端同步：利用 Cloudflare D1 分散式資料庫，隨時隨地同步你的追劇進度
🔐 安全防護：支持環境變數密碼鎖，保護你的私密導航站
🎨 磨砂玻璃 UI：高端半透明毛玻璃效果，提供沉浸式的播放體驗
🎬 全能播放：內建 Video.js，完美支持 .m3u8 串流與本地 MP4/音檔
🛠️ 環境變數 (Environment Variables) 🛠️
在 Cloudflare Pages 部署時，請設定以下變數來開啟完整功能：
🔑 PASSWORD
這代表你的「網站訪問密碼」。
 * 如果你有設定此變數，用戶進入網站時會看到解鎖介面。
 * 如果你不設定或留空，網站將進入「免密模式」，任何人皆可直接訪問。
🗄️ DB
這代表「D1 資料庫綁定名稱」。
 * 在 Cloudflare 控制台創建 D1 資料庫後，需將其綁定到 Pages 專案。
 * 變數名稱必須嚴格設定為 DB，否則雲端儲存功能將失效。
🚢 部署教學 (Cloudflare Pages) 🚢
跟著以下步驟，不到 5 分鐘即可完成部署！
📍 第一步：準備 D1 資料庫
 * 登入 Cloudflare 控制台，進入 Workers & Pages -> D1。
 * 點擊「Create database」，名稱隨意（例如 orange-db）。
 * 進入該資料庫，點擊「Console」並執行以下 SQL 來初始化表結構：
   CREATE TABLE user_data (id TEXT PRIMARY KEY, content TEXT);
📍 第二步：上傳代碼
 * 將專案代碼（index.html 與 functions/ 資料夾）上傳至 GitHub。
 * 在 Cloudflare Pages 建立新專案，選擇該 GitHub 倉庫。
📍 第三步：綁定 D1 與 設定變數
 * 進入專案設定 -> Functions -> D1 database bindings。
 * 點擊「Add binding」，Variable name 填入 DB，Database 選擇你剛創建的資料庫。
 * 進入專案設定 -> Environment variables。
 * 添加 PASSWORD 變數（如果你需要密碼保護）。
📍 第四步：重新部署
 * 回到「Deployments」頁面，點擊「Retry deployment」。
 * 部署完成後，你的專案連結就生效啦！🎉
📂 資料夾結構 📂
📂 functions/api/env.js
這是後端大腦，負責處理 API 請求、密碼校驗以及與 D1 資料庫的數據交換。
📄 index.html
這是前端靈魂，包含了所有的 UI 設計、播放器邏輯、搜尋引擎以及與後端的通訊。
🌈 使用貼士 🌈
💡 換一批按鈕：首頁如果沒看到想看的，點擊「換一批」會隨機從不同的 API 節點抓取內容。
💡 M3U8 解析：如果你有其他的直播流網址，可以直接粘貼到解析頁面播放。
💡 本地歌單：支持把手機或電腦裡的 MP3 直接拖進去，OrangePlayer 會瞬間變成你的私人音樂播放器。
🤝 貢獻與反饋 🤝
如果你喜歡這個專案，歡迎點個 Star ⭐！如果有任何 Bug 或改進建議，請隨時提出 Issue。
讓我們一起打造最完美的橘色播放器！🔥
🍊 Enjoy Your Movie Time! 🍊


