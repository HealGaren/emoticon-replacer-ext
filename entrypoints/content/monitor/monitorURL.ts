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

export function monitorURL(patterns: URLPattern[], callback: (matchedPattern: URLPattern | null, streamerId: string | null) => (() => void) | null) {
    function handleURLChange() {
        let matchedResult: RegExpMatchArray | null = null;
        let matchedPattern: URLPattern | null = null;

        for (const pattern of patterns) {
            const currentMatchResult = window.location.pathname.match(pattern.regex);
            if (currentMatchResult) {
                matchedPattern = pattern;
                matchedResult = currentMatchResult;
                break;
            }
        }
        const nextCleanup = callback(matchedPattern, matchedResult?.[1] ?? null);
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