import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import tasks from 'markdown-it-task-lists';
import katex from 'katex';
import hljs from 'highlight.js';
import { parse } from 'yaml';
import config from '../site.config.mjs';

export const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const url = file => `${config.base.replace(/\/$/, '')}/${file.replace(/^\//, '')}`;
export function frontmatter(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return { meta: match ? parse(match[1]) : {}, body: match ? raw.slice(match[0].length) : raw };
}
export async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const e of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
    const file = path.join(dir, e.name);
    if(e.isDirectory()) result.push(...await walk(file)); else if(e.isFile()) result.push(file);
  }
  return result;
}
const mathErrors = [];
// The old notes intentionally use 4$V$ and 7$V$. The upstream currency guard
// rejects these openers and accidentally consumes prose between later dollars.
// Allow adjacent digits while keeping escaped dollar signs literal.
texmath.rules.dollars.inline.forEach(rule => {
  rule.pre = (source, _outerSpace, offset) => offset === 0 || source[offset - 1] !== '\\';
  rule.post = () => true;
});
const mathEngine = {
  renderToString(tex, options) {
    // Existing notes sometimes wrap dollar math in \(...\). Normalize only that rendering syntax.
    const expression = tex.trim().replace(/^\$([\s\S]*)\$$/, '$1');
    try { return katex.renderToString(expression, {...options, throwOnError:true, strict:'ignore', trust:false}); }
    catch(error) { mathErrors.push({expression, message:error.message}); return katex.renderToString(expression, {...options, throwOnError:false, strict:'ignore', trust:false}); }
  }
};
export function renderer() {
  return new MarkdownIt({html:true, linkify:true, typographer:false, highlight(code, lang) {
    return lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language:lang, ignoreIllegals:true }).value : '';
  }}).use(texmath, {engine:mathEngine, delimiters:['dollars','brackets'], katexOptions:{strict:'ignore'}}).use(tasks, {enabled:false});
}

