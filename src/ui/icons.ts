export function icon(name:string){
 const paths:Record<string,string>={mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',sound:'<path d="M11 5 6 9H2v6h4l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',mute:'<path d="M11 5 6 9H2v6h4l5 4zM16 9l5 6M21 9l-5 6"/>',gear:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h4v6H6zM14 9h4M14 13h4M14 16h3"/>',relic:'<path d="m3 8 4-5h10l4 5-9 13zM3 8h18M7 3l5 18 5-18"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h2m2 0h2m2 0h2m2 0h2M5 12h2m2 0h2m2 0h2m2 0h2M7 16h10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.shield}</svg>`;
}
export function portrait(character:'bond'|'security'|'q'='bond'){
 const label=character==='security'?'Security guard':character==='bond'?'James Bond':'Q';
 return `<span class="character-portrait portrait-${character}" role="img" aria-label="${label}"></span>`;
}
