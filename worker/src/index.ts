/**
 * Emoticon Replacer - Remote Config Worker (Cloudflare Workers + KV)
 *
 * - GET  /            : KV에 저장된 config JSON 반환 (ETag, If-None-Match → 304)
 * - GET  /admin       : 운영자 관리 패널(HTML)
 * - PUT  /            : Bearer 토큰 인증 후 KV에 config 저장
 * - OPTIONS           : CORS preflight
 *
 * 배포 전: `wrangler kv namespace create CONFIG_KV`로 KV 생성 후 wrangler.toml의 id 기입,
 *          `wrangler secret put ADMIN_TOKEN`으로 관리 토큰 설정.
 */

export interface Env {
    CONFIG_KV: KVNamespace;
    ADMIN_TOKEN: string;
}

const KV_KEY = 'config';

// KV가 비었을 때 반환할 기본 config. 확장 빌드 내장 기본값(config.ts)과 동일하게 유지한다.
const DEFAULT_CONFIG = {
    schemaVersion: 1,
    configVersion: 'worker-default',
    killSwitch: {all: false, chatInput: false, chatListReplace: false},
    monitor: {
        liveUrlPattern: '^\\/(?:iframe\\/)?live\\/([^\\/]+)',
        vodUrlPattern: '^\\/video\\/([^\\/]+)',
        chatListSelector: {css: '#aside-chatting [role="log"]'},
        chatMessageSelector: {css: '[class*="_chatting_message_"] > [class*="_text_"]'},
        vodChatListSelector: {css: '[class*="_chatting_list_"]'},
        vodChatMessageSelector: {css: '[class*="_chatting_message_"] > [class*="_text_"]'},
        vodStreamerIdLinkSelector: {css: '[class*="_video_information_link_"]'},
        vodStreamerIdPattern: '(?:https?:\\/\\/[^\\/]+\\/|\\/)?([^\\/]+)\\/?$',
        popupContainerSelector: {css: '#aside-chatting > [class*="_area_"]'},
        chatInputSelector: {css: '#aside-chatting textarea'},
        monitorElementStrategy: 'mutation',
        defaultPollingInterval: 1000,
    },
    replace: {appendBreakLine: true},
    chatInput: {
        bindingStrategy: 'delegation',
        dispatchFakeEvent: true,
        directInputSelector: {css: '#aside-chatting textarea, #aside-chatting [contenteditable]'},
    },
    popup: {anchorSelector: null, style: null},
};

const CORS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-None-Match, Authorization',
    'Access-Control-Expose-Headers': 'ETag',
};

async function sha256Etag(body: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    return `"${hex.slice(0, 32)}"`;
}

async function getConfigBody(env: Env): Promise<string> {
    const stored = await env.CONFIG_KV.get(KV_KEY);
    return stored ?? JSON.stringify(DEFAULT_CONFIG);
}

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8', ...extra},
    });
}

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        const url = new URL(req.url);

        if (req.method === 'OPTIONS') {
            return new Response(null, {headers: CORS});
        }

        if (url.pathname === '/admin') {
            return new Response(ADMIN_HTML, {
                headers: {'Content-Type': 'text/html; charset=utf-8'},
            });
        }

        if (req.method === 'GET') {
            const body = await getConfigBody(env);
            const etag = await sha256Etag(body);
            const headers = {
                ...CORS,
                'ETag': etag,
                'Cache-Control': 'public, max-age=30',
                'Content-Type': 'application/json; charset=utf-8',
            };
            if (req.headers.get('If-None-Match') === etag) {
                return new Response(null, {status: 304, headers});
            }
            return new Response(body, {status: 200, headers});
        }

        if (req.method === 'PUT') {
            const auth = req.headers.get('Authorization') || '';
            const token = auth.replace(/^Bearer\s+/i, '');
            if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
                return json({error: 'unauthorized'}, 401);
            }
            let parsed: any;
            try {
                parsed = await req.json();
            } catch {
                return json({error: 'invalid json'}, 400);
            }
            if (!parsed || typeof parsed !== 'object' || typeof parsed.schemaVersion !== 'number') {
                return json({error: 'schemaVersion(number) required'}, 400);
            }
            const body = JSON.stringify(parsed);
            await env.CONFIG_KV.put(KV_KEY, body);
            const etag = await sha256Etag(body);
            return json({ok: true, etag}, 200, {'ETag': etag});
        }

        return new Response('Not Found', {status: 404, headers: CORS});
    },
};

