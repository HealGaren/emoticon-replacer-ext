import {ElementSelector, MonitorStrategy} from "@/entrypoints/content/types.ts";

interface MonitorConfig {
    urlPattern: string; // streamerId에 해당하는 그룹이 리턴되어야 함
    popupContainerSelector: ElementSelector;
    chatInputSelector: ElementSelector;
    monitorElementStrategy: MonitorStrategy;
    defaultPollingInterval: number;
}

interface StreamerConfig {
    emoticonBaseURL: string;
    externalSelectorSiteLink: string;
}

export const ConfigPerStreamer = {
    'ffc6c5bc935d5bb93ce1439d3a8f0fab': { // 메밀
        emoticonBaseURL: 'https://cdn.jsdelivr.net/gh/ghostree22/dccon',
            externalSelectorSiteLink: "https://rishubil.github.io/jsassist-open-dccon/#/list?dccon_list=" +
        "https%3A%2F%2Fopen-dccon-selector.update.sh%2Fapi%2Fconvert-dccon-url%3Ftype%3Dbridge_bbcc%26url%3D" +
        "https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fghostree22%2Fdccon%2Flib%2Fdccon_list.js"
    },
    '64fe980497f05040d9d21eb885b89917': { // 개발자 테스트용
        emoticonBaseURL: 'https://cdn.jsdelivr.net/gh/ghostree22/dccon',
            externalSelectorSiteLink: "https://rishubil.github.io/jsassist-open-dccon/#/list?dccon_list=" +
        "https%3A%2F%2Fopen-dccon-selector.update.sh%2Fapi%2Fconvert-dccon-url%3Ftype%3Dbridge_bbcc%26url%3D" +
        "https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fghostree22%2Fdccon%2Flib%2Fdccon_list.js"
    }
} as Record<string, StreamerConfig>;

export const Config = { // TODO: 서버 기반 데이터로 중간에 패치 가능하게
    dispatchFakeEvent: false,

    monitor: {
        urlPattern: "^\/live\/([^\/]+)",
        popupContainerSelector: {css: '[class^="live_chatting_area__"]'},
        chatInputSelector: {css: '[class^="live_chatting_input_input__"]'},
        monitorElementStrategy: 'mutation' as MonitorStrategy,
        defaultPollingInterval: 1000,
    } satisfies MonitorConfig,

    currentStreamerId: null as string | null,

    get currentStreamer() {
        if (this.currentStreamerId === null) {
            throw new Error('currentStreamerId is not set');
        }
        const streamerConfig = ConfigPerStreamer[this.currentStreamerId];
        if (!streamerConfig) {
            throw new Error(`No configuration found for streamerId: ${this.currentStreamerId}`);
        }
        return streamerConfig;
    },
};