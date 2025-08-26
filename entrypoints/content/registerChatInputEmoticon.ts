import {ContentScriptContext} from "wxt/utils/content-script-context";
import {Config} from "@/entrypoints/content/config.ts";
import {toSearchedEmoticonList, useEmoticonStore} from "@/entrypoints/content/store";
import {attachReactPopup} from "@/entrypoints/content/popup/attachReactPopup.tsx";

export function registerChatInputEmoticonPopup(ctx: ContentScriptContext, popupContainer: HTMLElement, chatInput: HTMLElement) {

    let lastStartPos: number | null = null;
    let lastEndPos: number | null = null;
    let lastSelectionTextNode: Node | null = null;

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

    const checkTildes = (e: Event | MutationRecord[]) => {
        const selection = window.getSelection();

        if (!selection || selection.type !== 'Caret' || !selection.anchorNode || document.activeElement !== chatInput) {
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

    chatInput.addEventListener('input', checkTildes);
    chatInput.addEventListener('click', checkTildes);

    const replaceEmoticonText = (emoticon: any) => {
        if (lastSelectionTextNode && lastStartPos !== null && lastEndPos !== null) {
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
                const fakeInputEvent = new Event("input", {bubbles: true});
                chatInput.dispatchEvent(fakeInputEvent);
            }
        }
    }

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            hidePopup();
            return;
        }
        if (e.key === 'Tab' && lastSelectionTextNode && lastStartPos !== null && lastEndPos !== null) {
            e.preventDefault();

            const {emoticons, searchKeyword} = useEmoticonStore.getState();
            const searchedEmoticons = toSearchedEmoticonList(emoticons, searchKeyword);
            replaceEmoticonText(searchedEmoticons[0]);
            return;
        }
    }

    chatInput.addEventListener('keydown', handleKeydown);


    const documentClickHandler = (e: MouseEvent) => {
        if (!document.contains(chatInput)) {
            return;
        }
        const hasPreventBlurParent = (() => {
            let target: HTMLElement | null = e.target as HTMLElement;
            while (target) {
                if (target.hasAttribute('data-preventbluremoticonpopup')) {
                    return true;
                }
                target = target.parentElement;
            }
            return false;
        });
        if (!chatInput.contains(e.target as Node) && !hasPreventBlurParent()) {
            hidePopup();
        }
    };

    document.addEventListener('click', documentClickHandler);

    const observer = new MutationObserver(checkTildes);
    observer.observe(chatInput, {
        childList: true,
        characterData: true,
    });

    const reactPopupCleanup = attachReactPopup(ctx, popupContainer, {
        onItemClick: emoticon => {
            replaceEmoticonText(emoticon);
        }
    });
    return () => {
        observer.disconnect();
        chatInput.removeEventListener('input', checkTildes);
        chatInput.removeEventListener('click', checkTildes);
        chatInput.removeEventListener('keyup', checkTildes);
        document.removeEventListener('click', documentClickHandler);
        reactPopupCleanup();
    }
}
