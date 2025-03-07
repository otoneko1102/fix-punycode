function punycodeToUnicode(domain) {
  const base = 36;
  const tMin = 1;
  const tMax = 26;
  const skew = 38;
  const damp = 700;
  const initialBias = 72;
  const initialN = 128;
  const delimiter = '-';

  let output = [];
  let input = domain.split('');
  let i = domain.lastIndexOf(delimiter);
  let n = initialN;
  let bias = initialBias;
  let index = 0;

  if (i > 0) {
    output = input.slice(0, i);
    input = input.slice(i + 1);
  }

  while (input.length > 0) {
    let oldi = index;
    let w = 1;

    for (let k = base; ; k += base) {
      const charCode = input.shift().charCodeAt(0);
      const digit = charCode - (charCode < 58 ? 22 : charCode < 91 ? 65 : 97);
      index += digit * w;

      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

      if (digit < t) break;
      w *= base - t;
    }

    bias = adapt(index - oldi, output.length + 1, oldi === 0);
    n += Math.floor(index / (output.length + 1));
    index %= output.length + 1;
    output.splice(index++, 0, String.fromCharCode(n));
  }

  return output.join('');

  function adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > (((base - tMin) * tMax) >> 1)) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor((base - tMin + 1) * delta / (delta + skew));
  }
}

let convertedList = [];
let isPunycodeFixEnabled = true;

const hostname = window.location.hostname;

chrome.storage.local.get({ ignoreList: [] }, (data) => {
  const ignoreList = data.ignoreList || [];
  if (!ignoreList.includes(hostname)) {
    enablePunycodeFix();
  } else {
    // console.log(`Punycode Fix is disabled for ${hostname}`);
  }
});

function enablePunycodeFix() {
  decodePunycodeInPage();

  document.body.addEventListener("mouseover", event => {
    if (!isPunycodeFixEnabled) return;
    const target = event.target;
    if (target) {
      decodePunycode(target);
      if (target.childNodes) {
        target.childNodes.forEach(child => decodePunycode(child));
      }
    }
  });

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!isPunycodeFixEnabled) return;
        if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute("data-punycode-fixed")) {
          decodePunycode(node);
          node.querySelectorAll("*:not([data-punycode-fixed])").forEach(child => decodePunycode(child));
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function decodePunycode(target) {
  if (!isPunycodeFixEnabled || !target) return;
  if (target.nodeType === Node.ELEMENT_NODE && target.hasAttribute("data-punycode-fixed")) return;

  // A
  if (target.tagName === 'A' && target.href) {
    try {
      const urlObj = new URL(target.href);
      if (urlObj.hostname.includes("xn--")) {
        replacePunycode(target, urlObj);
        target.setAttribute("data-punycode-fixed", "true");
      }
    } catch {}
  }

  // TEXT_NODE
  if (target.nodeType === Node.TEXT_NODE) {
    replaceTextPunycode(target);
  }
}

function replacePunycode(target, urlObj) {
  const originalHostname = urlObj.hostname;
  const decodedHostname = originalHostname
    .split('.')
    .map(part => (part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part))
    .join('.');

  urlObj.hostname = decodedHostname;

  target.href = urlObj.href;
  if (target.textContent.includes(originalHostname)) {
    target.textContent = target.textContent.replace(originalHostname, decodedHostname);
  }
  if (target.title.includes(originalHostname)) {
    target.title = target.title.replace(originalHostname, decodedHostname);
  }

  target.addEventListener('mouseover', e => e.preventDefault());

  convertedList.push(`${originalHostname} → ${decodedHostname}`);
}

function replaceTextPunycode(textNode) {
  if (!textNode.parentNode || textNode.parentNode.nodeType !== Node.ELEMENT_NODE) return;
  if (textNode.parentNode.hasAttribute("data-punycode-fixed")) return;

  const regex = /(?:https?:\/\/)?([\w.-]*xn--[\w.-]*)/g;
  let text = textNode.nodeValue;
  let replacedText = text.replace(regex, match => {
    const originalHostname = match;
    if (originalHostname.includes("xn--")) {
      return originalHostname
        .split('.')
        .map(part => (part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part))
        .join('.');
    }
    return match;
  });

  if (text !== replacedText) {
    textNode.nodeValue = replacedText;
    textNode.parentNode.setAttribute("data-punycode-fixed", "true");
    convertedList.push(`${text} → ${replacedText}`);
  }
}

function decodePunycodeInPage() {
  if (!isPunycodeFixEnabled) return;
  document.querySelectorAll("*:not([data-punycode-fixed])").forEach(element => decodePunycode(element));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "decodePunycode") {
    const decoded = request.punycode
      .split('.')
      .map(part => (part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part))
      .join('.');
    sendResponse({ decoded });
  }

  if (request.action === "togglePunycodeFix") {
    isPunycodeFixEnabled = !request.disable;
    // console.log(`Punycode Fix is now ${isPunycodeFixEnabled ? "enabled" : "disabled"}`);
  }

  if (request.action === "getConvertedList") {
    sendResponse({ list: convertedList });
  }
});

let intervalId = setInterval(() => {
  if (!chrome.runtime || !chrome.runtime.id) return;

  try {
    chrome.runtime.sendMessage({ action: "updateConvertedList", list: convertedList });
  } catch (error) {
    // console.warn("Failed to send message:", error.message);
  }
}, 5000);

window.addEventListener("beforeunload", () => clearInterval(intervalId));
