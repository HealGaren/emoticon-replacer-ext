import {monitorStreamerLiveURLAndChat} from "@/entrypoints/content/monitor/monitorStreamerLiveChat.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";

export default defineContentScript({
    matches: ['*://*.chzzk.naver.com/*'],
    allFrames: true,
    main(ctx: ContentScriptContext) {
        const stopMonitoring = monitorStreamerLiveURLAndChat(ctx);
    },
});
