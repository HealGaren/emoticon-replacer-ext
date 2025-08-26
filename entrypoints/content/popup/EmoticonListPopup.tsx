import style from './EmoticonListPopup.module.css';
import {EmoticonItem, useEmoticonStore} from "@/entrypoints/content/store";
import {EmoticonList} from "@/entrypoints/content/popup/EmoticonList.tsx";

export interface EmoticonListPopupOptions {
    onItemClick: (emoticon: EmoticonItem) => void;
}


export const EmoticonListPopup = ({options}: {options: EmoticonListPopupOptions}) => {
    const store = useEmoticonStore();

    console.log('popup open: ', store.popupOpen);
    if (!store.popupOpen) {
        return null;
    }

    return (
        <div className={style.emoticonListPopup} data-preventbluremoticonpopup>
            <EmoticonList onItemClick={options.onItemClick}/>
        </div>
    );
}