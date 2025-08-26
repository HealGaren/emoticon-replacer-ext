import {getElementBySelector} from "@/entrypoints/content/dom-selectors.ts";
import {ElementSelector, MonitorElementOptions} from "@/entrypoints/content/types.ts";

export function monitorElementWithMutation<T extends HTMLElement>(
    rootNode: ParentNode,
    selector: ElementSelector,
    options: MonitorElementOptions
): () => void {
    let currentElement: T | null = null;
    let observer: MutationObserver | null = null;

    const syncWithCurrentMatch = () => {
        const candidate = getElementBySelector<T>(rootNode, selector);

        if (candidate && currentElement !== candidate) {
            if (currentElement) {
                options.onDestroy();
            }
            currentElement = candidate;
            options.onInit(candidate);
        } else if (!candidate && currentElement) {
            currentElement = null;
            options.onDestroy();
        }
    };

    const startObserver = () => {
        if (observer) observer.disconnect();

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 자식 추가/제거 시 전체를 다시 평가하여 실제 매치된 요소를 찾는다.
                    syncWithCurrentMatch();
                }
            }
        });

        observer.observe(rootNode, {
            childList: true,
            subtree: true,
        });
    };

    const cleanup = () => {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (currentElement) {
            currentElement = null;
            options.onDestroy();
        }
    };

    // 초기화 및 감시 시작
    syncWithCurrentMatch();
    startObserver();

    return cleanup;
}
