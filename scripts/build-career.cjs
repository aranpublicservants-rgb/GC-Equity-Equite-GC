'use strict';
const fs=require('node:fs'),path=require('node:path');
const C=require('../career-development/content.js'),V=require('../career-development/view.js');
const state={lang:'en',large:false,contrast:false,guide:{goal:null,status:'employee'},routeFilter:'all',routeView:'cards',search:'',topic:'all',savedOnly:false,showAll:true,saved:[],saveWork:false,evidence:{},template:{kind:'learning',topic:'',context:'',ask:''},plan:{goal:'',start:'2026-11-20',review:'2027-02-18',notes:'',actions:[]}};
const base='https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/career-development/';
for(const lang of ['en','fr']){
 state.lang=lang;
 const url=base+(lang==='fr'?'index-fr.html':'');
 const description=V.esc(C.ui.heroBody[lang]);
 const nojs=lang==='fr'?'Consultez les directives et les ressources ci-dessous. Activez JavaScript pour utiliser les outils guidés et le plan personnel.':'Read the guidance and follow the resource links below. Enable JavaScript to use the guided tools and personal planner.';
 const html=`<!doctype html>
<html lang="${lang}" class="no-js"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>${C.ui.title[lang]}</title>
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${base}">
<link rel="alternate" hreflang="fr" href="${base}index-fr.html">
<meta property="og:title" content="${C.ui.title[lang]}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#102938">
<link rel="icon" type="image/svg+xml" href="icon.svg">
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="tools.css">
<script src="content.js" defer></script>
<script src="sources.js" defer></script>
<script src="model.js" defer></script>
<script src="view.js" defer></script>
<script src="app.js" defer></script>
<script src="vendor/jszip.min.js" defer></script>
<script src="tools-model.js" defer></script>
<script src="tools.js" defer></script>
</head><body id="top">
<noscript><div class="container note">${nojs}</div></noscript>
<div id="app">${V.page(state)}</div>
</body></html>
`;
 fs.writeFileSync(path.join(__dirname,'../career-development',lang==='fr'?'index-fr.html':'index.html'),html);
}
console.log('Built both career pages with pre-rendered guidance and 26 bilingual source records.');