// ──────────────────────────────────────────────────────────────────────────
// 운영자 관리 패널 (주요 필드 폼 + raw JSON 병행). 공유 시크릿 토큰으로 PUT 인증.
// ──────────────────────────────────────────────────────────────────────────
const ADMIN_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Emoticon Replacer · Remote Config</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Malgun Gothic", sans-serif; margin: 0; padding: 24px; max-width: 920px; margin-inline: auto; }
  h1 { font-size: 1.3rem; }
  h2 { font-size: 1rem; margin-top: 1.5rem; border-bottom: 1px solid #8884; padding-bottom: 4px; }
  label { display: block; font-size: .85rem; margin: 8px 0 2px; opacity: .85; }
  input[type=text], textarea, select { width: 100%; padding: 7px 9px; font-size: .85rem; border: 1px solid #8886; border-radius: 6px; background: transparent; color: inherit; font-family: ui-monospace, monospace; }
  textarea { resize: vertical; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .switches { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; }
  .switches label { display: flex; align-items: center; gap: 6px; font-size: .9rem; }
  .switches input { width: auto; }
  .toolbar { display: flex; gap: 8px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
  button { padding: 8px 14px; font-size: .85rem; border: 1px solid #8886; border-radius: 6px; cursor: pointer; background: #6c8cff22; color: inherit; }
  button.primary { background: #6c8cff; color: #fff; border-color: #6c8cff; }
  #status { font-size: .85rem; padding: 6px 0; min-height: 1.2em; }
  .ok { color: #2ea043; } .err { color: #e5534b; }
  details { margin-top: 1rem; } summary { cursor: pointer; font-weight: 600; }
  small { opacity: .65; }
</style>
</head>
<body>
<h1>Emoticon Replacer · Remote Config</h1>
<p><small>셀렉터·바인딩 전략·팝업·kill switch를 재배포 없이 패치합니다. 변경 후 <b>저장</b>하면 KV에 반영됩니다.</small></p>

<div class="toolbar">
  <input id="token" type="text" placeholder="관리 토큰 (Bearer)" style="flex:1; min-width:200px;">
  <button id="load">현재 config 불러오기</button>
  <button id="save" class="primary">저장 (PUT)</button>
</div>
<div id="status"></div>

<h2>Kill Switch</h2>
<div class="switches">
  <label><input type="checkbox" data-k="killSwitch.all"> 전체 비활성 (all)</label>
  <label><input type="checkbox" data-k="killSwitch.chatInput"> 입력 자동완성만 비활성</label>
  <label><input type="checkbox" data-k="killSwitch.chatListReplace"> 목록 치환만 비활성</label>
</div>

<h2>셀렉터 (monitor)</h2>
<div class="row">
  <div><label>chatListSelector.css</label><input type="text" data-k="monitor.chatListSelector.css"></div>
  <div><label>chatMessageSelector.css</label><input type="text" data-k="monitor.chatMessageSelector.css"></div>
  <div><label>popupContainerSelector.css</label><input type="text" data-k="monitor.popupContainerSelector.css"></div>
  <div><label>chatInputSelector.css</label><input type="text" data-k="monitor.chatInputSelector.css"></div>
  <div><label>vodChatListSelector.css</label><input type="text" data-k="monitor.vodChatListSelector.css"></div>
  <div><label>vodChatMessageSelector.css</label><input type="text" data-k="monitor.vodChatMessageSelector.css"></div>
  <div><label>vodStreamerIdLinkSelector.css</label><input type="text" data-k="monitor.vodStreamerIdLinkSelector.css"></div>
  <div><label>monitorElementStrategy</label>
    <select data-k="monitor.monitorElementStrategy"><option value="mutation">mutation</option><option value="polling">polling</option></select>
  </div>
</div>

<h2>입력 바인딩 (chatInput)</h2>
<div class="row">
  <div><label>bindingStrategy</label>
    <select data-k="chatInput.bindingStrategy"><option value="delegation">delegation (권장)</option><option value="direct">direct (구버전)</option></select>
  </div>
  <div><label>directInputSelector.css</label><input type="text" data-k="chatInput.directInputSelector.css"></div>
</div>

<h2>팝업 (popup)</h2>
<label>anchorSelector.css <small>(비우면 popupContainer 사용)</small></label>
<input type="text" data-k="popup.anchorSelector.css">
<label>style <small>([data-emoticon-popup]{...} 형태의 CSS)</small></label>
<textarea data-k="popup.style" rows="3"></textarea>

<h2>configVersion</h2>
<input type="text" data-k="configVersion" placeholder="예: 2026-06-23.1">

<details open>
  <summary>raw JSON (고급)</summary>
  <small>폼과 양방향 동기화됩니다. 폼에 없는 필드는 여기서 직접 편집하세요.</small>
  <textarea id="raw" rows="16" spellcheck="false"></textarea>
</details>

<script>
const CONFIG_URL = location.origin + '/';
const $ = (s) => document.querySelector(s);
const status = (msg, ok) => { const e = $('#status'); e.textContent = msg; e.className = ok === undefined ? '' : (ok ? 'ok' : 'err'); };
const fields = () => [...document.querySelectorAll('[data-k]')];

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split('.'); let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (typeof o[keys[i]] !== 'object' || o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = val;
}

function formFromJson() {
  let cfg; try { cfg = JSON.parse($('#raw').value); } catch { return; }
  for (const el of fields()) {
    const v = getPath(cfg, el.dataset.k);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v == null ? '' : String(v);
  }
}
function jsonFromForm() {
  let cfg; try { cfg = JSON.parse($('#raw').value); } catch { cfg = {}; }
  for (const el of fields()) {
    const k = el.dataset.k;
    if (el.type === 'checkbox') { setPath(cfg, k, el.checked); continue; }
    let v = el.value.trim();
    if (v === '') {
      // 빈 css/style/anchor는 의미가 다름: anchorSelector는 null, 그 외 빈 문자열은 제거하지 않고 빈값 유지
      if (k === 'popup.anchorSelector.css') { setPath(cfg, 'popup.anchorSelector', null); continue; }
      if (k === 'popup.style') { setPath(cfg, 'popup.style', null); continue; }
    }
    setPath(cfg, k, v);
  }
  if (typeof cfg.schemaVersion !== 'number') cfg.schemaVersion = 1;
  $('#raw').value = JSON.stringify(cfg, null, 2);
}

fields().forEach(el => el.addEventListener('change', jsonFromForm));
$('#raw').addEventListener('change', formFromJson);

async function load() {
  status('불러오는 중...');
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-store' });
    const text = await res.text();
    $('#raw').value = JSON.stringify(JSON.parse(text), null, 2);
    formFromJson();
    status('불러옴 (ETag ' + (res.headers.get('ETag') || '?') + ')', true);
  } catch (e) { status('불러오기 실패: ' + e.message, false); }
}

async function save() {
  jsonFromForm();
  let body; try { body = JSON.parse($('#raw').value); } catch (e) { status('JSON 파싱 오류: ' + e.message, false); return; }
  const token = $('#token').value.trim();
  if (!token) { status('관리 토큰을 입력하세요.', false); return; }
  status('저장 중...');
  try {
    const res = await fetch(CONFIG_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) status('저장 완료 (ETag ' + (data.etag || '?') + ')', true);
    else status('저장 실패: ' + (data.error || res.status), false);
  } catch (e) { status('저장 실패: ' + e.message, false); }
}

$('#load').addEventListener('click', load);
$('#save').addEventListener('click', save);
load();
</script>
</body>
</html>`;
