const STYLE_ELEMENT_ID = 'emoticon-replacer-remote-popup-style';

// remote config의 popup.style을 <style> 태그로 주입/갱신한다.
// .emoticonListPopup은 CSS Module 해시 클래스라 외부에서 못 잡으므로,
// 팝업 div의 안정 속성 [data-emoticon-popup]을 타겟으로 작성하는 것을 전제로 한다.
export function injectPopupStyle(css: string): void {
    let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!style) {
        const parent = document.head || document.documentElement;
        if (!parent) return; // 아직 DOM이 준비되지 않은 극단적 경우 방어
        style = document.createElement('style');
        style.id = STYLE_ELEMENT_ID;
        parent.appendChild(style);
    }
    if (style.textContent !== css) {
        style.textContent = css;
    }
}
