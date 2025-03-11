chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://xn--r8jqs6k2dyb.xn--tckwe" });
  }

  if (details.reason === "update") {
    chrome.tabs.create({ url: "https://xn--r8jqs6k2dyb.xn--tckwe" });
  }

  chrome.storage.local.get({ ignoreList: [] }, (data) => {
    if (!data.ignoreList) {
      chrome.storage.local.set({ ignoreList: [] });
    }
  });
});
