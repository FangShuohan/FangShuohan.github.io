import {test,expect} from '@playwright/test';

test('reader waits for delayed fonts and finishes the visible animation',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  let releaseFonts;
  const fontsHeld=new Promise(resolve=>{releaseFonts=resolve;});
  await page.route('**/*.woff2',async route=>{await fontsHeld;await route.continue();});
  const states=[];
  await page.exposeFunction('recordReaderState',state=>states.push(state));
  await page.addInitScript(()=>{
    new MutationObserver(records=>{
      for(const {target} of records)if(target.classList?.contains('reader-opening')){
        window.recordReaderState({fonts:document.fonts.status,preparing:target.classList.contains('reader-preparing')});
      }
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
  });
  try {
    await page.goto('/posts/diary1/',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>page.evaluate(()=>document.fonts.status)).toBe('loading');
    // Reproduce a font load longer than the old fixed 1.2-second cleanup timer.
    await page.waitForTimeout(1500);
    await expect(page.locator('.reader-opening')).toHaveCount(0);
    releaseFonts();
    await expect.poll(()=>states.some(s=>!s.preparing)).toBe(true);
    expect(states.every(s=>s.fonts==='loaded')).toBe(true);
    await expect(page.locator('.reader-opening')).toHaveCount(0);
    await expect(page.locator('.article-header h1')).toHaveCSS('opacity','1');
    await expect(page.locator('.article-header h1')).toHaveCSS('clip-path','none');
  } finally {releaseFonts();}
});

test('article reveal waits until the cross-page snapshot is gone',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/assets/*.css',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\n::view-transition-new(root){animation-duration:2s!important}'});
  });
  await page.goto('/archives/');
  await page.locator('a[href="/posts/diary1/"]').click();
  await expect(page.locator('.reader-preparing')).toHaveCount(1);
  const during=await page.evaluate(()=>document.getAnimations().map(a=>({name:a.animationName,state:a.playState})));
  expect(during.some(a=>a.name==='page-in'&&a.state==='running')).toBe(true);
  expect(during.some(a=>a.name==='reader-title'&&a.state==='paused')).toBe(true);
  await expect(page.locator('.reader-preparing')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.getAnimations().some(a=>a.animationName==='reader-title'&&a.playState==='running'))).toBe(true);
  await expect(page.locator('.reader-opening')).toHaveCount(0);
});

test('reduced motion and chapter links remain immediate',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/posts/diary1/');
  await expect(page.locator('.reader-opening')).toHaveCount(0);
  await expect(page.locator('.article-header h1')).toHaveCSS('opacity','1');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/posts/diary1/#section-1');
  await expect(page.locator('.reader-opening')).toHaveCount(0);
});
