import {monitorStreamerLiveURLAndChat} from "@/entrypoints/content/monitor/monitorStreamerLiveChat.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";
import {loadRemoteConfig} from "@/entrypoints/content/remote-config/loader.ts";
import {applyRemoteConfig} from "@/entrypoints/content/remote-config/apply.ts";
import {Config} from "@/entrypoints/content/config.ts";

export default defineContentScript({
    matches: ['*://*.chzzk.naver.com/*'],
    allFrames: true,
    async main(ctx: ContentScriptContext) {
        // remote config를 먼저 로드/적용한다. 캐시 우선이라 보통 빠르고,
        // 실패 시 null → 빌드 내장 기본값으로 즉시 진행한다(핫픽스 안전망).
        applyRemoteConfig(await loadRemoteConfig());

        if (Config.killSwitch.all) {
            console.log('emoticon- kill switch(all) 활성 — 동작하지 않습니다.');
            return;
        }

        const stopMonitoring = monitorStreamerLiveURLAndChat(ctx);
        ctx.onInvalidated(() => stopMonitoring());
    },
});
