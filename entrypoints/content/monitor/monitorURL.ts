import {URLPattern} from "@/entrypoints/content/types.ts";

function addURLChangeListeners(callback: () => void) {
    window.addEventListener('popstate', callback);
    window.addEventListener('pushstate', callback);
    window.addEventListener('replacestate', callback);

    return () => {
        window.removeEventListener('popstate', callback);
        window.removeEventListener('pushstate', callback);
        window.removeEventListener('replacestate', callback);
    };
}

type URLChangeCleanup = (() => void) | null;

export function monitorURL(patterns: URLPattern[], callback: (matchedPattern: URLPattern | null, streamerId: string | null) => URLChangeCleanup | Promise<URLChangeCleanup>) {
    async function handleURLChange() {
        let matchedResult: RegExpMatchArray | null = null;
        let matchedPattern: URLPattern | null = null;

        for (const pattern of patterns) {
            const hostnameMatch = window.location.hostname === pattern.hostname;
            const currentMatchResult = window.location.pathname.match(pattern.pathRegex);
            if (hostnameMatch && currentMatchResult) {
                matchedPattern = pattern;
                matchedResult = currentMatchResult;
                break;
            }
        }
        const nextCleanup = await callback(matchedPattern, matchedResult?.[1] ?? null);
        if (cleanup) cleanup();
        cleanup = nextCleanup;
    }

    let cleanup: (() => void) | null = null;

    handleURLChange();
    const removeListeners = addURLChangeListeners(handleURLChange);

    return () => {
        removeListeners();
        if (cleanup) cleanup();
    };
}