import {Config, ConfigPerStreamer, StreamerConfig} from "@/entrypoints/content/config.ts";
import {RemoteConfig} from "@/entrypoints/content/remote-config/schema.ts";
import {injectPopupStyle} from "@/entrypoints/content/remote-config/injectStyle.ts";

// source의 undefined가 아닌 필드만 target에 in-place로 덮어쓴다.
function assignDefined<T extends object>(target: T, source: Partial<T> | undefined): void {
    if (!source) return;
    for (const key of Object.keys(source) as (keyof T)[]) {
        const value = source[key];
        if (value !== undefined) {
            target[key] = value as T[keyof T];
        }
    }
}

// remote config를 정적 Config에 in-place로 머지한다(객체 참조 유지 → 기존 import 코드 무변경).
// remote가 null이면 no-op = 빌드 내장 기본값 유지(핫픽스 안전망).
export function applyRemoteConfig(remote: RemoteConfig | null): void {
    if (!remote) return;

    assignDefined(Config.monitor, remote.monitor);
    assignDefined(Config.replace, remote.replace);
    assignDefined(Config.killSwitch, remote.killSwitch);

    if (remote.chatInput) {
        assignDefined(Config.chatInput, {
            bindingStrategy: remote.chatInput.bindingStrategy,
            directInputSelector: remote.chatInput.directInputSelector,
        });
        if (remote.chatInput.dispatchFakeEvent !== undefined) {
            Config.dispatchFakeEvent = remote.chatInput.dispatchFakeEvent;
        }
    }

    assignDefined(Config.popup, remote.popup);

    if (remote.configPerStreamer) {
        for (const [id, streamer] of Object.entries(remote.configPerStreamer)) {
            ConfigPerStreamer[id] = {...ConfigPerStreamer[id], ...streamer} as StreamerConfig;
        }
    }

    if (Config.popup.style) {
        injectPopupStyle(Config.popup.style);
    }

    if (remote.configVersion) {
        console.log('emoticon- remote config 적용됨:', remote.configVersion);
    }
}
