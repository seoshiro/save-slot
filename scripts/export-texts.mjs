import fs from'node:fs';import path from'node:path';
const dirs=['src','tests','scripts','docs','.github'];const files=['README.md','AGENTS.md','.gitignore','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','public/favicon.svg','art/source/console-report.json'];
function walk(d){for(const f of fs.readdirSync(d)){const p=path.posix.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(/\.(tsx?|mjs|py|md|json|yml|svg)$/.test(p))files.push(p)}}dirs.forEach(walk);
console.log(JSON.stringify(files.map(p=>({path:p,mode:'100644',type:'blob',content:fs.readFileSync(p,'utf8')}))));
