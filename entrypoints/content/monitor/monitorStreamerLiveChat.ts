import {monitorURL} from "@/entrypoints/content/monitor/monitorURL.ts";
import {monitorElement} from "@/entrypoints/content/monitor/monitorElement";
import {useEmoticonStore} from "@/entrypoints/content/store";
import {Config, ConfigPerStreamer} from "@/entrypoints/content/config.ts";
import {ContentScriptContext} from "wxt/utils/content-script-context";
import {registerChatInputEmoticonPopup} from "@/entrypoints/content/registerChatInputEmoticon.ts";
import {registerChatListEmoticonReplacer} from "@/entrypoints/content/registerChatListEmoticonReplacer.ts";


export function monitorStreamerLiveURLAndChat(ctx: ContentScriptContext) {
    const liveURLPattern = new RegExp(Config.monitor.liveUrlPattern);
    const vodURLPattern = new RegExp(Config.monitor.vodUrlPattern);
    return monitorURL([
        {hostname: 'chzzk.naver.com', pathRegex: liveURLPattern, key: 'live'},
        {hostname: 'chzzk.naver.com', pathRegex: vodURLPattern, key: 'vod'},
    ], (matchedPattern, matchedGroupValue) => {
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

                        return monitorElement(
                            document,
                            Config.monitor.chatInputSelector,
                            {
                                onInit: chatInput => {
                                    return registerChatInputEmoticonPopup(ctx, popupContainer, chatInput);
                                },
                                onDestroy: () => {
                                }
                            }
                        )
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
