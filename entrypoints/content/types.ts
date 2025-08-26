export type ElementSelector = { css: string } | { xpath: string };

export type MonitorStrategy = 'mutation' | 'polling';
export type URLPattern = {regex: RegExp, key: string};

export interface MonitorElementOptions {
    onInit: (element: HTMLElement) => (() => void) | null;
    onDestroy: () => void;
    pollingInterval?: number;
}
