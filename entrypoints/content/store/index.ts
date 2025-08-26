import {create} from "zustand";
import {Config} from "@/entrypoints/content/config.ts";
import {devtools} from "zustand/middleware";
import {disassemble} from "es-hangul";
import {sortBy} from "lodash-es";
import * as sea from "node:sea";

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
    popupOpen: boolean;
    searchKeyword: string;
    emoticons: EmoticonItem[];
    emoticonMapByKeyword: Record<string, EmoticonItem>;
    fetchEmoticons: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useEmoticonStore = create<EmoticonPopupStore>()(
    devtools((set, get ) => ({
        popupOpen: false,
        searchKeyword: '',
        emoticons: [],
        emoticonMapByKeyword: {},
        fetchEmoticons: async () => {
            const rsRaw = await fetch(`https://open-dccon-selector.update.sh/api/convert-dccon-url?type=bridge_bbcc&url=${Config.currentStreamer.emoticonBaseURL}/lib/dccon_list.js`);
            if (rsRaw.ok) {
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
                })

                set({emoticons: emoticons, emoticonMapByKeyword});
            } else {
                console.error('Failed to fetch emoticons');
            }
        },
        initialize: async () => {
            set({
                popupOpen: false,
                searchKeyword: '',
                emoticons: []
            });
            await get().fetchEmoticons();
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