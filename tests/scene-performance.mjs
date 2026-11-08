import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{window.__perf={phase:null,frames:{},longtasks:[]};let previous=0;requestAnimationFrame(function frame(t){if(window.__perf.phase && previous) (window.__perf.frames[window.__perf.phase]??=[]).push(t-previous);previous=t;requestAnimationFrame(frame)});new PerformanceObserver(list=>{for(const entry of list.getEntries())if(window.__perf.phase)window.__perf.longtasks.push({phase:window.__perf.phase,duration:entry.duration,start:entry.startTime})}).observe({type:'longtask',buffered:true});});
const page=await context.newPage();
const report={url:'http://localhost:4199/',at:new Date().toISOString(),browser:browser.version(),viewport:'1440x1000',recording:false,hardwareFromUser:{cpu:'AMD Ryzen 5 7535HS',gpus:['AMD Radeon Graphics','NVIDIA RTX 4050 Laptop']},errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
async function phase(name,action,ms){await page.evaluate(n=>window.__perf.phase=n,name);await action();await page.waitForTimeout(ms);await page.evaluate(()=>window.__perf.phase=null);}
try {await page.goto(report.url);await page.getByTestId('boot-intro').waitFor({state:'hidden',timeout:30000});await page.waitForTimeout(500);
report.renderer=await page.evaluate(()=>{const gl=document.querySelector('.scene canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency}});
for(let n=0;n<4;n++)await phase('selection-'+n,()=>page.getByRole('button',{name:n%2?'Previous world':'Next world',exact:true}).click(),850);
await phase('opening',()=>page.locator('[data-open-box]').click(),2300);
await phase('inspection',()=>page.locator('.inspect-button').click(),900);await page.locator('.inspect-button').click();await page.waitForTimeout(450);
await phase('insertion',()=>page.locator('.insert-button').click(),1200);
await phase('return',()=>page.locator('.backbar .back').click(),2300);
const raw=await page.evaluate(()=>window.__perf);report.longtasks=raw.longtasks;report.phases={};let all=[];
for(const [name,frames] of Object.entries(raw.frames)){const a=[...frames].sort((a,b)=>a-b);report.phases[name]={frames:a.length,p50ms:a[Math.floor(a.length*.5)],p95ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1),gapsOver33ms:a.filter(x=>x>33).length};all.push(...a)}
all.sort((a,b)=>a-b);report.total={frames:all.length,p50ms:all[Math.floor(all.length*.5)],p95ms:all[Math.floor(all.length*.95)],maxMs:all.at(-1),gapsOver33ms:all.filter(x=>x>33).length,longtasks:raw.longtasks.length};
report.notes=['Browser requestAnimationFrame timing on real selected ANGLE adapter; not GPU timer-query measurements.','No video recording in benchmark context. Interaction video is collected separately, so encoding overhead is excluded.','No before-change baseline measured; do not interpret as a measured speedup.'];report.status='completed';
}catch(e){report.status='failed';report.failure=String(e.stack||e);process.exitCode=1}finally{await browser.close();await fs.mkdir('evidence/six-games',{recursive:true});await fs.writeFile('evidence/six-games/scene-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
