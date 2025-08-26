import { ElementSelector } from './types';

export function isCSSSelector(selector: ElementSelector): selector is { css: string } {
    return 'css' in selector;
}

export function evaluateXPath(contextNode: Node, xpath: string): Element[] {
    const doc = contextNode.nodeType === Node.DOCUMENT_NODE
        ? (contextNode as Document)
        : (contextNode as Node).ownerDocument!;
    const result = doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const nodes: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node && node.nodeType === Node.ELEMENT_NODE) {
            nodes.push(node as Element);
        }
    }
    return nodes;
}

export function getElementBySelector<T extends Element>(rootNode: ParentNode, selector: ElementSelector): T | null {
    if (isCSSSelector(selector)) {
        return rootNode.querySelector(selector.css) as T | null;
    }
    const nodes = evaluateXPath(rootNode as unknown as Node, selector.xpath);
    const root = rootNode as unknown as Node;
    if (root.nodeType === Node.DOCUMENT_NODE) {
        return (nodes[0] as T) || null;
    }
    const target = nodes.find((n) => n === root || root.contains(n));
    return (target as T) || null;
}

export function getAllElementBySelector<T extends Element>(rootNode: ParentNode, selector: ElementSelector): T[] {
    if (isCSSSelector(selector)) {
        return Array.from(rootNode.querySelectorAll(selector.css)) as T[];
    }
    const nodes = evaluateXPath(rootNode as unknown as Node, selector.xpath);
    const root = rootNode as unknown as Node;
    if (root.nodeType === Node.DOCUMENT_NODE) {
        return nodes as T[];
    }
    return nodes.filter((n) => n === root || root.contains(n)) as T[];
}


export function elementMatchesOrContains(element: Element, selector: ElementSelector): boolean {
    if (isCSSSelector(selector)) {
        return element.matches(selector.css) || !!element.querySelector(selector.css);
    }
    const nodes = evaluateXPath(element, selector.xpath);
    return nodes.some((n) => n === element || element.contains(n));
}
