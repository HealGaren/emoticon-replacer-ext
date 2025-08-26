import {getElementBySelector} from "@/entrypoints/content/dom-selectors.ts";
import {EmoticonItem, useEmoticonStore} from "@/entrypoints/content/store";
import style from "./replacedEmoticon.module.css";
import {ElementSelector} from "@/entrypoints/content/types.ts";
import {Config} from "@/entrypoints/content/config.ts";

export function registerChatListEmoticonReplacer(chatList: HTMLElement, chatMessageSelector: ElementSelector) {

    function appendEmoticonBeforeNode(keyword: string, emoticon: EmoticonItem, textNode: Node) {
        const div = document.createElement('div');
        div.className = style.emoticonWrap;


        const img = document.createElement('img');
        img.className = style.replacedEmoticon;
        img.src = emoticon.path;
        img.alt = keyword;
        div.appendChild(img);

        const descriptionContainer = document.createElement('div');
        descriptionContainer.className = style.description;
        div.appendChild(descriptionContainer);

        const keywordSpanWrap = document.createElement('div');
        descriptionContainer.appendChild(keywordSpanWrap);

        const keywordSpan = document.createElement('span');
        keywordSpan.textContent = '~' + keyword;
        keywordSpanWrap.appendChild(keywordSpan);


        const guideWrap = document.createElement('div');
        guideWrap.className = style.guide;
        descriptionContainer.appendChild(guideWrap);

        const guide = document.createElement('span');
        guide.textContent = '클릭해서 복사';
        guideWrap.appendChild(guide);


        div.addEventListener('click', () => {
            window.navigator.clipboard.writeText('~' + keyword);
            guide.textContent = '복사되었습니다.';
            guideWrap.classList.add(style.copied);
            setTimeout(() => {
                if (document.contains(guide)) {
                    guide.textContent = '클릭해서 복사';
                    guideWrap.classList.remove(style.copied);
                }
            }, 1000);
        });

        textNode.parentNode?.insertBefore(div, textNode);
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