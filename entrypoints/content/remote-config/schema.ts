import {ElementSelector, MonitorStrategy} from "@/entrypoints/content/types.ts";
import {BindingStrategy, StreamerConfig} from "@/entrypoints/content/config.ts";

// 클라이언트가 이해하는 스키마 버전. Worker가 보내는 schemaVersion과 다르면 폴백(내장 기본값).
export const SUPPORTED_SCHEMA_VERSION = 1;

export interface RemoteKillSwitch {
    all?: boolean;
    chatInput?: boolean;
    chatListReplace?: boolean;
}

export interface RemoteMonitor {
    liveUrlPattern?: string;
    vodUrlPattern?: string;
    chatListSelector?: ElementSelector;
    chatMessageSelector?: ElementSelector;
    vodChatListSelector?: ElementSelector;
    vodChatMessageSelector?: ElementSelector;
    vodStreamerIdLinkSelector?: ElementSelector;
    vodStreamerIdPattern?: string;
    popupContainerSelector?: ElementSelector;
    chatInputSelector?: ElementSelector;
    monitorElementStrategy?: MonitorStrategy;
    defaultPollingInterval?: number;
}

export interface RemoteChatInput {
    bindingStrategy?: BindingStrategy;
    dispatchFakeEvent?: boolean;
    directInputSelector?: ElementSelector;
}

export interface RemotePopup {
    anchorSelector?: ElementSelector | null;
    style?: string | null;
}

// 모든 필드 optional. 없는 필드는 빌드 내장 기본값(config.ts) 유지.
export interface RemoteConfig {
    schemaVersion: number;
    configVersion?: string; // 로깅/디버깅용
    killSwitch?: RemoteKillSwitch;
    monitor?: RemoteMonitor;
    replace?: { appendBreakLine?: boolean };
    chatInput?: RemoteChatInput;
    popup?: RemotePopup;
    configPerStreamer?: Record<string, Partial<StreamerConfig>>;
}

export function isValidRemoteConfig(json: unknown): json is RemoteConfig {
    return (
        !!json &&
        typeof json === 'object' &&
        (json as RemoteConfig).schemaVersion === SUPPORTED_SCHEMA_VERSION
    );
}
