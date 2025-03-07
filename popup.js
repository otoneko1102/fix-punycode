const convertedCountEl = document.getElementById("converted-count");
const convertedListEl = document.getElementById("converted-list");
const toggleCheckbox = document.getElementById("toggle-checkbox");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) return;
  const tabId = tabs[0].id;
  const url = new URL(tabs[0].url);
  const hostname = url.hostname;

  chrome.storage.local.get({ ignoreList: [] }, (data) => {
    let ignoreList = data.ignoreList || [];
    let isIgnored = ignoreList.includes(hostname);

    toggleCheckbox.checked = !isIgnored;
    
    toggleCheckbox.addEventListener("change", () => {
      updateIgnoreList(tabId, hostname, toggleCheckbox.checked);
    });

    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // console.warn("Content script is not loaded, injecting now...");
        injectContentScript(tabId);
      } else {
        // console.log("Content script is already active.");
        fetchConvertedList();
      }
    });
  });
});

function updateIgnoreList(tabId, hostname, isEnabled) {
  chrome.storage.local.get({ ignoreList: [] }, (data) => {
    let ignoreList = data.ignoreList || [];

    if (isEnabled) {
      ignoreList = ignoreList.filter(item => item !== hostname);
    } else {
      ignoreList.push(hostname);
    }

    chrome.storage.local.set({ ignoreList }, () => {
      chrome.tabs.reload(tabId);
    });
  });
}

function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ["content.js"]
    },
    () => {
      if (chrome.runtime.lastError) {
        // console.error("Failed to inject content script:", chrome.runtime.lastError.message);
      } else {
        // console.log("Content script injected successfully.");
        fetchConvertedList();
      }
    }
  );
}

function fetchConvertedList() {
  try {
    chrome.runtime.sendMessage({ action: "getConvertedList" }, (response) => {
      if (response && response.list) {
        updateConvertedTable(response.list);
      }
    });
  } catch (error) {
    // console.warn("Failed to send message to content script:", error.message);
  }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updateConvertedList") {
    updateConvertedTable(request.list);
  }
});

function updateConvertedTable(list) {
  convertedListEl.innerHTML = "";

  list.forEach(entry => {
    const [punycode, unicode] = entry.split(" → ");

    const row = document.createElement("tr");
    row.innerHTML = `<td>${punycode}</td><td>${unicode}</td>`;
    convertedListEl.appendChild(row);
  });

  convertedCountEl.textContent = list.length;
}
