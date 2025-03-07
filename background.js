chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://github.com/otoneko1102/fix-punycode#readme" });
  }

  /* 将来の変更用: 予約
  if (details.reason === "update") {
    chrome.tabs.create({ url: "https://github.com/otoneko1102/fix-punycode#readme" });
  }
  */

  chrome.storage.local.get({ ignoreList: [] }, (data) => {
    if (!data.ignoreList) {
      chrome.storage.local.set({ ignoreList: [] });
    }
  });
});
