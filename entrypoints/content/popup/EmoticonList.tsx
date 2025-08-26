import {EmoticonItem, useSearchedEmoticonList} from "@/entrypoints/content/store";
import style from "./emoticonList.module.css";
import React from "react";
import {Config} from "@/entrypoints/content/config.ts";

const KEYWORD_LIMIT = 3;

const EmoticonItem = ({emoticon, onClick}: {emoticon: EmoticonItem, onClick: (emoticon: EmoticonItem) => void}) => {

    const handleClick = () => {
        onClick(emoticon);
    };

    return (
        <div className={style.emoticonItem} key={emoticon.path} onClick={handleClick}>
            <img className={style.image} src={emoticon.path} alt={emoticon.keywords[0]}/>
            <div className={style.description}>
                <span>{emoticon.keywords[0]}</span>
                {emoticon.keywords.slice(1, KEYWORD_LIMIT + 1).map((keyword, index) => (
                    <React.Fragment key={keyword}>
                        {index === KEYWORD_LIMIT - 1 && emoticon.keywords.length > KEYWORD_LIMIT ? (
                            <span className={style.additional}>외 {emoticon.keywords.length - KEYWORD_LIMIT}개</span>
                        ) : ( 
                            <span className={style.additional}>{keyword}</span>
                        )}
                    </React.Fragment>
                ))}
                <div className={style.tagContainer}>
                    <span className={style.tagTitle}>태그: </span>
                    <span className={style.tags}>{emoticon.tags.join(', ')}</span>
                </div>
            </div>
        </div>
    )
}

export const EmoticonList = ({onItemClick}: {onItemClick: (emoticon: EmoticonItem) => void}) => {
    const emoticonList = useSearchedEmoticonList();
    const isEmpty = emoticonList.length === 0;

    return (
        <div className={style.emoticonList + (isEmpty ? ` ${style.empty}` : '')}>
            {emoticonList.length > 0 ? emoticonList.map(it => (
                <EmoticonItem emoticon={it} key={it.keywords[0]} onClick={onItemClick}/>
            )) : (
                <>
                    <div>
                        검색 결과가 없어요 ㅜㅜ<br/>
                        <a href={Config.currentStreamer.externalSelectorSiteLink} target="_blank">여기</a>서 찾아보시거나 문의 주세요
                    </div>
                </>
            )}
        </div>
    );
}