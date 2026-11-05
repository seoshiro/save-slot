import sharp from 'sharp';
import fs from 'node:fs/promises';
await fs.mkdir('public/media',{recursive:true});
const sheet='art/references/worlds-sheet.png';
const crops=[{id:'dusk',left:17,top:102,width:340,height:591},{id:'orbit',left:379,top:102,width:328,height:591},{id:'moss',left:727,top:102,width:340,height:591},{id:'tide',left:17,top:736,width:340,height:637},{id:'ember',left:379,top:736,width:328,height:637},{id:'snow',left:727,top:736,width:340,height:637}];
for(const c of crops){const {id,...rect}=c;await sharp(sheet).extract(rect).resize(512,896,{fit:'fill',kernel:'nearest'}).webp({quality:94}).toFile(`public/media/${id}-cover.webp`);
 await sharp(sheet).extract({...rect,top:rect.top+Math.round(rect.height*.28),height:Math.round(rect.height*.55)}).resize(768,432,{fit:'cover',kernel:'nearest'}).webp({quality:92}).toFile(`public/media/${id}-world.webp`);
}
// Reference poster is used only in the deliberately announced light mode.
await sharp('art/references/console-reference.png').resize(768).webp({quality:87}).toFile('public/media/console-poster.webp');
console.log('Prepared 6 distinct cover and world images from the user-supplied artwork.');
