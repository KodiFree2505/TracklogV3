// Robust API fetch that bypasses any fetch() monkey-patching (e.g., emergent-main.js).
// Uses XMLHttpRequest under the hood, which cannot be intercepted by fetch patches.
export default function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url, true);
    xhr.withCredentials = true;
    xhr.timeout = 15000; // 15s timeout prevents pages from hanging

    // Set headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.onload = function () {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        json: () =>
          new Promise((res, rej) => {
            try {
              res(JSON.parse(xhr.responseText));
            } catch (e) {
              rej(e);
            }
          }),
        text: () => Promise.resolve(xhr.responseText),
      });
    };

    xhr.onerror = function () {
      reject(new TypeError('Network request failed'));
    };

    xhr.ontimeout = function () {
      reject(new TypeError('Network request timed out'));
    };

    xhr.onabort = function () {
      reject(new TypeError('Network request aborted'));
    };

    xhr.send(options.body || null);
  });
}
