import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const url=process.env.TEST_URL||'https://seoshiro.github.io/save-slot/';
const mode=process.env.CAPTURE_MODE||'desktop',mobile=mode==='mobile',fallback=mode==='fallback';
const size=mobile?{width:390,height:844}:{width:1280,height:900};
const dir=`evidence/portfolio-final/${mode}-frames`;
fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'}),headless:true,args:['--no-sandbox',...(process.env.SOFTWARE_WEBGL==='1'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
const ctx=await b.newContext({viewport:size,deviceScaleFactor:mobile?1:0.75,isMobile:mobile,hasTouch:mobile});
const p=await ctx.newPage(),cdp=await ctx.newCDPSession(p),frames=[];
const report={url,mode,size,deviceScaleFactor:mobile?1:0.75,browser:b.version(),at:new Date().toISOString(),errors:[],steps:[],capture:'CDP JPEG screencast with original frame timestamps, variable-frame-rate MP4; no playback acceleration',environment:`${process.platform} Chromium; renderer identified separately. Emulated viewport, not physical-phone performance.`};
p.on('pageerror',e=>report.errors.push(e.message));
cdp.on('Page.screencastFrame',e=>{frames.push({time:e.metadata.timestamp,data:e.data});cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
try{
 if(fallback)await p.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:orig.call(this,t,...a);};});
 await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await p.evaluate(()=>document.fonts.ready);
 if(mobile)await p.getByRole('button',{name:'RU',exact:true}).click();
 await p.getByRole('button',{name:'MOSS SIGNAL',exact:true}).last().click();
 if(!fallback){await p.locator('.scene[data-covers-ready="6"]').waitFor();report.gpu=await p.locator('.scene canvas').evaluate(c=>{const gl=c.getContext('webgl2');if(!gl)throw Error('No WebGL');const d=gl.getExtension('WEBGL_debug_renderer_info');return d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.VERSION);});}else report.gpu='WebGL context explicitly unavailable; Canvas2D fallback';
 await p.waitForTimeout(500);await p.screenshot({path:`evidence/portfolio-final/${mode}-shelf.png`});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:size.width,maxHeight:size.height,everyNthFrame:1});
 await p.waitForTimeout(600);report.steps.push('shelf');
 await p.locator('[data-open-box]').click();await p.locator('.world-info.arrived').waitFor();await p.locator('.insert-button:not(:disabled)').waitFor();await p.waitForTimeout(800);await p.screenshot({path:`evidence/portfolio-final/${mode}-open.png`});report.steps.push('box open, cartridge extracted');
 await p.locator('.insert-button').click();await p.locator('.game-region').waitFor();await p.waitForTimeout(850);report.steps.push('inserted, live game');
 await p.keyboard.down('ArrowUp');await p.waitForTimeout(5000);await p.keyboard.up('ArrowUp');await p.keyboard.press('e');await p.waitForTimeout(300);report.signals=await p.locator('.game-stat').innerText();await p.screenshot({path:`evidence/portfolio-final/${mode}-game.png`});
 await p.locator('.game-actions .secondary').first().click();await p.waitForTimeout(500);report.steps.push('pause');await p.locator('.game-overlay .primary').click();await p.waitForTimeout(350);
 await p.locator('.backbar .back').click();await p.locator('.app[data-stage="shelf"]').waitFor({timeout:30000});await p.waitForTimeout(300);report.steps.push('cartridge packed, shelf restored');await p.screenshot({path:`evidence/portfolio-final/${mode}-return.png`});await p.waitForTimeout(600);
 if(report.errors.length)throw Error('Page errors');
}catch(e){report.failure=e.message;process.exitCode=1;}finally{
 await cdp.send('Page.stopScreencast');await ctx.close();await b.close();
 let list='';for(let i=0;i<frames.length;i++){const name=String(i).padStart(5,'0')+'.jpg';fs.writeFileSync(dir+'/'+name,Buffer.from(frames[i].data,'base64'));list+=`file '${name}'\nduration ${Math.max(.001,(frames[i+1]?.time??frames[i].time+.08)-frames[i].time)}\n`;}
 if(frames.length)list+=`file '${String(frames.length-1).padStart(5,'0')}.jpg'\n`;
 fs.writeFileSync(dir+'/frames.txt',list);report.frames=frames.map(f=>f.time);report.durationSeconds=frames.length?frames.at(-1).time-frames[0].time:0;
 fs.writeFileSync(`evidence/portfolio-final/${mode}-report.json`,JSON.stringify(report,null,2));
 if(frames.length)execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',dir+'/frames.txt','-fps_mode','vfr','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-threads','2','-preset','fast','-crf','19','-pix_fmt','yuv420p','-an','-movflags','+faststart',`evidence/portfolio-final/${mode}-interaction.mp4`]);
 console.log(JSON.stringify({...report,frames:frames.length}));
}
