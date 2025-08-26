import {ElementSelector, MonitorStrategy} from "@/entrypoints/content/types.ts";

interface MonitorConfig {
    urlPattern: string; // streamerId에 해당하는 그룹이 리턴되어야 함
    popupContainerSelector: ElementSelector;
    chatInputSelector: ElementSelector;
    monitorElementStrategy: MonitorStrategy;
    defaultPollingInterval: number;
}

export const Config = {
    emoticonBaseURL: 'https://cdn.jsdelivr.net/gh/ghostree22/dccon',
    monitor: {
        urlPattern: "^\/live\/([^\/]+)",
        popupContainerSelector: {css: '[class^="live_chatting_area__"]'},
        chatInputSelector: {css: '[class^="live_chatting_input_input__"]'},
        monitorElementStrategy: 'mutation' as MonitorStrategy,
        defaultPollingInterval: 1000,
    } satisfies MonitorConfig
};