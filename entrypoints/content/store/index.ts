import {create} from "zustand";
import {Config} from "@/entrypoints/content/config.ts";
import {devtools} from "zustand/middleware";
import {disassemble} from "es-hangul";
import {sortBy} from "lodash-es";

interface EmoticonFetchRs {
    dccons: {
        keywords: string[];
        path: string;
        tags: string[];
        hangulDisassembled: {
            // TODO: 양이 많아지면 트라이 구조로 개선 - 근데 일반적으로는 할 일 없을듯
            keywords: string[];
            tags: string[];
        }
    }[];
}

export interface EmoticonItem {
    keywords: string[];
    path: string;
    tags: string[];
    hangulDisassembled: {
        // TODO: 양이 많아지면 트라이 구조로 개선 - 근데 일반적으로는 할 일 없을듯
        keywords: string[];
        tags: string[];
    }
}

interface EmoticonPopupStore {
    initialized: boolean;
    popupOpen: boolean;
    fetchError: boolean;
    searchKeyword: string;
    emoticons: EmoticonItem[];
    emoticonMapByKeyword: Record<string, EmoticonItem>;
    fetchEmoticons: () => Promise<void>;
    initialize: (keepPopupOpen?: boolean) => Promise<void>;
}

// function wait(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

export const useEmoticonStore = create<EmoticonPopupStore>()(
    devtools((set, get ) => ({
        initialized: false,
        fetchError: false,
        popupOpen: false,
        searchKeyword: '',
        emoticons: [],
        emoticonMapByKeyword: {},
        fetchEmoticons: async () => {
            try {
                const rsRaw = await fetch(`https://open-dccon-selector.update.sh/api/convert-dccon-url?type=bridge_bbcc&url=${Config.currentStreamer.emoticonBaseURL}/lib/dccon_list.js`);
                if (!rsRaw.ok) {
                    set({fetchError: true});
                    return;
                }
                const rs = await rsRaw.json() as EmoticonFetchRs;
                const emoticons: EmoticonItem[] = rs.dccons.map(it => ({
                    ...it,
                    hangulDisassembled: {
                        keywords: it.keywords.map(it => disassemble(it)),
                        tags: it.tags.map(it => disassemble(it))
                    }
                }));
                const emoticonMapByKeyword: Record<string, EmoticonItem> = {};
                emoticons.forEach(emoticon => {
                    emoticon.keywords.forEach(keyword => emoticonMapByKeyword[keyword] = emoticon);
                });
                set({emoticons: emoticons, emoticonMapByKeyword});
            } catch (e) {
                console.error(e);
                set({fetchError: true});
            }
        },
        initialize: async (keepPopupOpen = false) => {
            set({
                fetchError: false,
                initialized: false,
                searchKeyword: '',
                emoticons: [],
                ...keepPopupOpen ? {} : {popupOpen: false},
            });
            await get().fetchEmoticons();
            set({initialized: true});
        }
    }))
);

export function toSearchedEmoticonList(emoticons: EmoticonItem[], searchKeyword: string) {
    const disassembledSearchKeyword = disassemble(searchKeyword);
    const filteredEmoticons = emoticons.filter(it => {
        if (it.hangulDisassembled.keywords.some(keyword => keyword.includes(disassembledSearchKeyword))) {
            return true;
        }
        if (it.hangulDisassembled.tags.some(tag => tag.includes(disassembledSearchKeyword))) {
            return true;
        }
        // 완성형 기준 키워드에서 빼먹은 글자는 있어도 되지만 앞뒤 순서 자체는 다 맞는 경우 검색 허용
        if (it.keywords.some(keyword => {
            const searchKeywordChars = [...searchKeyword];
            let currentPosition = 0;
            for (const char of keyword) {
                if (char === searchKeywordChars[currentPosition]) {
                    currentPosition++;
                }
                if (currentPosition === searchKeywordChars.length) {
                    return true;
                }
            }
            return false;
        })) {
            return true;
        }
        return false;
    });

    const filteredEmoticonsWithSearchScore = filteredEmoticons.map(it => {
        // TODO: 필요하면 타 기준(중간부터 일치하는 경우와 시작부터 일치하는 경우 등...) 추가
        const exactKeywordMatch = it.keywords.some(keyword => keyword === searchKeyword);
        const exactTagMatch = it.tags.some(tag => tag === searchKeyword);
        return {
            emoticon: it,
            exactKeywordMatch,
            exactTagMatch
        };
    });

    return sortBy(filteredEmoticonsWithSearchScore, it => it.exactTagMatch)
        .map(it => it.emoticon);
}

export const useSearchedEmoticonList = () => {
    const {emoticons, searchKeyword} = useEmoticonStore();
    return toSearchedEmoticonList(emoticons, searchKeyword);
}