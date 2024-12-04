const logMsg = chrome.i18n.getMessage('Log');
const convertedMsg = chrome.i18n.getMessage('Converted');

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

function decodePunycode(target) {
  if (!target) return;

  if (target.tagName === 'A' && target.href) {
    try {
      const urlObj = new URL(target.href);

      if (urlObj.hostname.includes("xn--")) {
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

        // console.log(`Fix Punycode: ${convertedMsg}: ${originalHostname} → ${decodedHostname}`);
      }
    } catch {}
  }

  if (target.nodeType === Node.TEXT_NODE) {
    const regex = /(https?:\/\/[^\s]+)/g;
    const matches = target.nodeValue.match(regex);
    if (matches) {
      matches.forEach(match => {
        try {
          const urlObj = new URL(match);
          if (urlObj.hostname.includes("xn--")) {
            const originalHostname = urlObj.hostname;

            const decodedHostname = originalHostname
              .split('.')
              .map(part => (part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part))
              .join('.');

            urlObj.hostname = decodedHostname;
            target.nodeValue = target.nodeValue.replace(match, urlObj.href);

            // console.log(`Fix Punycode: ${convertedMsg}: ${originalHostname} → ${decodedHostname}`);
          }
        } catch {}
      });
    }
  }
}

function decodePunycodeInPage() {
  console.log(`Fix Punycode: ${logMsg}`);
  const elements = document.querySelectorAll('a[href], *');
  elements.forEach(element => decodePunycode(element));
}

document.body.addEventListener('mouseover', event => {
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
      if (node.nodeType === 1) {
        decodePunycode(node);
        node.querySelectorAll('*').forEach(child => decodePunycode(child));
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

setInterval(decodePunycodeInPage, 1000);

decodePunycodeInPage();
