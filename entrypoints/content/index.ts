import {monitorStreamerLiveURLAndChatInput} from "@/entrypoints/content/monitor/monitorStreamerLiveChatInput.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";


export default defineContentScript({
    matches: ['*://*.chzzk.naver.com/*'],
    main(ctx: ContentScriptContext) {
        const stopMonitoring = monitorStreamerLiveURLAndChatInput(ctx);
    },
});