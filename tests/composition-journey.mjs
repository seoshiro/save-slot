import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.env.TEST_URL || 'http://127.0.0.1:4198/';
const dir = process.env.EVIDENCE_DIR || 'evidence/composition-journey';
const sizes = process.env.VIEWPORTS ? process.env.VIEWPORTS.split(',').map(v => v.split('x').map(Number)) : [[1366,768],[1536,776],[375,667],[390,844],[1366,600]];
const languages = (process.env.LANGUAGES || 'en,ru').split(',');
await fs.mkdir(dir, {recursive:true});
const report = {url, at:new Date().toISOString(), conditions:'Chrome on Windows; DPR 1; 100% browser zoom; mobile CSS viewport and touch emulation, not physical phones or Safari. Raw uninterrupted Playwright page video, no cuts or transformations.', limits:'DOM assertions do not prove 3D mesh containment, object size, neighbor visibility, or movement quality. Review endpoint/intermediate screenshots and continuous recordings separately.', runs:[], errors:[]};
const browser = await chromium.launch({channel:'chrome', headless:true});
const check = (run, value, label) => {run.checks.push({label,pass:!!value}); if(!value) run.failures.push(label);};
const settled = (p,n) => p.locator(`.app[data-settled="${n}"]`).waitFor({timeout:30000});
async function metrics(p) {
  return p.evaluate(() => {
    const read = selector => {
      const el = document.querySelector(selector); if(!el) return null;
      const r=el.getBoundingClientRect(), style=getComputedStyle(el), x=r.x+r.width/2,y=r.y+r.height/2, top=document.elementFromPoint(x,y);
      return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,opacity:style.opacity,display:style.display,visibility:style.visibility,inViewport:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:!!top&&(el===top||el.contains(top))};
    };
    const canvas=read('.scene canvas'), info=read('.world-info');
    const overlap=canvas&&info? Math.max(0,Math.min(canvas.right,info.right)-Math.max(canvas.x,info.x))*Math.max(0,Math.min(canvas.bottom,info.bottom)-Math.max(canvas.y,info.y)):0;
    return {time:performance.now(),stage:document.querySelector('.app')?.dataset.stage,settled:document.querySelector('.app')?.dataset.settled,game:document.querySelector('.app')?.dataset.game,canvas,info,canvasInfoIntersectionArea:overlap,back:read('.backbar .back'),open:read('[data-open-box]'),insert:read('.insert-button'),picks:read('.world-picks'),gameRegion:read('.game-region'),touchDown:read('.pad-arrowdown'),scrollY,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,light:document.querySelector('.app')?.classList.contains('light-mode')};
  });
}
async function capture(p,run,name) {
  const file=path.join(dir,`${run.label}-${name}.png`);
  run.frames.push({name,file,...await metrics(p)});
  await p.screenshot({path:file,fullPage:false});
}
async function control(p,run,selector,label) {
  const box=await p.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2,t=document.elementFromPoint(x,y);return {x,y,visible:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:t&&(el===t||el.contains(t))};});
  check(run,box.visible&&box.hit,label+' visible and unobstructed without scrolling');
  if(!box.visible||!box.hit) throw new Error(label+' not directly clickable');
  await p.mouse.click(box.x,box.y);
}
async function transition(p,run,name,action,target) {
  const start=Date.now(); await action();
  for(const ms of [160,420,850]) {await p.waitForTimeout(Math.max(0,ms-(Date.now()-start)));await capture(p,run,`${name}-${ms}ms`);}
  await settled(p,target);await p.waitForTimeout(450);await capture(p,run,name+'-settled');
  run.transitions.push({name,elapsedMs:Date.now()-start,target});await p.waitForTimeout(650);
}
async function init(p,lang) {
  await p.addInitScript(l=>localStorage.setItem('save-slot:lang',l),lang);
  await p.goto(url);await p.locator('.boot-intro').waitFor({state:'hidden',timeout:45000});
  await p.locator('.scene[data-resource-ready="true"]').waitFor({timeout:45000});
}
try {
 for(const [width,height] of sizes) for(const lang of languages) {
  const run={label:`${width}x${height}-${lang}`,checks:[],failures:[],frames:[],transitions:[]}; report.runs.push(run);
  const options={viewport:{width,height},deviceScaleFactor:1,hasTouch:width<701};
  let context=await browser.newContext({...options,recordVideo:{dir:path.join(dir,'raw'),size:{width,height}}});
  let p=await context.newPage();const video=p.video();
  p.on('pageerror',e=>report.errors.push(`${run.label}: ${e.message}`));
  try {
    await init(p,lang);
    await p.locator('.world-picks').getByRole('button',{name:'DUSK DELIVERY',exact:true}).click();await p.waitForTimeout(950);
    await capture(p,run,'dusk-shelf');await p.waitForTimeout(700);
    await transition(p,run,'dusk-open',()=>control(p,run,'[data-open-box]','DUSK Open'),1);
    await transition(p,run,'dusk-return',()=>control(p,run,'.backbar .back','DUSK Back'),0);
    await p.locator('.world-picks').getByRole('button',{name:'ORBIT ZERO',exact:true}).click();await p.waitForTimeout(950);
    await capture(p,run,'orbit-shelf');await p.waitForTimeout(700);
    await transition(p,run,'orbit-open',()=>control(p,run,'[data-open-box]','ORBIT Open'),1);
    await transition(p,run,'orbit-insert',()=>control(p,run,'.insert-button','ORBIT Insert'),2);
    await p.keyboard.down('ArrowUp');await p.waitForTimeout(350);await p.keyboard.up('ArrowUp');await p.waitForTimeout(700);
    await capture(p,run,'orbit-playing');
    const play=await metrics(p);
    check(run,play.gameRegion?.inViewport&&play.gameRegion.width>0&&play.gameRegion.height>0,'Projected game region stays fully within viewport');
    if(width<701) check(run,play.touchDown?.inViewport&&play.touchDown.hit,'Mobile down control visible and unobstructed');
    await transition(p,run,'orbit-return',()=>control(p,run,'.backbar .back','ORBIT Back'),0);
    check(run,(await metrics(p)).game==='orbit-zero','Return preserves ORBIT selection');
    await p.waitForTimeout(900);
  } catch(e) {run.failures.push(String(e.stack||e));await capture(p,run,'failure').catch(()=>{});}
  finally {await context.close();run.recording=path.join(dir,run.label+'-continuous.webm');await video.saveAs(run.recording);}
  // Separate session keeps the requested recording free of extra test journeys.
  context=await browser.newContext(options);p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(`${run.label} interruptions: ${e.message}`));
  try {
    await init(p,lang);
    await p.locator('.world-picks').getByRole('button',{name:'ORBIT ZERO',exact:true}).click();await p.waitForTimeout(750);
    await p.locator('[data-open-box]').click();await p.locator('.backbar .back').waitFor();await p.waitForTimeout(140);
    const back=await p.locator('.backbar .back').boundingBox();await p.mouse.click(back.x+back.width/2,back.y+back.height/2,{clickCount:2,delay:40});
    await settled(p,0);check(run,true,'Opening interrupted with repeated return; shelf settled');
    await p.locator('[data-open-box]').click();await settled(p,1);await p.locator('.insert-button').click();await p.waitForTimeout(160);
    await p.locator('.backbar .back').click();await settled(p,0);check(run,true,'Insertion interrupted; shelf settled');
    for(const name of ['DUSK DELIVERY','ORBIT ZERO','DUSK DELIVERY','ORBIT ZERO']) {await p.locator('.world-picks').getByRole('button',{name,exact:true}).click();await p.waitForTimeout(55);}
    await p.waitForTimeout(950);check(run,(await metrics(p)).game==='orbit-zero','Rapid selection latest ORBIT intent wins');
    await p.locator('[data-open-box]').click();await settled(p,1);await p.locator('.insert-button').click();await settled(p,2);await capture(p,run,'interrupted-recovery-play');
    await control(p,run,'.backbar .back','Recovered Back');await settled(p,0);check(run,true,'Clean reopen/play/return after interruptions');
    await p.locator('.world-picks').getByRole('button',{name:'DUSK DELIVERY',exact:true}).click();
    await p.locator('[data-open-box]').click();await settled(p,1);
    check(run,(await metrics(p)).game==='dusk-delivery','Immediate selection-to-Open preserves latest DUSK intent');
    await capture(p,run,'immediate-select-open');
    await control(p,run,'.backbar .back','Immediate selection Back');await settled(p,0);
  } catch(e) {run.failures.push(String(e.stack||e));await capture(p,run,'interruption-failure').catch(()=>{});} finally {await context.close();}
  for(const frame of run.frames) {check(run,!frame.horizontalOverflow,frame.name+': no horizontal overflow');check(run,!frame.light,frame.name+': real WebGL scene, not fallback');}
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  console.log(run.label,run.failures.length?'FAIL':'PASS',run.failures);
 }
} finally {await browser.close();report.status=report.errors.length||report.runs.some(r=>r.failures.length)?'failed':'passed';await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log('Composition journey:',report.status);if(report.status==='failed')process.exitCode=1;}
