import style from './EmoticonListPopup.module.css';
import {useEmoticonPopupStore} from "@/entrypoints/content/store";

export const EmoticonListPopup = () => {
    const store = useEmoticonPopupStore();

    if (!store.popupOpen) {
        return null;
    }

    return (
        <div className={style.emoticonListPopup} data-preventbluremoticonpopup>{store.emoticonKeyword}</div>
    );
}