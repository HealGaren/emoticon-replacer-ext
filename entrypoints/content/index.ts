import {monitorStreamerLiveURLAndChatInput} from "@/entrypoints/content/monitor/monitorStreamerLiveChatInput.ts";


export default defineContentScript({
    matches: ['*://*.chzzk.naver.com/*'],
    main(ctx: ContentScriptUi) {
        console.log('Content script loaded');
        const stopMonitoring = monitorStreamerLiveURLAndChatInput(ctx);
    },
});