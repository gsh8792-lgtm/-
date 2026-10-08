// 스프라이트 시트 미리보기: node tools/sprite_sheet.mjs out.png
import { chromium } from 'playwright';
import fs from 'fs';
const js = ['00_util.js','01_data.js','02_sprites.js'].map(f=>fs.readFileSync('src/js/'+f,'utf8')).join('\n');
const html = `<html><body style="margin:0;background:#2a2238"><canvas id=c width=1400 height=980></canvas><script>${js}
const c=document.getElementById('c'),x=c.getContext('2d');x.imageSmoothingEnabled=false;
let px=60;const names=Object.keys(ART);
names.forEach((n,i)=>{const sc=n.startsWith("ogre")?5:7;drawSprite(x,n,60+(i%7)*200,440+Math.floor(i/7)*480,{scale:sc,t:0,flip:false});x.fillStyle='#fff';x.font='14px sans-serif';x.fillText(n,20+(i%7)*200,460+Math.floor(i/7)*480);});
</script></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:980}});
p.on('console', m=>console.log(m.text())); p.on('pageerror', e=>console.log('ERR',e.message));
await p.setContent(html); await p.screenshot({path: process.argv[2]}); await b.close();
