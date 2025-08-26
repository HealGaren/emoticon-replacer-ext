import {ContentScriptContext} from "wxt/utils/content-script-context";
import ReactDOM from "react-dom/client";
import {EmoticonListPopup} from "@/entrypoints/content/popup/EmoticonListPopup.tsx";

const App = () => {
    return (
        <EmoticonListPopup/>
    );
}

export function attachReactPopup(ctx: ContentScriptContext, anchor: HTMLElement) {
    const ui = createIntegratedUi(ctx, {
        position: 'inline',
        anchor,
        onMount: container => {
            const root = ReactDOM.createRoot(container);
            root.render(<App />);
            return root;
        },
        onRemove: root => {
            root?.unmount();
        }
    });

    ui.mount();
}