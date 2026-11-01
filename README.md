# Fantasy Basketball Stat Colors（測試版）

這是尚未完成正式驗證的 Chrome 擴充功能。它會固定 Yahoo Fantasy Basketball Player List 的兩層表頭與球員名稱欄；測試版的上色功能亦嘗試跨頁取得同一統計模式的 All Players。綠色代表較佳，紅色代表較差；失誤反向計算，FGM/A 和 FTM/A 不上色。

**資料來源與公開發布尚有阻礙：**[Yahoo 使用條款](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html)禁止未取得事先明示許可的自動資料收集。現有測試版會自動讀取球員列表的多個頁面，使用前應確認已有適當許可；目前未確認許可，也未確認 Yahoo 官方 API 足以支援所需模式。本專案尚未準備好公開上架。

## 從 GitHub 安裝測試版

1. 在專案的 GitHub 頁面選擇 **Code → Download ZIP**，下載並解壓縮。
2. 在 Chrome 開啟 `chrome://extensions`，開啟右上角的「開發人員模式」。
3. 選擇「載入未封裝項目」，選取解壓縮後的 `extension` 資料夾（內含 `manifest.json`）。
4. 登入 Yahoo Fantasy Basketball，開啟 Player List。等待「數據百分位」的更新狀態；可以使用「立即更新」。

此方式不透過 Chrome Web Store。請保留解壓縮後的資料夾；Chrome 會從該資料夾載入擴充功能。

## 手動更新

1. 從 GitHub 下載新版 ZIP 並解壓縮。
2. 將新版 `extension` 資料夾的內容複製到原先安裝的資料夾，或移除舊版後重新載入新資料夾。
3. 在 `chrome://extensions` 對此擴充功能按重新載入，再重新整理 Yahoo Player List。GitHub 上的新版本不會自動更新到這種安裝方式。

僅供測試。已在 Yahoo 驗證本季平均及未來 7 天預測、翻頁和快取，也測試過球員搜尋、位置、狀態、NBA 球隊、Fantasy 球隊與 Show my team；其他統計視圖與上架政策尚未完整驗證。

## 更新與資料

- 使用者開啟 Player List 時檢查本機快取；15 分鐘內重用，過期時更新。切換統計期間各自儲存；按「立即更新」可強制更新。擴充功能不會在瀏覽器關閉後定時執行。
- 一般數據的母體為每場至少 10 分鐘、出賽達最高場次四分之一的球員。Yahoo 預測頁面未提供預測上場時間，因此預測模式只要求預測至少出賽一場。使用者已確認採用這些門檻。
- 偵測不到必要資料、不支援或含糊的欄位不會上色。並非所有 Yahoo 數據欄位與視圖都已實作或驗證。
- 資料僅儲存在本機 Chrome 擴充功能儲存空間；不傳送到本專案伺服器。擴充功能會使用已登入的瀏覽器向 Yahoo 要求球員列表頁面。
- Yahoo 若限制請求或頁面格式改變，更新可能失敗；可能在多個分頁同時更新時重複送出請求。

## 測試

執行 `node --test tests/*.test.js`。`tests/browser/` 是使用模擬 Yahoo HTML 的瀏覽器解析測試，不連線 Yahoo；正式發布前仍須在真實 Yahoo 中測試。
