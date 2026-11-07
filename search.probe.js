// iRingo Search 探针 + 轻量地区改写（Surge）
// 用途：1) 记录 smoot bag/search 请求与响应的真实格式；2) 可选地改写 search 请求里的 cc 参数
// 日志里可能含搜索词和设备标识，分享前请先打码。

const args = {};
if (typeof $argument === "string") {
  $argument.split("&").forEach((kv) => {
    const i = kv.indexOf("=");
    if (i > 0) args[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  });
}
const CC = (args.CountryCode || "TW").toUpperCase();
const REWRITE = String(args.Rewrite || "true") === "true";

const log = (...a) => console.log("[SearchProbe]", ...a);
const isResponse = typeof $response !== "undefined";
const url = $request.url;
const path = (url.match(/^https?:\/\/[^/]+(\/[^?]*)/) || [])[1] || "";

function preview(body) {
  if (body == null) return "(no body)";
  if (typeof body === "string") return `text len=${body.length} head=${JSON.stringify(body.slice(0, 200))}`;
  const u8 = body instanceof Uint8Array ? body : new Uint8Array(body);
  const n = Math.min(u8.length, 64);
  let hex = "", asc = "";
  for (let i = 0; i < n; i++) {
    hex += u8[i].toString(16).padStart(2, "0") + " ";
    asc += u8[i] >= 32 && u8[i] < 127 ? String.fromCharCode(u8[i]) : ".";
  }
  return `binary len=${u8.length} hex=${hex.trim()} ascii=${asc}`;
}

if (!isResponse) {
  const h = $request.headers || {};
  const pick = {};
  Object.keys(h).forEach((k) => {
    if (/^(x-apple-|accept-language|user-agent|content-type|accept$)/i.test(k)) pick[k] = h[k];
  });
  log("REQ", path, url.split("?")[1] || "", JSON.stringify(pick));

  if (REWRITE && path.endsWith("/search") && /[?&]cc=[A-Za-z]{2}/.test(url)) {
    const newUrl = url.replace(/([?&]cc=)[A-Za-z]{2}/, `$1${CC}`);
    log("REWRITE cc ->", CC);
    $done({ url: newUrl });
  } else {
    $done({});
  }
} else {
  const rh = $response.headers || {};
  const ct = rh["Content-Type"] || rh["content-type"] || "";
  const ce = rh["Content-Encoding"] || rh["content-encoding"] || "";
  log("RES", path, `status=${$response.status}`, `type=${ct}`, `enc=${ce}`, preview($response.body));
  $done({});
}
