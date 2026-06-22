import {ElementSelector, MonitorStrategy} from "@/entrypoints/content/types.ts";

export interface MonitorConfig {
    liveUrlPattern: string; // streamerId에 해당하는 그룹이 리턴되어야 함
    vodUrlPattern: string; // 마찬가지
    chatListSelector: ElementSelector;
    chatMessageSelector: ElementSelector;
    vodChatListSelector: ElementSelector;
    vodChatMessageSelector: ElementSelector;
    vodStreamerIdLinkSelector: ElementSelector;
    vodStreamerIdPattern: string;
    popupContainerSelector: ElementSelector;
    chatInputSelector: ElementSelector;
    monitorElementStrategy: MonitorStrategy;
    defaultPollingInterval: number;
}

export interface StreamerConfig {
    emoticonBaseURL: string;
    externalSelectorSiteLink: string;
}

// 채팅 입력 자동완성에서 이벤트 리스너를 어디에 붙일지 결정하는 전략.
// 'delegation': 채팅 영역(popupContainer)에 위임 — 입력 노드(textarea↔contenteditable pre)가 교체돼도 안전(권장).
// 'direct': 입력 노드에 직접 바인딩 — 구버전 호환/fallback.
export type BindingStrategy = 'delegation' | 'direct';

export interface KillSwitchConfig {
    all: boolean;              // 확장 전체 비활성
    chatInput: boolean;        // 입력 자동완성 기능만 비활성
    chatListReplace: boolean;  // 채팅목록 치환 기능만 비활성
}

export interface ChatInputConfig {
    bindingStrategy: BindingStrategy;
    directInputSelector: ElementSelector; // direct 전략에서 리스너를 붙일 입력 노드 셀렉터
}

export interface PopupConfig {
    anchorSelector: ElementSelector | null; // 팝업이 뜰 기준 요소. null이면 popupContainer 재사용
    style: string | null;                   // .emoticonListPopup(=[data-emoticon-popup])에 주입할 CSS 문자열
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
    dispatchFakeEvent: true,
    bugReportLink: 'https://github.com/HealGaren/emoticon-replacer-ext',

    monitor: {
        liveUrlPattern: "^\/(?:iframe\/)?live\/([^\/]+)",
        vodUrlPattern: "^\/video\/([^\/]+)",
        // 2026-06 치지직 DOM 개편: 의미 기반 prefix(live_chatting_*) → CSS Module 해시 클래스(_의미_해시_번호)로 변경됨.
        // 해시는 빌드마다 바뀔 수 있어 id/role 같은 안정 앵커 우선, 불가피하면 의미부분 *=(contains) 매칭 사용.
        chatListSelector: {css: '#aside-chatting [role="log"]'},
        vodChatListSelector: {css: '[class*="_chatting_list_"]'}, // TODO: VOD 페이지 DOM으로 재검증 필요
        chatMessageSelector: {css: '[class*="_chatting_message_"] > [class*="_text_"]'},
        vodChatMessageSelector: {css: '[class*="_chatting_message_"] > [class*="_text_"]'}, // TODO: VOD 페이지 DOM으로 재검증 필요
        vodStreamerIdLinkSelector: {css: '[class*="_video_information_link_"]'}, // TODO: VOD 페이지 DOM으로 재검증 필요
        vodStreamerIdPattern: "(?:https?:\/\/[^\/]+\/|\/)?([^\/]+)\/?$", // https://chzzk.naver.com/ffc6c5bc935d5bb93ce1439d3a8f0fab 혹은 /ffc6c5bc935d5bb93ce1439d3a8f0fab 혹은 ffc6c5bc935d5bb93ce1439d3a8f0fab, 혹은 맨 뒤에 /가 하나 붙어도 모두 맨 뒷 문자열이 잘 추출되도록
        // 팝업이 입력창 바로 위(bottom:100%)에 뜨도록 채팅 입력 영역을 기준 컨테이너로 사용한다.
        // 이 영역 안에 입력 노드(textarea↔contenteditable pre)가 있어 이벤트 위임 대상으로도 적합하다.
        popupContainerSelector: {css: '#aside-chatting > [class*="_area_"]'},
        chatInputSelector: {css: '#aside-chatting textarea'},
        monitorElementStrategy: 'mutation' as MonitorStrategy,
        defaultPollingInterval: 1000,
    } as MonitorConfig,

    replace: {
        appendBreakLine: true
    },

    // 아래 3개는 remote config로 덮어쓸 수 있다. 기본값은 항상 "현재 정상 동작"과 동일해야 한다(핫픽스 안전망).
    killSwitch: {
        all: false,
        chatInput: false,
        chatListReplace: false,
    } as KillSwitchConfig,

    chatInput: {
        bindingStrategy: 'delegation',
        directInputSelector: {css: '#aside-chatting textarea, #aside-chatting [contenteditable]'},
    } as ChatInputConfig,

    popup: {
        anchorSelector: null,
        style: null,
    } as PopupConfig,

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