import {ElementSelector, MonitorElementOptions, MonitorStrategy} from "@/entrypoints/content/types.ts";
import {monitorElementWithPolling} from "@/entrypoints/content/monitor/monitorElement/polling.ts";
import {monitorElementWithMutation} from "@/entrypoints/content/monitor/monitorElement/mutation.ts";

const MONITOR_ELEMENT_CONFIG = {
    strategy: 'mutation' as MonitorStrategy,
    defaultPollingInterval: 1000,
};
export function monitorElement<T extends HTMLElement>(
    rootNode: ParentNode,
    selector: ElementSelector,
    options: MonitorElementOptions
): () => void {
    switch (MONITOR_ELEMENT_CONFIG.strategy) {
        case 'polling':
            return monitorElementWithPolling<T>(
                rootNode,
                selector,
                options,
                MONITOR_ELEMENT_CONFIG.defaultPollingInterval
            );
        case 'mutation':
            return monitorElementWithMutation<T>(rootNode, selector, options);
        default:
            throw new Error(`Unsupported monitor strategy: ${MONITOR_ELEMENT_CONFIG.strategy}`);
    }
}
