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

export function monitorURL(pattern: URLPattern, callback: (match: string | null) => (() => void) | null) {
    function handleURLChange() {
        const match = window.location.pathname.match(pattern);
        const nextCleanup = callback(match ? match[1] : null);
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