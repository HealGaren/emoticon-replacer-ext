import {monitorStreamerLiveURLAndChatInput} from "@/entrypoints/content/monitor/monitorStreamerLiveChatInput.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";
import {useEmoticonPopupStore} from "@/entrypoints/content/store";


export default defineContentScript({
    matches: ['*://*.chzzk.naver.com/*'],
    main(ctx: ContentScriptContext) {
        console.log('Content script loaded');
        useEmoticonPopupStore.getState().fetchEmoticons();
        const stopMonitoring = monitorStreamerLiveURLAndChatInput(ctx);
    },
});