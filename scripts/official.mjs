export function validateAnnouncements(document){
  if(document?.schemaVersion!==1||!Array.isArray(document.announcements))throw new Error('官方公告格式無效');
  for(const a of document.announcements){
    let host;try{host=new URL(a.source.url).hostname;}catch{throw new Error('官方公告來源無效');}
    if(!a.gameId?.startsWith('ss-')||a.region!=='TW'||a.confirmed!==true||!a.reason||!a.platforms?.length||a.platforms.some(p=>!['PS4','PS5'].includes(p))||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||!Number.isFinite(Date.parse(a.date))||!a.source.checkedAt||!['www.playstation.com','store.playstation.com','blog.zh-hant.playstation.com'].includes(host))throw new Error('官方公告缺少台灣地區、版本、日期或官方證據');
  }
  return document.announcements;
}
export function officialFor(entry,announcements){
  // A game-level deadline must cover all confirmed playable versions; partial announcements remain per-platform research.
  return announcements.find(a=>a.gameId===entry.gameId&&entry.platforms.every(p=>a.platforms.includes(p)))??null;
}
