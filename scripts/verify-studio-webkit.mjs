/**
 * WebKit integration smoke of public gallery + private app shell.
 * Uses a local Astro preview with mocked private APIs. No production login,
 * external services or real private data are involved.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright';

const origin='http://127.0.0.1:4373';
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4373'],
  {stdio:['ignore','pipe','pipe'],detached:true});
let output='';
server.stdout.on('data',chunk=>output+=String(chunk).slice(0,1000));
server.stderr.on('data',chunk=>output+=String(chunk).slice(0,1000));
let browser;
async function awaitReady(){
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw Error('Preview exited: '+output);
    try{if((await fetch(origin+'/')).ok)return;}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error('Preview startup timeout: '+output);
}
async function ensureWithinViewport(page,label){
  const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(scroll<=width+4,label+' horizontal overflow '+scroll+' > '+width);
}
async function run(){
  await awaitReady();
  browser=await webkit.launch({headless:true});
  mkdirSync('artifacts',{recursive:true});

  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  await desktop.goto(origin+'/',{waitUntil:'networkidle'});
  await desktop.locator('.gallery-card').first().waitFor();
  assert.ok(await desktop.locator('.gallery-card').count()>=5,'home has gallery cards');
  const frameRatios = await desktop.locator('.gallery-card-visual').evaluateAll(elements =>
    elements.map(element => Number.parseFloat(getComputedStyle(element).aspectRatio))
  );
  assert.ok(new Set(frameRatios.map(value => value.toFixed(2))).size >= 3,
    'gallery frames should reflect source image and editorial contents rather than one fixed ratio');
  assert.equal(await desktop.locator('.gallery-art-shape').count(),0,
    'decorative rings must not mask content');
  assert.equal(await desktop.locator('.gallery-card-visual--has-image').count()>=2,true,
    'existing product media must remain in the gallery');
  await desktop.locator('[data-gallery-filter="writing"]').click();
  const visibleWrites = await desktop.locator('.gallery-item:not([hidden])').count();
  assert.ok(visibleWrites > 0 && visibleWrites < frameRatios.length,'category filter narrows results');
  await desktop.locator('[data-gallery-filter="all"]').click();
  assert.equal(await desktop.locator('.gallery-item:not([hidden])').count(),frameRatios.length);
  assert.equal(await desktop.locator('.studio-side-rail').evaluate(el=>getComputedStyle(el).position),'fixed');
  assert.equal(await desktop.locator('.gallery-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
  await desktop.waitForFunction(() => document.querySelector('.gallery-grid')?.dataset.masonry === 'true');
  await ensureWithinViewport(desktop,'desktop homepage');
  await desktop.waitForTimeout(320);
  await desktop.screenshot({path:'artifacts/studio-home-desktop.png',fullPage:true});
  await desktop.locator('.gallery-card').first().click();
  await desktop.waitForURL('**/software/usblinkmic/');
  assert.ok(await desktop.locator('h1').first().isVisible());
  await desktop.goto(origin+'/posts/',{waitUntil:'networkidle'});
  await desktop.locator('.gallery-card').first().click();
  await desktop.waitForURL('**/posts/*/');
  await desktop.locator('.article-prose').waitFor();
  assert.equal(await desktop.locator('h1').count()>=1,true);
  await desktop.waitForTimeout(380);
  await desktop.screenshot({path:'artifacts/studio-article-desktop.png',fullPage:true});

  const mobile=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'
  });
  await mobile.goto(origin+'/',{waitUntil:'networkidle'});
  assert.equal(await mobile.locator('.studio-mobile-dock').evaluate(el=>getComputedStyle(el).display),'flex');
  const mobileLogo = await mobile.locator('.studio-dock-brand').evaluate(el=>({
    text: el.textContent, bg: getComputedStyle(el).backgroundColor
  }));
  assert.match(mobileLogo.text,/MYZJX/);
  assert.ok(mobileLogo.bg==='rgba(0, 0, 0, 0)' || mobileLogo.bg==='transparent',
    'mobile branding should be a restrained wordmark instead of an oversized filled icon');
  const logoGeometry = await mobile.locator('.studio-dock-brand').evaluate(el => {
    const period = el.querySelector('span');
    return { container: el.getBoundingClientRect().top, period: period?.getBoundingClientRect().top,
      direction: getComputedStyle(el).flexDirection };
  });
  assert.equal(logoGeometry.direction,'row','mobile wordmark must not stack its period vertically');
  assert.ok(Math.abs((logoGeometry.period ?? 999) - logoGeometry.container) < 17,
    'brand punctuation must stay on the same line');
  const tapHeights = await mobile.locator('.studio-dock-links a, .studio-dock-menu > summary')
    .evaluateAll(elements => elements.map(el=>el.getBoundingClientRect().height));
  assert.ok(tapHeights.every(h=>h>=43.5),'touch navigation must have at least 44px hit targets');
  await mobile.locator('.studio-dock-menu > summary').click();
  assert.equal(await mobile.locator('.studio-dock-menu').evaluate(el=>el.open),true);
  await mobile.locator('.studio-dock-menu > summary').click();
  assert.equal(await mobile.locator('.gallery-grid').first().getAttribute('data-masonry'), null,
    'single-column mobile layout must retain natural document order');
  await ensureWithinViewport(mobile,'mobile homepage');
  await mobile.waitForTimeout(320);
  await mobile.screenshot({path:'artifacts/studio-home-mobile.png',fullPage:true});
  await mobile.emulateMedia({colorScheme:'dark'});
  await mobile.waitForTimeout(90);
  const darkSurface = await mobile.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(darkSurface,'rgb(255, 255, 255)','system dark mode must not show a white canvas');
  await mobile.screenshot({path:'artifacts/studio-home-mobile-dark.png',fullPage:false});
  await mobile.emulateMedia({colorScheme:'light'});
  const narrowPage = await browser.newPage({viewport:{width:320,height:730},isMobile:true,hasTouch:true});
  await narrowPage.goto(origin+'/',{waitUntil:'networkidle'});
  await ensureWithinViewport(narrowPage,'320px Safari homepage');
  assert.equal(await narrowPage.locator('.studio-mobile-dock').evaluate(el=>getComputedStyle(el).display),'flex');
  await narrowPage.close();
  const tablet = await browser.newPage({viewport:{width:768,height:900},isMobile:true,hasTouch:true});
  await tablet.goto(origin+'/',{waitUntil:'networkidle'});
  await ensureWithinViewport(tablet,'768px tablet homepage');
  assert.equal(await tablet.locator('.studio-side-rail').evaluate(el=>getComputedStyle(el).position),'fixed');
  await tablet.close();

  await desktop.goto(origin+'/admin-shell/apps/',{waitUntil:'networkidle'});
  assert.equal(await desktop.locator('.studio-app-card').count(),3);
  assert.equal(await desktop.locator('.studio-app-preview').count(),3,
    'private apps should show previews of the actual workflows');
  assert.equal(await desktop.locator('.studio-app-emblem').count(),0,
    'oversized symbol artwork should not return');
  await desktop.screenshot({path:'artifacts/studio-apps-desktop.png',fullPage:true});

  let saved={title:'',body:''};
  let revision=0;
  const history=[];
  await mobile.route('**/api/admin/session',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({csrfToken:'fake-for-test'})
  }));
  await mobile.route('**/api/admin/apps/studio-notes/documents/main**',async route=>{
    const request=route.request();
    const path=new URL(request.url()).pathname;
    const result=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(path.endsWith('/history'))return result({history:[...history].reverse()});
    if(path.endsWith('/restore'))return result({error:'Not tested'},422);
    if(request.method()==='GET')return result({content:saved,revision,updatedAt:revision?new Date().toISOString():null});
    if(request.method()==='PUT'){
      const input=request.postDataJSON();
      if(input.expectedRevision!==revision)return result({error:'conflict',code:'revision_conflict'},409);
      saved=input.content;revision+=1;history.push({revision,content:{...saved},savedAt:new Date().toISOString()});
      return result({content:saved,revision,updatedAt:new Date().toISOString(),saved:true});
    }
    return result({error:'unsupported'},405);
  });
  await mobile.goto(origin+'/admin-shell/apps/studio-notes/',{waitUntil:'networkidle'});
  await mobile.locator('#note-body:not([disabled])').waitFor();
  const size=await mobile.locator('#note-body').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(size>=16,'iPhone notes textarea >=16px to prevent focus zoom');
  await mobile.locator('#note-title').fill('跨设备测试');
  await mobile.locator('#note-body').fill('保存到 Cloudflare D1 的测试内容');
  await mobile.waitForFunction(()=>document.querySelector('#note-status')?.textContent?.includes('所有修改已保存'),null,{timeout:8000});
  assert.equal(saved.title,'跨设备测试');
  assert.equal(saved.body,'保存到 Cloudflare D1 的测试内容');
  assert.ok(revision>=1);
  await mobile.locator('#note-history').click();
  await mobile.locator('#note-history-panel:not([hidden])').waitFor();
  assert.ok(await mobile.locator('#note-history-list li').count()>=1);
  // Emulate a second device writing to D1 while the mobile editor is clean.
  saved={title:'Another device',body:'Remote changes were saved'};
  revision++;
  await mobile.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await mobile.waitForFunction(()=>document.querySelector('#note-title')?.value==='Another device',
    null,{timeout:6000});
  assert.equal(await mobile.locator('#note-body').inputValue(),'Remote changes were saved');
  mobile.on('dialog',dialog=>dialog.accept());
  await mobile.locator('#note-import-file').setInputFiles({
    name:'studio-backup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({
      format:'myzjx-private-app/v1',appId:'studio-notes',
      documentKey:'main',content:{title:'Restored backup',body:'Imported safely from JSON'}
    }))
  });
  await mobile.waitForFunction(()=>document.querySelector('#note-status')?.textContent?.includes('所有修改已保存'),
    null,{timeout:8000});
  assert.equal(saved.title,'Restored backup');
  // An unsynced local edit survives a browser restart and is reconciled by revision.
  await mobile.evaluate((rev)=>{
    localStorage.setItem('myzjx:studio-notes:unsynced:v1',JSON.stringify({
      title:'Recovered locally',body:'Offline draft survives reload',
      baseRevision:rev,timestamp:Date.now()
    }));
  }, revision);
  await mobile.reload({waitUntil:'networkidle'});
  await mobile.waitForFunction(()=>document.querySelector('#note-status')?.textContent?.includes('所有修改已保存'),
    null,{timeout:8000});
  assert.equal(saved.title,'Recovered locally');
  assert.equal(saved.body,'Offline draft survives reload');
  assert.equal(await mobile.evaluate(()=>localStorage.getItem('myzjx:studio-notes:unsynced:v1')),null);
  await ensureWithinViewport(mobile,'mobile notes');
  await mobile.screenshot({path:'artifacts/studio-notes-mobile.png',fullPage:true});

  console.log('Studio WebKit smoke PASS: desktop gallery, click-through, article detail, iPhone dock, autosave & history');
}
try{await run();}
finally{
  await browser?.close();
  if(server.pid){try{process.kill(-server.pid,'SIGTERM');}catch{server.kill('SIGTERM');}}
}
