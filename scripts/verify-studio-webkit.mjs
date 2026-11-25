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
  {stdio:['ignore','pipe','pipe'],detached:true,env:{...process.env,ASTRO_PREVIEW_BACKGROUND:'1'}});
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
  const totalItems = await desktop.locator('.gallery-item').count();
  assert.ok(await desktop.locator('.gallery-card-visual').count() >= 8,
    'all software product media must be rendered in optical stage frames');
  assert.equal(await desktop.locator('.gallery-visual-category').count(), 0,
    'top-left floating overlay pill must not cover macOS window traffic lights');
  assert.ok(await desktop.locator('.gallery-card-app-icon').count() >= 8,
    'software cards must display authentic 22x22 squircle app icons beside titles');
  await desktop.locator('[data-gallery-filter="writing"]').click();
  const visibleWrites = await desktop.locator('.gallery-item:not([hidden])').count();
  assert.ok(visibleWrites > 0 && visibleWrites < totalItems,'category filter narrows results');
  await desktop.locator('[data-gallery-filter="all"]').click();
  assert.equal(await desktop.locator('.gallery-item:not([hidden])').count(),totalItems);
  assert.equal(await desktop.locator('.studio-side-rail').evaluate(el=>getComputedStyle(el).position),'fixed');
  assert.equal(await desktop.locator('.gallery-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
  await ensureWithinViewport(desktop,'desktop homepage');
  // The left rail must be physically translucent Liquid Glass over a static ambient field.
  const navigationGlass=await desktop.locator('.studio-side-rail').evaluate(el=>{
    const computed=getComputedStyle(el);
    const ambient=getComputedStyle(document.body,'::before').backgroundImage;
    return {background:computed.backgroundColor,
      gradient:computed.backgroundImage,
      blur:computed.backdropFilter || computed.webkitBackdropFilter,
      ambient,
      width:el.getBoundingClientRect().width};
  });
  assert.ok(navigationGlass.background.startsWith('rgba(') &&
    parseFloat(navigationGlass.background.split(',').at(-1)) < .87,
    'side rail must be physically translucent rather than opaque');
  assert.match(navigationGlass.blur,/blur\(/,'side rail must use real backdrop filtering');
  assert.match(navigationGlass.ambient,/radial-gradient/,'static ambient light field must back the liquid glass rail');
  assert.ok(await desktop.locator('.liquid-nav-pill').count() >= 2,
    'spring-driven liquid gliding pill must be mounted on navigation containers');

  // Verify 3-State Segmented Liquid Glass Theme Switcher
  const segmented=desktop.locator('.studio-side-rail .theme-segmented');
  await segmented.waitFor({state:'visible'});
  await segmented.locator('[data-theme-value="dark"]').click();
  await desktop.waitForFunction(()=>document.documentElement.dataset.colorMode==='dark');
  const darkRail=await desktop.locator('.studio-side-rail').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.match(darkRail,/rgba\(/,'dark navigation must stay translucent');
  await desktop.screenshot({path:'artifacts/studio-home-designed-dark.png',fullPage:true});
  await segmented.locator('[data-theme-value="light"]').click();
  await desktop.waitForFunction(()=>document.documentElement.dataset.colorMode==='light');
  await segmented.locator('[data-theme-value="system"]').click();
  assert.equal(await desktop.evaluate(()=>document.documentElement.dataset.colorMode),'system');
  await desktop.screenshot({path:'artifacts/studio-home-desktop.png',fullPage:true});

  // Public theme regression: genuine button contrast in light & dark mode on /about/
  const colorAudit=await browser.newPage({viewport:{width:1440,height:900}});
  await colorAudit.goto(origin+'/about/',{waitUntil:'networkidle'});
  const auditButton=colorAudit.locator('.about-prose .btn-primary').first();
  const readButton=()=>auditButton.evaluate(el=>{
    const style=getComputedStyle(el);
    return {text:el.textContent?.trim(),fg:style.color,bg:style.backgroundColor};
  });
  const contrastRatio=({fg,bg})=>{
    const channels=value=>(value.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
    const lum=value=>{
      const [r,g,b]=channels(value).map(c=>{
        const x=c/255;
        return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
      });
      return r*.2126+g*.7152+b*.0722;
    };
    const a=lum(fg),b=lum(bg);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  await colorAudit.evaluate(()=>{document.documentElement.dataset.colorMode='light';});
  const aboutLight=await readButton();
  assert.ok(aboutLight.text?.includes('GitHub') && contrastRatio(aboutLight)>=4.5,
    'GitHub link label must be visible on its button in light mode: '+JSON.stringify(aboutLight));
  await colorAudit.screenshot({path:'artifacts/studio-about-button-light.png'});
  await colorAudit.evaluate(()=>{document.documentElement.dataset.colorMode='dark';});
  const aboutDark=await readButton();
  assert.ok(contrastRatio(aboutDark)>=4.5,
    'GitHub link label must be visible on its button in dark mode: '+JSON.stringify(aboutDark));
  await auditButton.scrollIntoViewIfNeeded();
  await colorAudit.screenshot({path:'artifacts/studio-about-button-dark.png'});
  await colorAudit.close();

  // Verify Bento image cards & editorial cards
  const mediaGeometry=await desktop.locator('.gallery-card--image').evaluateAll(cards =>
    cards.map(card => {
      const frame=card.querySelector('.gallery-card-visual');
      const img=card.querySelector('.gallery-card-image');
      const inner=getComputedStyle(frame);
      const pixels=getComputedStyle(img);
      return {
        innerRadius:parseFloat(inner.borderTopLeftRadius),
        padding:parseFloat(inner.paddingLeft),
        fit:pixels.objectFit
      };
    })
  );
  assert.ok(mediaGeometry.length >= 8, 'all 8 software cards must use optical stage frames');
  for (const media of mediaGeometry) {
    assert.ok(media.innerRadius >= 14 && media.padding >= 14 && media.fit === 'contain',
      'card media must sit uncropped (object-fit: contain) inside a padded optical stage');
  }
  const editorialCards = desktop.locator('.gallery-card--editorial');
  assert.ok(await editorialCards.count() >= 2, 'text-only cards should use clean single-title editorial surfaces');

  // Verify Software Launch Page (/software/usblinkmic/) Multi-View Optical Stage
  await desktop.evaluate(()=>window.scrollTo(0,0));
  await desktop.locator('.gallery-card[href="/software/usblinkmic/"]').first().click();
  await desktop.waitForURL('**/software/usblinkmic/');
  assert.ok(await desktop.locator('h1').first().isVisible());
  const launchInfo = await desktop.evaluate(() => {
    const stage = document.querySelector('.launch-stage-frame');
    const subnav = document.querySelector('.launch-subnav');
    const trustFirst = document.querySelector('.launch-trust-cell dd')?.textContent?.trim() || '';
    return {
      stageRadius: stage ? parseFloat(getComputedStyle(stage).borderTopLeftRadius) : 0,
      subnavBlur: subnav ? (getComputedStyle(subnav).backdropFilter || getComputedStyle(subnav).webkitBackdropFilter) : '',
      tabs: document.querySelectorAll('[data-stage-tab]').length,
      trustFirst,
      legacyPanels: document.querySelectorAll('.acquisition-panel,.version-table').length,
      overflowX: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  assert.ok(launchInfo.stageRadius >= 20, 'software launch stage must use a 24px rounded optical frame');
  assert.match(launchInfo.subnavBlur, /blur\(/, 'software sub-topbar must use liquid glass blur');
  assert.ok(launchInfo.tabs >= 2, 'software launch stage must provide multi-view stage tabs');
  assert.equal(launchInfo.legacyPanels, 0, 'legacy acceptance-checklist panels must remain removed');
  assert.ok(launchInfo.overflowX <= 1, 'software launch page must not overflow horizontally');
  if (launchInfo.tabs >= 2) {
    await desktop.locator('[data-stage-tab="1"]').click();
    assert.equal(await desktop.locator('[data-stage-pane="1"]').getAttribute('hidden'), null,
      'clicking second stage tab must reveal second stage pane');
  }

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
  assert.equal(await mobile.locator('.studio-kinetic-field').count(),0,
    'touch/reduced-motion devices must not allocate pointer-light surfaces');
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
  await mobile.locator('.studio-dock-panel-appearance [data-theme-value="dark"]').click();
  await mobile.waitForFunction(()=>document.documentElement.dataset.colorMode==='dark');
  await mobile.locator('.studio-dock-panel-appearance [data-theme-value="system"]').click();
  await mobile.locator('.studio-dock-menu > summary').click();
  assert.equal(await mobile.locator('.gallery-grid').first().getAttribute('data-masonry'), null,
    'single-column mobile layout must retain natural document order');
  await ensureWithinViewport(mobile,'mobile homepage');
  assert.equal(await mobile.locator('.gallery-card--motion video').count(),0,
    'homepage must not render placeholder motion study video cards');

  // The last page element is the large brand wordmark; its bottom clearance
  // must reserve the fixed dock (64px + bottom offset) on iPhone Safari.
  const mobileFooter = await mobile.locator('.site-footer').evaluate(footer => {
    const dock=document.querySelector('.studio-mobile-dock');
    const dockStyle=getComputedStyle(dock);
    const dockHeight=dock.getBoundingClientRect().height;
    const dockBottom=parseFloat(dockStyle.bottom);
    const pad=parseFloat(getComputedStyle(footer).paddingBottom);
    return {
      last:footer.lastElementChild?.className,
      removedBottom:footer.querySelectorAll('.studio-footer-bottom').length,
      pad,dockHeight,dockBottom
    };
  });
  assert.ok(mobileFooter.last.includes('studio-footer-wordmark') &&
    mobileFooter.removedBottom===0,
    'giant MYZJX is retained as the final footer element');
  assert.ok(mobileFooter.pad >= mobileFooter.dockHeight+mobileFooter.dockBottom+16,
    'mobile footer must leave clear space below giant wordmark and above the fixed dock');
  await mobile.waitForTimeout(320);
  await mobile.screenshot({path:'artifacts/studio-home-mobile.png',fullPage:true});
  await mobile.screenshot({path:'artifacts/studio-chromatic-mobile.png',fullPage:false});
  await mobile.emulateMedia({colorScheme:'dark'});
  await mobile.waitForFunction(()=>getComputedStyle(document.body).backgroundColor!=='rgb(255, 255, 255)',
    null,{timeout:5000});
  const darkSurface = await mobile.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(darkSurface,'rgb(255, 255, 255)','system dark mode must not show a white canvas');
  await mobile.screenshot({path:'artifacts/studio-home-mobile-dark.png',fullPage:false});
  await mobile.emulateMedia({colorScheme:'light'});

  // Verify mobile /posts/ search input >= 16px (prevents iPhone Safari auto-zoom)
  // and verify all newly added/updated articles for zero horizontal overflow, mobile TOC, code copy, and dual nav.
  const runtimeErrors = [];
  const onPageError = (err) => runtimeErrors.push(String(err));
  mobile.on('pageerror', onPageError);
  desktop.on('pageerror', onPageError);

  await mobile.goto(origin+'/posts/',{waitUntil:'networkidle'});
  await ensureWithinViewport(mobile,'mobile /posts/ index');
  const postSearchSize = await mobile.locator('#post-search').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(postSearchSize >= 16, 'iPhone /posts/ search input must be >= 16px to prevent focus auto-zoom, got ' + postSearchSize);

  for (const slug of [
    'single-domain-private-digital-space',
    'webkit-assertions-over-visual-guessing',
    'paopao-ai-edtech-product-practice'
  ]) {
    await mobile.goto(`${origin}/posts/${slug}/`, { waitUntil: 'networkidle' });
    await ensureWithinViewport(mobile, `mobile /posts/${slug}/`);
    const headingCount = await mobile.locator('.article-prose :is(h2, h3)').count();
    if (headingCount > 0) {
      assert.equal(await mobile.locator('.article-mobile-toc').evaluate(el => getComputedStyle(el).display), 'block',
        `mobile foldable TOC must be visible on /posts/${slug}/ when headings exist`);
    } else {
      assert.equal(await mobile.locator('.article-mobile-toc').count(), 0,
        `mobile foldable TOC must not render empty shell on /posts/${slug}/ when headings are absent`);
      assert.equal(await mobile.locator('.article-rail').count(), 0,
        `desktop TOC rail must not render empty shell on /posts/${slug}/ when headings are absent`);
    }
  }

  await desktop.goto(origin+'/posts/single-domain-private-digital-space/',{waitUntil:'networkidle'});
  await ensureWithinViewport(desktop,'desktop /posts/single-domain-private-digital-space/');
  assert.ok(await desktop.locator('.code-copy-btn').count() >= 1, 'code blocks must have progressive copy buttons');
  assert.ok(await desktop.locator('.next-article-card').count() >= 1, 'article must render prev/next navigation');
  assert.equal(runtimeErrors.length, 0, 'unexpected pageerror during article verification: ' + runtimeErrors.join('; '));
  mobile.off('pageerror', onPageError);
  desktop.off('pageerror', onPageError);

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
  const appGlass=await desktop.locator('.studio-app-glass').evaluateAll(elements => elements.map(el => ({
    radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),
    background:getComputedStyle(el).backgroundImage,
    previewRadius:parseFloat(getComputedStyle(el.querySelector('.studio-preview-window')).borderTopLeftRadius)
  })));
  assert.equal(appGlass.length,3);
  assert.ok(appGlass.every(x=>x.radius>=13 && x.previewRadius>=10 && x.background.includes('radial-gradient')),
    'private app previews should have rounded, softly tinted windows');
  assert.ok(new Set(appGlass.map(x=>x.background)).size>=3,'private app tint should match its own content');
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
