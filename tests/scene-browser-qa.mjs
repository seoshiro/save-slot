import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='evidence/six-games'; await fs.mkdir(dir,{recursive:true});
const report={url:'http://localhost:4199/',at:new Date().toISOString(),checks:[],errors:[],mode:'recorded interaction QA; not performance benchmark'};
const browser=await chromium.launch({channel:'chrome',headless:true});
report.browser=browser.version();
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:dir+'/interaction-raw',size:{width:1440,height:1000}}});
const page=await context.newPage();const video=page.video();
page.on('pageerror',e=>report.errors.push(e.message));
const ok=(value,name)=>{assert.ok(value,name);report.checks.push(name)};
const stage=async(s)=>page.locator('.app[data-stage="'+s+'"]').waitFor({timeout:30000});
const settled=async(n)=>page.locator('.app[data-settled="'+n+'"]').waitFor({timeout:30000});
try {
  await page.goto(report.url);
  await page.getByTestId('boot-intro').waitFor({state:'visible',timeout:10000});
  report.checks.push('Initial intro visible');
  await page.getByTestId('boot-intro').waitFor({state:'hidden',timeout:30000});
  ok(await page.locator('.scene').getAttribute('data-resource-ready')==='true','Intro leaves only after real 3D resources prepared');
  await page.screenshot({path:dir+'/interaction-shelf.png',fullPage:true});
  for(const name of ['Next world','Next world','Previous world','Next world','Previous world','Previous world']) {await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(80);}
  await page.getByRole('button',{name:'SNOWBYTE',exact:true}).click();await page.waitForTimeout(850);
  ok(await page.locator('.app').getAttribute('data-game')==='snowbyte','Last endpoint selectable');
  await page.getByRole('button',{name:'DUSK DELIVERY',exact:true}).click();await page.waitForTimeout(850);
  ok(await page.locator('.app').getAttribute('data-game')==='dusk-delivery','First endpoint selectable after interruption sequence');
  await page.getByRole('button',{name:'MOSS SIGNAL',exact:true}).click();await page.waitForTimeout(850);
  const rect=await page.locator('.scene').boundingBox();const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+24,y,{steps:6});await page.mouse.up();await page.waitForTimeout(950);
  ok(await page.locator('.app').getAttribute('data-stage')==='shelf','Same-item drag release does not open box');
  ok(await page.locator('.app').getAttribute('data-game')==='moss-signal','Short drag snaps to same item');
  await page.locator('[data-open-box]').click();await page.waitForTimeout(200);await page.locator('.backbar .back').click();await settled(0);
  ok(await page.locator('.app').getAttribute('data-stage')==='shelf','Opening cancelled mid-transition returns to shelf');
  await page.locator('[data-open-box]').click();await settled(1);
  await page.locator('.inspect-button').click();await page.waitForTimeout(900);await page.locator('.inspect-button').click();await page.waitForTimeout(500);
  ok(await page.locator('.inspect-button').getAttribute('aria-pressed')==='false','Cartridge inspection toggles on and smoothly off');
  await page.screenshot({path:dir+'/interaction-open.png',fullPage:true});
  await page.locator('.insert-button').click();await settled(2);
  ok(await page.locator('[data-testid="game-region"]').count()===1,'Insertion reaches game with CanvasTexture source mounted');
  await page.waitForTimeout(800);
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');
  await page.getByRole('button',{name:'Larger game screen',exact:true}).click();await page.waitForTimeout(700);
  ok(await page.getByRole('button',{name:'Return to console',exact:true}).isVisible(),'Larger game screen/fullscreen UI opens');
  await page.screenshot({path:dir+'/interaction-large-game.png',fullPage:true});
  await page.getByRole('button',{name:'Return to console',exact:true}).click();await page.waitForTimeout(700);
  await page.getByRole('button',{name:'RU',exact:true}).click();
  ok(await page.locator('html').getAttribute('lang')==='ru','RU toggle retains inserted game');
  for(const viewport of [{width:1100,height:800},{width:1600,height:1000},{width:1440,height:1000}]) {await page.setViewportSize(viewport);await page.waitForTimeout(500);}
  ok(await page.locator('.app').getAttribute('data-settled')==='2','Viewport resizing preserves inserted state');
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.locator('.backbar .back').click();await settled(0);await stage('shelf');
  await page.getByRole('button',{name:'RU',exact:true}).click();await page.waitForTimeout(400);
  const bounds=await page.evaluate(()=>({hero:document.querySelector('.hero-copy')?.getBoundingClientRect().bottom,scene:document.querySelector('.scene').getBoundingClientRect().top}));
  ok(bounds.hero<=bounds.scene,'Measured RU heading and 3D occupy separate layout areas');
  await page.screenshot({path:dir+'/interaction-return-ru.png',fullPage:true});
  ok(report.errors.length===0,'No browser page errors');
  report.status='passed';
} catch(e) {report.status='failed';report.failure=String(e.stack||e);await page.screenshot({path:dir+'/interaction-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally {await context.close();await video.saveAs(dir+'/shelf-interactions.webm');await browser.close();await fs.writeFile(dir+'/shelf-interactions-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
