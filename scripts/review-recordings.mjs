import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const stem of ['desktop','desktop-fallback','mobile']) {
  const p=await browser.newPage({viewport:{width:720,height:500}});
  await p.goto('http://localhost:4197/');
  await p.setContent('<style>body{margin:0;background:#eee6d7}video{width:720px;height:500px;object-fit:contain}</style><video muted></video>');
  const duration=await p.evaluate(async (stem)=>{
    const v=document.querySelector('video');v.src=`http://localhost:4197/evidence/${stem}-full-scenario.webm`;
    await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=rej});return v.duration;
  },stem);
  const times=[2,5,8,duration*.5,duration-4.1,duration-3.7,duration-3.3,duration-2.9,duration-2.5,duration-2.1,duration-1.7,duration-.7];
  const layers=[];
  for(let i=0;i<times.length;i++){
    await p.evaluate(async t=>{const v=document.querySelector('video');await new Promise(res=>{v.onseeked=res;v.currentTime=Math.max(.01,t)})},times[i]);
    const image=await p.screenshot();
    layers.push({input:await sharp(image).resize(480,334).png().toBuffer(),left:(i%4)*480,top:Math.floor(i/4)*334});
  }
  await sharp({create:{width:1920,height:1002,channels:3,background:'#eee6d7'}}).composite(layers).png().toFile(`evidence/${stem}-v2-contact-sheet.png`);
  console.log({stem,duration,times});await p.close();
 }
}finally{await browser.close()}
