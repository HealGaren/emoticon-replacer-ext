import {ElementSelector, MonitorElementOptions, MonitorStrategy} from "@/entrypoints/content/types.ts";
import {monitorElementWithPolling} from "@/entrypoints/content/monitor/monitorElement/polling.ts";
import {monitorElementWithMutation} from "@/entrypoints/content/monitor/monitorElement/mutation.ts";
import {Config} from "@/entrypoints/content/config.ts";

export function monitorElement<T extends HTMLElement>(
    rootNode: ParentNode,
    selector: ElementSelector,
    options: MonitorElementOptions
): () => void {
    switch (Config.monitor.monitorElementStrategy) {
        case 'polling':
            return monitorElementWithPolling<T>(
                rootNode,
                selector,
                options,
                Config.monitor.defaultPollingInterval
            );
        case 'mutation':
            return monitorElementWithMutation<T>(rootNode, selector, options);
        default:
            throw new Error(`Unsupported monitor strategy: ${Config.monitor.monitorElementStrategy}`);
    }
}
