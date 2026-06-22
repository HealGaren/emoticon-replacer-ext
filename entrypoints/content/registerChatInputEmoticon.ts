import {ContentScriptContext} from "wxt/utils/content-script-context";
import {Config} from "@/entrypoints/content/config.ts";
import {toSearchedEmoticonList, useEmoticonStore} from "@/entrypoints/content/store";
import {attachReactPopup} from "@/entrypoints/content/popup/attachReactPopup.tsx";
import {resolveBindingStrategy} from "@/entrypoints/content/chat-input/bindingStrategies.ts";
import {getElementBySelector} from "@/entrypoints/content/dom-selectors.ts";

// 2026-06 치지직 개편: 채팅 입력칸은 평소 <textarea>지만, 포커스/입력 시 contenteditable <pre>로 교체된다.
// 입력 처리는 contenteditable 기준(Selection/anchorNode)으로 동작하고,
// 리스너 바인딩 방식(delegation/direct)은 Config.chatInput.bindingStrategy(remote config)로 선택한다.
export function registerChatInputEmoticonPopup(ctx: ContentScriptContext, popupContainer: HTMLElement) {

    // 팝업이 뜰 기준 요소. Config.popup.anchorSelector가 있으면 그것을, 없으면 popupContainer를 사용한다.
    const anchor: HTMLElement = (() => {
        const sel = Config.popup.anchorSelector;
        if (sel) {
            const el = getElementBySelector<HTMLElement>(document, sel);
            if (el) return el;
        }
        return popupContainer;
    })();

    // 팝업(.emoticonListPopup)은 position:absolute; bottom:100% 로 anchor 바로 위에 뜬다.
    // anchor가 static이면 offsetParent가 상위로 올라가 위치가 어긋나므로 positioning 기준을 보장한다.
    if (getComputedStyle(anchor).position === 'static') {
        anchor.style.position = 'relative';
    }

    let lastStartPos: number | null = null;
    let lastEndPos: number | null = null;
    let lastSelectionTextNode: Node | null = null;

    // 현재 활성 입력 요소(contenteditable). 포커스/리렌더로 노드가 바뀌므로 매번 조회한다.
    const getInputElement = (): HTMLElement | null => {
        const candidates = popupContainer.querySelectorAll<HTMLElement>('[contenteditable]');
        for (const el of candidates) {
            if (el.isContentEditable) {
                return el;
            }
        }
        return null;
    };

    const hidePopup = () => {
        useEmoticonStore.setState({popupOpen: false});
        lastStartPos = null;
        lastEndPos = null;
        lastSelectionTextNode = null;
    };

    const showPopup = (content: string) => {
        useEmoticonStore.setState({popupOpen: true, searchKeyword: content.slice(1)});
    }

    const updatePopup = (content: string) => {
        useEmoticonStore.setState({searchKeyword: content.slice(1)});
    }

    const checkTildes = (e: Event) => {
        const inputElement = getInputElement();
        const selection = window.getSelection();

        if (!inputElement || !selection || selection.type !== 'Caret' || !selection.anchorNode
            || document.activeElement !== inputElement || !inputElement.contains(selection.anchorNode)) {
            hidePopup();
            return;
        }

        if (selection.anchorNode.nodeType !== Node.TEXT_NODE) {
            hidePopup();
            return;
        }

        const text = selection.anchorNode.textContent || '';
        const cursorPos = selection.anchorOffset;

        let startPos = cursorPos;
        let endPos = cursorPos;

        // Search backwards for start position
        while (startPos > 0) {
            const char = text[startPos - 1];
            if (char === '~') {
                startPos--;
                break;
            }
            if (/\s/.test(char)) {
                break;
            }
            startPos--;
        }

        // Search forwards for end position
        while (endPos < text.length) {
            const char = text[endPos];
            if (char === '~' || /\s/.test(char)) {
                break;
            }
            endPos++;
        }

        const currentWord = text.slice(startPos, endPos);

        // Only show popup when ~ is directly typed
        if (e instanceof InputEvent && e.inputType === 'insertText' && e.data === '~') {
            showPopup(currentWord);
            lastStartPos = startPos;
        } else if (!currentWord.startsWith('~') || /\s/.test(e instanceof InputEvent ? e.data || '' : '') || lastStartPos !== startPos) {
            hidePopup();
            lastStartPos = null;
            lastEndPos = null;
            lastSelectionTextNode = null;
            updatePopup('');
            return;
        }

        lastEndPos = endPos;
        lastSelectionTextNode = selection.anchorNode;
        updatePopup(currentWord);
    };

    const replaceEmoticonText = (emoticon: any) => {
        if (lastSelectionTextNode && lastStartPos !== null && lastEndPos !== null && emoticon) {
            const text = lastSelectionTextNode.textContent || '';
            const newText = text.substring(0, lastStartPos) + '~' + emoticon.keywords[0] + text.substring(lastEndPos);
            lastSelectionTextNode.textContent = newText;

            const range = document.createRange();
            const newCursorPosition = lastStartPos + emoticon.keywords[0].length + 1;
            range.setStart(lastSelectionTextNode, newCursorPosition);
            range.setEnd(lastSelectionTextNode, newCursorPosition);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }

            hidePopup();

            if (Config.dispatchFakeEvent) {
                const inputElement = getInputElement();
                const fakeInputEvent = new Event("input", {bubbles: true});
                (inputElement ?? (lastSelectionTextNode.parentElement as HTMLElement | null))?.dispatchEvent(fakeInputEvent);
            }
        }
    }

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            hidePopup();
            return;
        }
        if (e.key === 'Tab' && useEmoticonStore.getState().popupOpen && lastSelectionTextNode && lastStartPos !== null && lastEndPos !== null) {
            e.preventDefault();

            const {emoticons, searchKeyword} = useEmoticonStore.getState();
            const searchedEmoticons = toSearchedEmoticonList(emoticons, searchKeyword);
            replaceEmoticonText(searchedEmoticons[0]);
            return;
        }
    }

    // 바인딩 전략(delegation/direct)을 remote config로 선택
    const unbind = resolveBindingStrategy().bind(popupContainer, {
        input: checkTildes,
        click: checkTildes,
        keyup: checkTildes,
        keydown: handleKeydown,
    });

    const documentClickHandler = (e: MouseEvent) => {
        const inputElement = getInputElement();
        const hasPreventBlurParent = (() => {
            let target: HTMLElement | null = e.target as HTMLElement;
            while (target) {
                if (target.hasAttribute && target.hasAttribute('data-preventbluremoticonpopup')) {
                    return true;
                }
                target = target.parentElement;
            }
            return false;
        });
        if ((!inputElement || !inputElement.contains(e.target as Node)) && !hasPreventBlurParent()) {
            hidePopup();
        }
    };

    document.addEventListener('click', documentClickHandler);

    const reactPopupCleanup = attachReactPopup(ctx, anchor, {
        onItemClick: emoticon => {
            replaceEmoticonText(emoticon);
        }
    });
    return () => {
        unbind();
        document.removeEventListener('click', documentClickHandler);
        reactPopupCleanup();
    }
}
