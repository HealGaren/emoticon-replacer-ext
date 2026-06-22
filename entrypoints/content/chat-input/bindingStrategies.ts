import {Config} from "@/entrypoints/content/config.ts";
import {getAllElementBySelector} from "@/entrypoints/content/dom-selectors.ts";

export interface BindHandlers {
    input: (e: Event) => void;
    click: (e: Event) => void;
    keyup: (e: Event) => void;
    keydown: (e: KeyboardEvent) => void;
}

export interface BindingStrategy {
    // popupContainer를 기준으로 핸들러를 바인딩하고, 해제 함수를 반환한다.
    bind(popupContainer: HTMLElement, handlers: BindHandlers): () => void;
}

function addAll(el: HTMLElement, h: BindHandlers) {
    el.addEventListener('input', h.input);
    el.addEventListener('click', h.click);
    el.addEventListener('keyup', h.keyup);
    el.addEventListener('keydown', h.keydown);
}

function removeAll(el: HTMLElement, h: BindHandlers) {
    el.removeEventListener('input', h.input);
    el.removeEventListener('click', h.click);
    el.removeEventListener('keyup', h.keyup);
    el.removeEventListener('keydown', h.keydown);
}

export const bindingStrategies: Record<string, BindingStrategy> = {
    // 권장 기본값. 채팅 영역(popupContainer)에 이벤트를 위임한다.
    // 입력 노드(textarea↔contenteditable pre)가 동적으로 교체돼도 끊기지 않는다.
    delegation: {
        bind(popupContainer, h) {
            addAll(popupContainer, h);
            return () => removeAll(popupContainer, h);
        },
    },

    // 구버전 호환/fallback. 입력 노드에 직접 리스너를 붙인다.
    // 치지직은 입력 노드를 교체하므로, MutationObserver로 새 입력 노드 등장 시 재바인딩하고
    // dataset.emoticonBound로 중복 바인딩을 방지한다.
    direct: {
        bind(popupContainer, h) {
            const bound = new Set<HTMLElement>();

            const bindNode = (node: HTMLElement) => {
                if (node.dataset.emoticonBound === '1') return;
                node.dataset.emoticonBound = '1';
                addAll(node, h);
                bound.add(node);
            };

            const scan = () => {
                getAllElementBySelector<HTMLElement>(popupContainer, Config.chatInput.directInputSelector)
                    .forEach(bindNode);
            };

            scan();
            const observer = new MutationObserver(scan);
            observer.observe(popupContainer, {childList: true, subtree: true});

            return () => {
                observer.disconnect();
                bound.forEach(node => {
                    removeAll(node, h);
                    delete node.dataset.emoticonBound;
                });
                bound.clear();
            };
        },
    },
};

export function resolveBindingStrategy(): BindingStrategy {
    return bindingStrategies[Config.chatInput.bindingStrategy] ?? bindingStrategies.delegation;
}
