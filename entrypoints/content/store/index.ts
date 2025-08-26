import {create} from "zustand";

export const useEmoticonPopupStore = create((set ) => ({
    popupOpen: false,
    emoticonKeyword: ''
}));
