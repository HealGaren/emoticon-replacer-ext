import {isValidRemoteConfig, RemoteConfig} from "@/entrypoints/content/remote-config/schema.ts";

// Cloudflare Worker URL (remote config 호스팅).
export const REMOTE_CONFIG_URL = 'https://emoticon-replacer-config.healgaren.workers.dev/';

const STORAGE_KEY = 'remoteConfig';
const ETAG_KEY = 'remoteConfigETag';

// 서버가 응답하지 않을 때 초기화가 멈추지 않도록 fetch에 타임아웃을 건다.
// 타임아웃/에러 시 캐시 → 빌드 내장 기본값(config.ts) 순으로 폴백한다.
const FETCH_TIMEOUT_MS = 3000;

interface CacheEntry {
    etag: string | null;
    config: RemoteConfig;
}

async function readCache(): Promise<CacheEntry | null> {
    try {
        const result = await browser.storage.local.get([STORAGE_KEY, ETAG_KEY]);
        const config = result[STORAGE_KEY];
        if (isValidRemoteConfig(config)) {
            return {etag: (result[ETAG_KEY] as string | undefined) ?? null, config};
        }
    } catch (e) {
        console.warn('emoticon- remote config 캐시 읽기 실패', e);
    }
    return null;
}

async function writeCache(etag: string | null, config: RemoteConfig): Promise<void> {
    try {
        await browser.storage.local.set({[STORAGE_KEY]: config, [ETAG_KEY]: etag});
    } catch (e) {
        console.warn('emoticon- remote config 캐시 저장 실패', e);
    }
}

// ETag 조건부 요청으로 remote config를 로드한다.
// 304 → 캐시 사용, 200 → 갱신, 실패/스키마불일치 → 캐시 또는 null(=내장 기본값 사용).
// 브라우저 HTTP 캐시(cache:'no-store')는 끄고 ETag는 storage로 직접 관리한다.
export async function loadRemoteConfig(): Promise<RemoteConfig | null> {
    const cache = await readCache();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const headers: Record<string, string> = {};
        if (cache?.etag) {
            headers['If-None-Match'] = cache.etag;
        }
        const res = await fetch(REMOTE_CONFIG_URL, {headers, cache: 'no-store', signal: controller.signal});

        if (res.status === 304) {
            return cache?.config ?? null;
        }
        if (!res.ok) {
            console.warn('emoticon- remote config 응답 비정상', res.status);
            return cache?.config ?? null;
        }

        const json: unknown = await res.json();
        if (!isValidRemoteConfig(json)) {
            console.warn('emoticon- remote config 스키마 불일치, 기본값 사용');
            return cache?.config ?? null;
        }

        const etag = res.headers.get('ETag');
        await writeCache(etag, json);
        return json;
    } catch (e) {
        // 타임아웃(abort)/네트워크 실패/파싱 오류 모두 여기로. 캐시 또는 내장 기본값으로 폴백.
        console.warn('emoticon- remote config 요청 실패, 캐시/기본값 사용', e);
        return cache?.config ?? null;
    } finally {
        clearTimeout(timeoutId);
    }
}
