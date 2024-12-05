const copiedMsg = chrome.i18n.getMessage('Copied');
const failedMsg = chrome.i18n.getMessage('Failed');

function popup(message) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.innerHTML = `<p>${message}</p>`;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => {
    overlay.remove();
  });

  setTimeout(() => {
    overlay.remove();
  }, 1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

document.getElementById("convertButton").addEventListener("click", () => {
  const input = document.getElementById("punycodeInput").value.trim();
  const outputField = document.getElementById("unicodeOutput");

  if (input) {
    try {
      const decoded = input
        .split('.')
        .map(part => (part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part))
        .join('.');
      outputField.value = decoded;
    } catch (e) {
      outputField.value = "Invalid Punycode";
    }
  } else {
    outputField.value = "";
  }
});

document.getElementById("copyButton").addEventListener("click", async () => {
  const outputField = document.getElementById("unicodeOutput");
  const textToCopy = outputField.value;

  if (textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      popup(`${copiedMsg}: ` + textToCopy);
    } catch {
      popup(failedMsg);
    }
  }
});
