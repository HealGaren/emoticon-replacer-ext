import {ElementSelector, MonitorElementOptions} from "@/entrypoints/content/types.ts";
import {getElementBySelector} from "@/entrypoints/content/dom-selectors.ts";

export function monitorElementWithPolling<T extends HTMLElement>(
    rootNode: ParentNode,
    selector: ElementSelector,
    options: MonitorElementOptions,
    defaultPollingInterval: number
): () => void {
    let currentElement: T | null = null;
    let pollingId: number | null = null;

    const interval = options.pollingInterval ?? defaultPollingInterval;

    let prevCleanup: (() => void) | null = null;

    const tick = () => {
        const element = getElementBySelector<T>(rootNode, selector);

        if (element && !currentElement) {
            currentElement = element;
            prevCleanup?.(); // TODO: 기존 element가 없다면 불가능한 상황 같은데? 체크해봐야 함
            prevCleanup = options.onInit(element);
        } else if (!element && currentElement) {
            prevCleanup?.();
            prevCleanup = null;
            currentElement = null;
            options.onDestroy();
        }
    };

    const start = () => {
        if (pollingId) clearInterval(pollingId);
        pollingId = window.setInterval(tick, interval);
    };

    const cleanup = () => {
        if (prevCleanup) {
            prevCleanup?.();
            prevCleanup = null;
        }
        if (pollingId) {
            clearInterval(pollingId);
            pollingId = null;
        }
        if (currentElement) {
            currentElement = null;
            options.onDestroy();
        }
    };

    // 초기 체크 및 폴링 시작
    tick();
    start();

    return cleanup;
}
