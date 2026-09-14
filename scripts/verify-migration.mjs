import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hash,walk,frontmatter} from './content.mjs';
const report=JSON.parse(await fs.readFile('.generated/migration-report.json','utf8'));
const {posts}=JSON.parse(await fs.readFile('.generated/content.json','utf8'));
const originals=await walk('source');
assert.equal(originals.length,report.files.length,'Every source file is inventoried');
for(const entry of report.files){
  const original=await fs.readFile(path.join('source',entry.path));
  assert.equal(hash(original),entry.sha256,`Source changed: ${entry.path}`);
  if(entry.published){
    assert.equal(hash(await fs.readFile(path.join('dist/originals',entry.path))),entry.sha256,`Original export differs: ${entry.path}`);
    if(entry.path.startsWith('img/'))assert.equal(hash(await fs.readFile(path.join('dist',entry.path))),entry.sha256,`Media differs: ${entry.path}`);
  }
}
assert.equal(posts.length,originals.filter(f=>f.replaceAll('\\','/').startsWith('source/_posts/')&&f.endsWith('.md')).length);
for(const post of posts){
  const raw=await fs.readFile(`source/_posts/${post.slug}.md`,'utf8');
  const source=frontmatter(raw);
  assert.equal(post.content,source.body,`Full body retained: ${post.slug}`);
  assert.deepEqual(post.meta,source.meta,`Metadata retained: ${post.slug}`);
  const html=await fs.readFile(`dist/posts/${post.slug}/index.html`,'utf8');
  assert.ok(html.includes(post.html),'Rendered body is present in static HTML');
  assert.ok(!html.includes('katex-error'),`No broken formulas: ${post.slug}`);
  for(const image of post.images)await fs.access(path.join('dist',image));
}
const htmlFiles=(await walk('dist')).filter(f=>f.endsWith('.html'));
const archiveHtml=await fs.readFile('dist/archives/index.html','utf8');
assert.ok(archiveHtml.includes('page-instrument instrument-archive'),'Archive motion instrument is present');
const categoryHtml=await fs.readFile('dist/category/index.html','utf8');
assert.ok(categoryHtml.includes('page-instrument instrument-category'),'Category motion instrument is present');
const tagHtml=await fs.readFile('dist/tag/index.html','utf8');
assert.ok(tagHtml.includes('page-instrument instrument-tag'),'Tag motion instrument is present');
const aboutHtml=await fs.readFile('dist/about/index.html','utf8');
assert.ok(aboutHtml.includes('profile-frame'),'About motion frame is present');
assert.ok(aboutHtml.includes('SHUOHAN BLOG'),'Brand name is present on about page');
const cssFile=(await fs.readdir('dist/assets')).find(name=>name.endsWith('.css'));
assert.ok(cssFile,'Built stylesheet is present');
const css=await fs.readFile(path.join('dist/assets',cssFile),'utf8');
assert.ok(css.includes('@view-transition{navigation:auto}'),'Cross-page transition is enabled');
let localLinks=0;
for(const file of htmlFiles){
  const html=await fs.readFile(file,'utf8');
  for(const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
    const href=match[1];
    if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href))continue;
    const reference=decodeURIComponent(href.split(/[?#]/)[0]);
    if(!reference)continue;
    let target=reference.startsWith('/')?path.join('dist',reference):path.resolve(path.dirname(file),reference);
    try{const stat=await fs.stat(target);if(stat.isDirectory())target=path.join(target,'index.html');await fs.access(target);}catch{throw new Error(`Broken local link in ${file}: ${href}`);}
    localLinks++;
  }
}
assert.equal(report.mathErrors.length,0);
await fs.mkdir('verification',{recursive:true});
const result={...report.summary,hashesVerified:report.files.filter(f=>f.published).length,staticPages:htmlFiles.length,localLinks,mathErrors:0};
await fs.writeFile('verification/migration-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
