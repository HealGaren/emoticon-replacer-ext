import {getElementBySelector} from "@/entrypoints/content/dom-selectors.ts";
import {EmoticonItem, useEmoticonStore} from "@/entrypoints/content/store";
import style from "./replacedEmoticon.module.css";
import {ElementSelector} from "@/entrypoints/content/types.ts";
import {Config} from "@/entrypoints/content/config.ts";

export function registerChatListEmoticonReplacer(chatList: HTMLElement, chatMessageSelector: ElementSelector) {

    function appendEmoticonBeforeNode(keyword: string, emoticon: EmoticonItem, textNode: Node) {
        const img = document.createElement('img');
        img.src = emoticon.path;
        img.alt = keyword;
        img.className = style.replacedEmoticon;
        textNode.parentNode?.insertBefore(img, textNode);
    }

    function appendBreakLineBeforeNode(textNode: Node) {
        const breakLine = document.createElement('br');
        textNode.parentNode?.insertBefore(breakLine, textNode);
    }

    function onChatTextAdded(textNode: Node) {
        const emoticonMapByKeyword = useEmoticonStore.getState().emoticonMapByKeyword;

        const match = textNode.textContent?.match(/^~([^~\s]+)(?:~([^~\s]+))?$/);
        if (!match) return;

        const [full, keyword1, keyword2] = match;
        const emoticon1 = emoticonMapByKeyword[keyword1];
        const emoticon2 = keyword2 ? emoticonMapByKeyword[keyword2] : null;

        if (keyword1 && !emoticon1 || keyword2 && !emoticon2) {
            console.log('No Emoticon found for keyword: ', keyword1, keyword2);
            return;
        }

        if (Config.replace.appendBreakLine && emoticon1 || emoticon2) {
            appendBreakLineBeforeNode(textNode);
        }

        if (emoticon1) {
            appendEmoticonBeforeNode(keyword1, emoticon1, textNode);
        }
        if (emoticon2) {
            appendEmoticonBeforeNode(keyword2, emoticon2, textNode);
        }

        textNode.textContent = '';
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof Element) {
                    const message = getElementBySelector(node, chatMessageSelector);
                    if (message === null) {
                        return;
                    }
                    if (message.childNodes.length === 1 && message.childNodes[0].nodeType === Node.TEXT_NODE) {
                        onChatTextAdded(message.childNodes[0]);
                    }
                }
            });
        });
    });

    observer.observe(chatList, {childList: true, subtree: true});

    return () => {
        observer.disconnect();
    }
}