import {ContentScriptContext} from "wxt/utils/content-script-context";
import ReactDOM from "react-dom/client";
import {EmoticonListPopup, EmoticonListPopupOptions} from "@/entrypoints/content/popup/EmoticonListPopup.tsx";

const App = ({options}: {options: EmoticonListPopupOptions}) => {
    return (
        <EmoticonListPopup options={options}/>
    );
}

export function attachReactPopup(ctx: ContentScriptContext, anchor: HTMLElement, options: EmoticonListPopupOptions) {
    const ui = createIntegratedUi(ctx, {
        position: 'inline',
        anchor,
        onMount: container => {
            const root = ReactDOM.createRoot(container);
            root.render(<App options={options}/>);
            return root;
        },
        onRemove: root => {
            root?.unmount();
        }
    });

    ui.mount();
    console.log('mounted!');

    return () => {
        ui.remove();
        console.log('removed!');
    }
}