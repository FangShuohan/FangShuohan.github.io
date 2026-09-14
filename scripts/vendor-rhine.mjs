// One-time, reproducible extraction of the original scene's local dependency graph.
import fs from 'node:fs/promises';
import path from 'node:path';
const source='RhineLabUI/src',destination='src/rhine',seen=new Set();
async function copy(name){
  if(seen.has(name)||name==='data.ts')return;
  seen.add(name);
  const text=await fs.readFile(path.join(source,name),'utf8');
  await fs.mkdir(destination,{recursive:true});
  await fs.writeFile(path.join(destination,name),text);
  for(const m of text.matchAll(/from\s+["']\.\/([^"']+)["']/g)){
    const file=m[1].endsWith('.ts')||m[1].endsWith('.json')?m[1]:m[1]+'.ts';
    await copy(file);
  }
}
await copy('scene.ts');
let scene=await fs.readFile(path.join(destination,'scene.ts'),'utf8');
scene=scene.replace('fileAtSlot, fileLocation','fileAtSlot, fileLocation, archiveColumns')
  .replace('Math.round((this.selectedCell.lane - 2) / 5) * 5','Math.round((this.selectedCell.lane - 2) / archiveColumns.length) * archiveColumns.length')
  .replace('"RHINE LAB, LLC."','"SHUOHAN LAB"').replace('"R L / I S"','"S H / B L"');
await fs.writeFile(path.join(destination,'scene.ts'),scene);
await fs.copyFile('RhineLabUI/LICENSE',path.join(destination,'LICENSE'));
await fs.mkdir('vendor/rhine/assets',{recursive:true});
await fs.mkdir('vendor/rhine/fonts',{recursive:true});
await fs.copyFile('RhineLabUI/LICENSE','vendor/rhine/LICENSE');
await fs.copyFile('RhineLabUI/public/assets/archive-cassette.glb','vendor/rhine/assets/archive-cassette.glb');
await fs.copyFile('RhineLabUI/src/fonts.css','vendor/rhine/fonts/source.css');
const fontCSS=await fs.readFile('RhineLabUI/src/fonts.css','utf8');
for(const rule of fontCSS.split(/\r?\n/).filter(line=>line.includes('font-weight:400'))){
  const match=rule.match(/url\("\/fonts\/([^"\)]+)"\)/);
  if(match){const dest=path.join('vendor/rhine/fonts',match[1]);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join('RhineLabUI/public/fonts',match[1]),dest);}
}
for(const file of ['MiSans-license.pdf','NOTICE.txt','misans-webfont-4.3.1/source.json','misans-webfont-4.3.1/UPSTREAM-README.md'])await fs.copyFile(path.join('RhineLabUI/public/fonts',file),path.join('vendor/rhine/fonts',file));
console.log(`Vendored ${seen.size} original scene modules. Blog data adapter is maintained separately.`);
