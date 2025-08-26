import {create} from "zustand";
import {Config} from "@/entrypoints/content/config.ts";
import {devtools} from "zustand/middleware";

interface EmoticonPopupStore {
    popupOpen: boolean;
    emoticonKeyword: string;
    emoticons: [];
    fetchEmoticons: () => Promise<void>;
}

export const useEmoticonPopupStore = create<EmoticonPopupStore>()(
    devtools((set ) => ({
        popupOpen: false,
        emoticonKeyword: '',
        emoticons: [],
        fetchEmoticons: async () => {
            const rs = await fetch(`https://open-dccon-selector.update.sh/api/convert-dccon-url?type=bridge_bbcc&url=${Config.emoticonBaseURL}/lib/dccon_list.js`);
            if (rs.ok) {
                set({emoticons: await rs.json()});
            } else {
                console.error('Failed to fetch emoticons');
            }
        }
    }))
);
