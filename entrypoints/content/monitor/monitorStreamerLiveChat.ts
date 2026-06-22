import {monitorURL} from "@/entrypoints/content/monitor/monitorURL.ts";
import {monitorElement} from "@/entrypoints/content/monitor/monitorElement";
import {useEmoticonStore} from "@/entrypoints/content/store";
import {Config, ConfigPerStreamer} from "@/entrypoints/content/config.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";
import {registerChatInputEmoticonPopup} from "@/entrypoints/content/registerChatInputEmoticon.ts";
import {registerChatListEmoticonReplacer} from "@/entrypoints/content/registerChatListEmoticonReplacer.ts";
import {loadRemoteConfig} from "@/entrypoints/content/remote-config/loader.ts";
import {applyRemoteConfig} from "@/entrypoints/content/remote-config/apply.ts";


export function monitorStreamerLiveURLAndChat(ctx: ContentScriptContext) {
    // 주의: URL 패턴은 여기서 1회만 캡처된다. 라우팅 중 패턴 변경은 다음 main 진입에만 반영된다.
    const liveURLPattern = new RegExp(Config.monitor.liveUrlPattern);
    const vodURLPattern = new RegExp(Config.monitor.vodUrlPattern);
    return monitorURL([
        {hostname: 'chzzk.naver.com', pathRegex: liveURLPattern, key: 'live'},
        {hostname: 'chzzk.naver.com', pathRegex: vodURLPattern, key: 'vod'},
    ], async (matchedPattern, matchedGroupValue) => {
        // 페이지(SPA 라우팅) 진입마다 ETag 조건부 재로드(304면 캐시 read만, 가벼움).
        // 셀렉터/팝업/killSwitch/바인딩전략은 아래 register에서 갱신된 Config로 반영된다.
        applyRemoteConfig(await loadRemoteConfig());

        if (Config.killSwitch.all) {
            return null;
        }
        if (!(matchedPattern)) {
            return null;
        }

        if (matchedPattern.key === 'live') {
            const streamerId = matchedGroupValue;
            if (!(streamerId && (streamerId in ConfigPerStreamer))) {
                console.log('unsupport streamer: ', streamerId);
                return null;
            }
            Config.currentStreamerId = streamerId;
            useEmoticonStore.getState().initialize();

            const cleanupMonitorPopupContainer = monitorElement(
                document,
                Config.monitor.popupContainerSelector,
                {
                    onInit: popupContainer => {
                        console.log('emoticon- Popup container initialized');
                        if (Config.killSwitch.chatInput) {
                            return null;
                        }
                        return registerChatInputEmoticonPopup(ctx, popupContainer);
                    },
                    onDestroy: () => {
                        console.log('emoticon- Popup container removed');
                    }
                }
            );

            const cleanupMonitorChatList = monitorElement(
                document,
                Config.monitor.chatListSelector,
                {
                    onInit: (chatList) => {
                        if (Config.killSwitch.chatListReplace) {
                            return null;
                        }
                        return registerChatListEmoticonReplacer(chatList, Config.monitor.chatMessageSelector);
                    },
                    onDestroy: () => {
                    }
                }
            )

            return () => {
                cleanupMonitorPopupContainer();
                cleanupMonitorChatList();
                Config.currentStreamerId = null;
            }
        }

        if (matchedPattern.key === 'vod') {
            // VOD는 streamerId를 링크에서 다시 추출해야 함

            const cleanupMonitorStreamerIdLink = monitorElement(
                document,
                Config.monitor.vodStreamerIdLinkSelector,
                {
                    onInit: (linkElement) => {
                        const regex = new RegExp(Config.monitor.vodStreamerIdPattern);

                        const href = (linkElement as HTMLAnchorElement).href;
                        const matched = href.match(regex);
                        const streamerId = matched?.[1] ?? null;
                        Config.currentStreamerId = streamerId;
                        useEmoticonStore.getState().initialize();

                        if (Config.killSwitch.chatListReplace) {
                            return null;
                        }

                        return monitorElement(
                            document,
                            Config.monitor.vodChatListSelector,
                            {
                                onInit: (chatList) => {
                                    return registerChatListEmoticonReplacer(chatList, Config.monitor.vodChatMessageSelector);
                                },
                                onDestroy: () => {
                                }
                            }
                        )
                    },
                    onDestroy: () => {
                        Config.currentStreamerId = null;
                    }
                }
            );

            return () => {
                cleanupMonitorStreamerIdLink();
            }
        }

        return null;
    });
}
