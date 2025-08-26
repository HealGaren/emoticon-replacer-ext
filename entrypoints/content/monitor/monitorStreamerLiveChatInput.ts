import {monitorURL} from "@/entrypoints/content/monitor/monitorURL.ts";
import {monitorElement} from "@/entrypoints/content/monitor/monitorElement";
import {ElementSelector} from "@/entrypoints/content/types.ts";
import {attachReactPopup} from "@/entrypoints/content/popup/attachReactPopup.tsx";
import {useEmoticonPopupStore} from "@/entrypoints/content/store";

interface MonitorConfig {
    urlPattern: string; // streamerId에 해당하는 그룹이 리턴되어야 함
    popupContainerSelector: ElementSelector;
    chatInputSelector: ElementSelector;
}

const config: MonitorConfig = {
    urlPattern: "^\/live\/([^\/]+)",
    popupContainerSelector: { css: '[class^="live_chatting_area__"]' },
    chatInputSelector: { css: '[class^="live_chatting_input_input__"]' },
}

function registerChatInputEmoticonPopup(ctx: ContentScriptUi, popupContainer: HTMLElement, chatInput: HTMLElement) {
    console.log('Chat input found:', chatInput);

    attachReactPopup(ctx, popupContainer);

    const hidePopup = () => {
        if (!useEmoticonPopupStore.getState().popupOpen) {
            console.warn('이미 팝업이 닫혀있습니다.')
            return;
        }
        useEmoticonPopupStore.setState({popupOpen: false});
    };

    const showPopup = (content: string) => {
        if (useEmoticonPopupStore.getState().popupOpen) {
            console.warn('이미 팝업이 열려있습니다.')
            return;
        }
        useEmoticonPopupStore.setState({popupOpen: true, emoticonKeyword: content});
    }

    const updatePopup = (content: string) => {
        useEmoticonPopupStore.setState({emoticonKeyword: content});
    }

    const checkTildes = (e: Event | MutationRecord[]) => {
        // ESC key press handler
        if (e instanceof KeyboardEvent && e.key === 'Escape') {
            hidePopup();
            return;
        }

        const selection = window.getSelection();
        console.log('relatedTarget:', (e instanceof FocusEvent) && e.relatedTarget)

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
        } else if (!currentWord.startsWith('~') || /\s/.test(e instanceof InputEvent ? e.data || '' : '')) {
            hidePopup();
        }


        updatePopup(currentWord);
    };

    chatInput.addEventListener('input', checkTildes);
    chatInput.addEventListener('click', checkTildes);
    chatInput.addEventListener('keyup', checkTildes);

    document.addEventListener('click', (e) => {
        const hasPreventBlurParent = (() => {
            let target: HTMLElement | null = e.target as HTMLElement;
            while (target) {
                if (target.hasAttribute('data-preventbluremoticonpopup')) {
                    return true;
                }
                target = target.parentElement;
            }
            return false;
        })();
        
        if (!chatInput.contains(e.target as Node) && !hasPreventBlurParent) {
            hidePopup();
        }
    });

    const observer = new MutationObserver(checkTildes);
    observer.observe(chatInput, {
        childList: true,
        characterData: true,
    });

    return () => observer.disconnect();
}

export function monitorStreamerLiveURLAndChatInput(ctx: ContentScriptUi) {
    const liveURLPattern = new RegExp(config.urlPattern);
    return monitorURL(liveURLPattern, (streamerId) => {
        if (streamerId) {
            console.log(`Initializing for streamer: ${streamerId}`);
            return monitorElement(
                document,
                config.popupContainerSelector,
                {
                    onInit: popupContainer => {
                        return monitorElement(
                            document,
                            config.chatInputSelector,
                            {
                                onInit: chatInput => {
                                    registerChatInputEmoticonPopup(ctx, popupContainer, chatInput);
                                },
                                onDestroy: () => {
                                    console.log('Chat input removed');
                                }
                            }
                        )
                    },
                    onDestroy: () => {
                        console.log('Popup container removed');
                    }
                }
            );
        }
        return null;
    });
}
