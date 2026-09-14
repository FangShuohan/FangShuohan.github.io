import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('.generated/content.json','utf8'));
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{sessionStorage.setItem('shuohan-entered','1');localStorage.setItem('shuohan-effects','off');});
});
test('all eight articles are readable at direct static URLs, with original media and math',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  for(const p of data.posts){
    await page.goto(p.path);
    await expect(page.locator('.article-header h1')).toHaveText(p.title);
    if(p.content.trim())await expect(page.locator('.prose')).not.toBeEmpty();
    if(p.images.length){await page.locator('.prose img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await expect.poll(()=>page.locator('.prose img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),{timeout:30000}).toBe(true);}
    await expect(page.locator('.katex-error')).toHaveCount(0);
    if(p.slug.includes('模拟电子')){
      expect(await page.locator('.katex').count()).toBeGreaterThan(10);
      await expect(page.locator('.prose [id="section-1"]')).toContainText('第一章');
      await expect(page.locator('.prose strong').filter({hasText:'负温度系数'})).toHaveCount(1);
      await page.screenshot({path:'verification/article-electronics.png',fullPage:false});
    }
    if(p.slug==='diary1')expect(await page.locator('input.task-list-item-checkbox').count()).toBeGreaterThan(5);
    if(p.slug.includes('货币'))expect(await page.locator('table').count()).toBeGreaterThan(2);
    await page.reload();await expect(page.locator('.article-header h1')).toHaveText(p.title);
  }
  expect(errors).toEqual([]);expect(missing).toEqual([]);
});
test('search, categories, tags, about and theme persistence',async({page})=>{
  await page.goto('/');await expect(page.locator('.file-card')).toHaveCount(8);
  await page.locator('[data-filter="日记"]').click();await expect(page.locator('.file-card:visible')).toHaveCount(3);
  await page.locator('[data-filter=""]').click();await page.locator('#index-search').fill('半导体');await expect(page.locator('.file-card:visible')).toHaveCount(1);
  await page.locator('#index-search').fill('不存在的检索词abcdefgh');await expect(page.locator('.empty-state')).toBeVisible();
  await page.getByRole('button',{name:'搜索文章',exact:true}).click();await page.locator('#global-search').fill('边际');
  await expect(page.locator('.search-result')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('#search-dialog')).not.toBeVisible();
  await page.locator('[data-action=theme]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.goto('/tag/?tag=Diary');await expect(page.locator('.file-card:visible')).toHaveCount(3);
  await page.goto('/category/?category='+encodeURIComponent('笔记'));await expect(page.locator('.file-card:visible')).toHaveCount(3);
  await page.goto('/about/');await expect(page.locator('.about-page')).toContainText('方朔寒&凛冬');
  await page.goto('/archives/');await expect(page.locator('.archive-row')).toHaveCount(8);
});
test('mobile reading, table scrolling, TOC and image dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');await page.screenshot({path:'verification/home-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const p=data.posts.find(p=>p.slug.includes('模拟电子'));await page.goto(p.path);
  await expect(page.locator('.prose strong').filter({hasText:'负温度系数'})).toHaveCount(1);
  await page.locator('.mobile-toc summary').click();await expect(page.locator('.mobile-toc nav')).toBeVisible();
  await page.locator('.mobile-toc a').nth(3).click();await expect(page).toHaveURL(/#section-4$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const img=page.locator('.prose img').first();await img.click();await expect(page.locator('#image-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#image-dialog')).not.toBeVisible();
  await page.goto(data.posts.find(p=>p.slug.includes('货币')).path);
  await page.screenshot({path:'verification/article-mobile.png',fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.table-scroll').first().evaluate(el=>el.scrollLeft=el.scrollWidth);
});
test('articles retain text and formulas with JavaScript disabled',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  const p=data.posts.find(p=>p.slug.includes('货币'));
  await page.goto('http://127.0.0.1:4173'+p.path);
  await expect(page.locator('.article-header h1')).toHaveText(p.title);
  expect(await page.locator('.katex').count()).toBeGreaterThan(20);
  await expect(page.locator('table').first()).toBeVisible();await context.close();
});
test('the original glass scene renders, selects, extracts and releases resources @gpu',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('shuohan-effects','on'));
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('/');await expect(page.locator('#archive-stage')).toHaveClass(/scene-ready/,{timeout:60000});
  await expect(page.locator('#archive-scene canvas')).toHaveCount(1);
  await page.waitForTimeout(2200);await page.screenshot({path:'verification/home-desktop.png',fullPage:false});
  const previous=await page.locator('#selected-title').textContent();await page.locator('[data-action=next]').click();await expect(page.locator('#selected-title')).not.toHaveText(previous);
  await page.locator('[data-action=inspect]').click();await expect(page.locator('[data-action=inspect]')).toContainText('收回');
  await page.waitForTimeout(1200);await page.screenshot({path:'verification/home-extracted.png',fullPage:false});
  await page.locator('[data-action=theme]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.waitForTimeout(1000);await page.screenshot({path:'verification/home-dark.png',fullPage:false});
  await page.locator('[data-action=effects]').click();await expect(page.locator('#archive-scene canvas')).toHaveCount(0);await page.locator('[data-action=previous]').click();await expect(page.locator('#selected-title')).toHaveText(previous);
  expect(errors).toEqual([]);expect(missing).toEqual([]);
});
