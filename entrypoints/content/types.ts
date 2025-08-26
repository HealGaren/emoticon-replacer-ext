export type ElementSelector = { css: string } | { xpath: string };

export type MonitorStrategy = 'mutation' | 'polling';
export type URLPattern = RegExp;

export interface MonitorElementOptions {
    onInit: (element: HTMLElement) => void;
    onDestroy: () => void;
    pollingInterval?: number;
}