export async function generate() {
  const report = {source:'source', algorithm:'SHA-256', files:[], articles:[], warnings:[], mathErrors:[]};
  await fs.mkdir('.generated',{recursive:true});
  await fs.mkdir('public/data',{recursive:true});
  const sourceFiles = await walk('source');
  const sourceSet = new Set(sourceFiles.map(f=>f.replaceAll('\\','/').replace(/^source\//,'')));
  for(const file of sourceFiles){
    const relative = file.replaceAll('\\','/').replace(/^source\//,'');
    const bytes = await fs.readFile(file);
    const sidecar = relative.includes('Zone.Identifier');
    report.files.push({path:relative, bytes:bytes.length, sha256:hash(bytes), published:!sidecar});
    if(sidecar) continue;
    const original = path.join('public/originals',relative);
    await fs.mkdir(path.dirname(original),{recursive:true}); await fs.copyFile(file,original);
    if(relative.startsWith('img/')) {
      await fs.mkdir(path.dirname(path.join('public',relative)),{recursive:true});
      await fs.copyFile(file,path.join('public',relative));
    }
  }
  function renderDocument(body, filename) {
    const references=[];
    let renderedSource=body.replace(/(^|\n)\s*\[TOC\]\s*(?=\n|$)/gi,'$1');
    const localImage = ref => {
      const clean = decodeURI(ref).replace(/^(?:\.\.\/|\.\/|\/)+/,'');
      if(!clean.startsWith('img/')) return ref;
      if(!sourceSet.has(clean)) throw new Error(`Missing image in ${filename}: ${ref}`);
      references.push(clean);
      return url(clean.split('/').map(encodeURIComponent).join('/'));
    };
    renderedSource = renderedSource.replace(/(!\[[^\]]*\]\()([^\s)]+)(\))/g,(_,a,b,c)=>a+localImage(b)+c)
      .replace(/(<(?:img|video|source)\b[^>]*?\bsrc=["'])([^"']+)(["'])/gi,(_,a,b,c)=>a+localImage(b)+c);
    const md=renderer();
    const tokens=md.parse(renderedSource,{}),toc=[];
    let number=0;
    for(let i=0;i<tokens.length;i++){
      if(tokens[i].type==='heading_open') {
        const id=`section-${++number}`; tokens[i].attrSet('id',id);
        toc.push({id,level:Number(tokens[i].tag.slice(1)),title:tokens[i+1].content});
      }
    }
    const html=md.renderer.render(tokens,md.options,{}).replace(/<img\b/g,'<img loading="lazy" decoding="async"');
    const text=html.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    return {html,toc,text,images:[...new Set(references)]};
  }
  const posts=[];
  for(const file of sourceFiles.filter(f=>f.replaceAll('\\','/').startsWith('source/_posts/')&&f.endsWith('.md'))){
    const raw=await fs.readFile(file,'utf8'); const {meta,body}=frontmatter(raw);
    const slug=path.basename(file,'.md');
    const rendered=renderDocument(body,file);
    const list=x=>x == null ? [] : (Array.isArray(x) ? x.flat(Infinity) : [x]).map(String);
    const post={slug, title:String(meta.title||slug), date:meta.date?String(meta.date):null, categories:list(meta.categories), tags:list(meta.tags), meta, content:body, ...rendered,
      path:url(`posts/${encodeURIComponent(slug)}/`), original:url(`originals/_posts/${encodeURIComponent(slug)}.md`),
      minutes:Math.max(1,Math.ceil(body.length/450)), excerpt:rendered.text.slice(0,150), sha256:hash(await fs.readFile(file))};
    posts.push(post);
    if(!post.date) report.warnings.push(`${slug}: 原稿未记录发布日期，保留为空。`);
    if(!body.trim()) report.warnings.push(`${slug}: 原稿正文为空，保留空文章。`);
    report.articles.push({slug,title:post.title,date:post.date,sha256:post.sha256,bodySha256:hash(body),images:post.images,path:post.path});
  }
  posts.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.slug.localeCompare(b.slug,'zh-CN'));
  posts.forEach((post,i)=>post.id=String(i+1).padStart(3,'0'));
  const aboutRaw=await fs.readFile('source/about/index.md','utf8');
  const about={...frontmatter(aboutRaw),...renderDocument(frontmatter(aboutRaw).body,'about/index.md')};
  const data={posts,about,config};
  await fs.writeFile('.generated/content.json',JSON.stringify(data));
  const index=posts.map(({html,content,toc,meta,...p})=>p);
  await fs.writeFile('public/data/posts.json',JSON.stringify(index));
  await fs.writeFile('public/data/site.json',JSON.stringify({wordmark:config.wordmark,suffix:config.wordmarkSuffix,brand:`${config.wordmark} ${config.wordmarkSuffix}`}));
  // Reuse local assets. CSS URLs are relative so project paths also work.
  await fs.mkdir('public/assets',{recursive:true});
  await fs.copyFile('vendor/rhine/assets/archive-cassette.glb','public/assets/archive-cassette.glb');
  await fs.mkdir('public/fonts',{recursive:true});
  const fontCSS=await fs.readFile('vendor/rhine/fonts/source.css','utf8');
  // Use the original regular face, synthesizing headings to avoid five full CJK families.
  const regularRules=fontCSS.split(/\r?\n/).filter(line=>line.includes('font-weight:400'));
  for(const rule of regularRules){
    const match=rule.match(/url\("\/fonts\/([^"\)]+)"\)/);
    if(match){const dest=path.join('public/fonts',match[1]);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join('vendor/rhine/fonts',match[1]),dest);}
  }
  await fs.writeFile('public/fonts/misans.css',regularRules.join('\n').replaceAll('url("/fonts/','url("./'));
  await fs.copyFile('vendor/rhine/fonts/MiSans-license.pdf','public/fonts/MiSans-license.pdf');
  await fs.copyFile('vendor/rhine/fonts/NOTICE.txt','public/fonts/NOTICE.txt');
  for(const file of ['source.json','UPSTREAM-README.md'])await fs.copyFile(`vendor/rhine/fonts/misans-webfont-4.3.1/${file}`,`public/fonts/misans-webfont-4.3.1/${file}`);
  await fs.mkdir('public/licenses',{recursive:true});
  await fs.copyFile('vendor/rhine/LICENSE','public/licenses/RhineLabUI-MIT.txt');
  for(const dependency of ['three','katex','highlight.js'])await fs.copyFile(`node_modules/${dependency}/LICENSE`,`public/licenses/${dependency}-LICENSE.txt`);
  await fs.writeFile('public/.nojekyll','');
  await fs.writeFile('public/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e8e5e1"/><path d="M14 17h35v8H24v8h25v15H14v-8h25v-3H14z" fill="#171713"/><path d="M51 17h4v31h-4z" fill="#e78232"/></svg>');
  report.mathErrors=mathErrors;
  report.summary={posts:posts.length,sourceFiles:sourceFiles.length,media:sourceFiles.filter(f=>f.replaceAll('\\','/').startsWith('source/img/')&&!f.includes('Zone.Identifier')).length,uniqueArticleImages:new Set(posts.flatMap(p=>p.images)).size};
  await fs.writeFile('.generated/migration-report.json',JSON.stringify(report,null,2));
  await fs.writeFile('public/data/migration-report.json',JSON.stringify(report,null,2));
  if(mathErrors.length) throw new Error(`${mathErrors.length} math expressions need attention; see .generated/migration-report.json`);
  console.log(`Migrated ${posts.length} posts, ${report.summary.media} media files, ${report.summary.uniqueArticleImages} referenced images; ${mathErrors.length} math errors.`);
  return data;
}
if(process.argv[1]?.endsWith('content.mjs')) await generate();
