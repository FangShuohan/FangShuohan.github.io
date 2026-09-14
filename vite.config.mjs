import {defineConfig} from 'vite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import config from './site.config.mjs';
import {home,shell,article,archive,taxonomy,about,notFound} from './scripts/pages.mjs';
import {escape as e} from './scripts/content.mjs';

export default defineConfig(()=>{
  const data=JSON.parse(readFileSync('.generated/content.json','utf8'));
  const canonical = page => `${config.url.replace(/\/$/,'')}${config.base}${page}`;
  const pageHTML=(html,content,title,route,description=config.description)=>html
    .replace(/<!--content-start-->[\s\S]*?<!--content-end-->/,`<!--content-start--><main id="content">${content}</main><!--content-end-->`)
    .replace(/<title>.*?<\/title>/,`<title>${e(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/,`<meta name="description" content="${e(description)}">`)
    .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${canonical(route)}">`)
    .replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${e(title)}">`)
    .replace(/<meta property="og:url"[^>]*>/,`<meta property="og:url" content="${canonical(route)}">`);
  return {
    base:config.base,
    define:{__RHINE_MODELS__:'{}'},
    server:{host:'127.0.0.1'},
    build:{chunkSizeWarningLimit:800},
    plugins:[{
      name:'static-blog',
      transformIndexHtml(html){return html.replace('<!--app-->',shell(home(data))).replaceAll('%SITE_TITLE%',e(config.title)).replaceAll('%SITE_DESCRIPTION%',e(config.description)).replaceAll('%SITE_URL%',canonical(''));},
      configureServer(server){server.middlewares.use((req,res,next)=>{
        const route=decodeURI((req.url||'').split('?')[0]);
        if(route==='/'||route==='/index.html') return next();
        let content,title;
        const post=data.posts.find(p=>decodeURI(p.path)===route);
        if(post){content=article(post,data.posts);title=post.title;}
        else if(route==='/about/'){content=about(data);title='关于';}
        else if(route==='/archives/'){content=archive(data);title='文章归档';}
        else if(route==='/tag/'||route==='/category/'){content=taxonomy(data,route.includes('tag')?'tag':'category');title=route.includes('tag')?'标签':'分类';}
        if(!content)return next();
        server.transformIndexHtml(req.url,readFileSync('index.html','utf8')).then(html=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(pageHTML(html,content,`${title} · ${config.title}`,route.replace(/^\//,'')));}).catch(next);
      });},
      closeBundle(){
        const baseHTML=readFileSync('dist/index.html','utf8'),paths=['','about/','archives/','tag/','category/'];
        const write=(file,html)=>{const target=path.join('dist',file);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,html);};
        for(const [route,content,title] of [['about/',about(data),'关于'],['archives/',archive(data),'文章归档'],['tag/',taxonomy(data,'tag'),'标签'],['category/',taxonomy(data,'category'),'分类']])write(`${route}index.html`,pageHTML(baseHTML,content,`${title} · ${config.title}`,route));
        write('404.html',pageHTML(baseHTML,notFound(),`档案未找到 · ${config.title}`,'404.html'));
        const redirect=(from,to)=>write(`${from}index.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>文章已迁移</title><meta http-equiv="refresh" content="0;url=${e(to)}"><link rel="canonical" href="${config.url}${to}"><p>文章已迁移：<a href="${e(to)}">前往阅读</a></p></html>`);
        for(const p of data.posts){const route=`posts/${encodeURIComponent(p.slug)}/`;paths.push(route);let html=pageHTML(baseHTML,article(p,data.posts),`${p.title} · ${config.title}`,route,p.excerpt||p.title);const structured={'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,author:{'@type':'Person',name:config.author},url:canonical(route),...(p.date?{datePublished:p.date.replace(' ','T').replace(/:(\d)$/ ,':0$1')+'+08:00'}:{})};html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script></head>`);write(`posts/${p.slug}/index.html`,html);redirect(`${p.slug}/`,p.path);if(p.date)redirect(`${p.date.slice(0,10).replaceAll('-','/')}/${p.slug}/`,p.path);}
        for(const p of data.posts){for(const c of p.categories)redirect(`categories/${c}/`,`${config.base}category/?category=${encodeURIComponent(c)}`);for(const t of p.tags)redirect(`tags/${t}/`,`${config.base}tag/?tag=${encodeURIComponent(t)}`);}
        redirect('categories/',`${config.base}category/`);redirect('tags/',`${config.base}tag/`);
        write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${e(canonical(p))}</loc></url>`).join('')}</urlset>`);
        write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${canonical('sitemap.xml')}\n`);
        write('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${e(config.title)}</title><link>${canonical('')}</link><description>${e(config.description)}</description><language>zh-CN</language>${data.posts.map(p=>`<item><title>${e(p.title)}</title><link>${canonical(`posts/${encodeURIComponent(p.slug)}/`)}</link><guid>${canonical(`posts/${encodeURIComponent(p.slug)}/`)}</guid>${p.date?`<pubDate>${new Date(p.date.replace(' ','T').replace(/:(\d)$/,':0$1')+'+08:00').toUTCString()}</pubDate>`:''}<description>${e(p.excerpt)}</description></item>`).join('')}</channel></rss>`);
      }
    }]
  };
});
