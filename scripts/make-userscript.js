import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf8'));
const jsPath = resolve('./.output/chrome-mv3/content-scripts/content.js');
const cssPath = resolve('./.output/chrome-mv3/content-scripts/content.css');
const outPath = resolve(`./.output/emoticon-replacer-${pkg.version}-userscript.js`);

const jsContent = existsSync(jsPath) ? readFileSync(jsPath, 'utf8') : '';
const cssContent = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

const userscript = `// ==UserScript==
// @name         ${pkg.name}
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       HealGaren
// @match        *://*.chzzk.naver.com/*
// @grant        none
// ==/UserScript==
${jsContent}
(function() {
    var style = document.createElement("style");
    style.textContent = \`${cssContent}\`;
    document.head.appendChild(style);
}());
`;

writeFileSync(outPath, userscript, 'utf8');
console.log('userscript.js 생성 완료:', outPath);
