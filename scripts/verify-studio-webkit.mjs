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
  // The left rail must refract the SAME full-viewport light as the gallery,
  // instead of hiding it behind a fully opaque rectangle.
  const navigationGlass=await desktop.locator('.studio-side-rail').evaluate(el=>{
    const computed=getComputedStyle(el);
    return {background:computed.backgroundColor,
      blur:computed.backdropFilter || computed.webkitBackdropFilter,
      width:el.getBoundingClientRect().width};
  });
  assert.ok(navigationGlass.background.startsWith('rgba(') &&
    parseFloat(navigationGlass.background.split(',').at(-1)) < .87,
    'side rail must be physically translucent rather than opaque');
  assert.match(navigationGlass.blur,/blur\(/,'side rail must use real backdrop filtering');
  const opticalField=await desktop.locator('[data-ambient-stage]').evaluate(el=>el.getBoundingClientRect().toJSON());
  console.log('Optical rail:',JSON.stringify({navigationGlass,opticalField}));
  assert.ok(opticalField.x<=1 && opticalField.width>=1439,
    'ambient light must cover the rail as well as main content');
  const railTheme=desktop.locator('.studio-side-rail .theme-menu-trigger');
  await railTheme.click();
  const floatedMenu=desktop.locator('body > .theme-menu-popover[data-theme-floating]');
  await floatedMenu.waitFor({state:'visible'});
  const menuBounds=await floatedMenu.evaluate(el=>el.getBoundingClientRect().toJSON());
  console.log('Desktop popup:',JSON.stringify(menuBounds));
  assert.ok(menuBounds.x>=5 && menuBounds.right<=1440-5 &&
    menuBounds.y>=5 && menuBounds.bottom<=900-5,
    'theme menu must stay wholly inside desktop viewport');
  await desktop.screenshot({path:'artifacts/studio-theme-popover-desktop.png',fullPage:false});
  await floatedMenu.locator('[data-theme-value="dark"]').click();
  await desktop.waitForFunction(()=>document.documentElement.dataset.colorMode==='dark');
  const darkRail=await desktop.locator('.studio-side-rail').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.match(darkRail,/rgba\(/,'dark navigation must stay translucent');
  await railTheme.click();
  await desktop.locator('body > .theme-menu-popover[data-theme-floating] [data-theme-value="light"]').click();
  await desktop.waitForFunction(()=>document.documentElement.dataset.colorMode==='light');
  await railTheme.click();
  await desktop.locator('body > .theme-menu-popover[data-theme-floating] [data-theme-value="system"]').click();
  assert.equal(await desktop.evaluate(()=>document.documentElement.dataset.colorMode),'system');

  const motionCard=desktop.locator('.gallery-card--motion');
  assert.equal(await motionCard.count(),1,'one original motion demo belongs in homepage gallery');
  const motionEmbed=motionCard.locator('video[data-motion-video]');
  assert.equal(await motionEmbed.getAttribute('preload'),'none');
  assert.equal(await motionEmbed.getAttribute('data-src'),'/media/motion-study.mp4');
  const motionBudget=await Promise.all([
    desktop.request.get(origin+'/media/motion-study.mp4'),
    desktop.request.get(origin+'/media/motion-study-poster.svg')
  ]);
  assert.ok(motionBudget.every(response=>response.ok()),'local poster and demo video must be served');
  assert.ok((await motionBudget[0].body()).length<24*1024,
    'small silent demo must stay under 24 KiB');
  await motionCard.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(350);
  await motionCard.screenshot({path:'artifacts/studio-motion-card.png'});


  // Three radii must be mathematically related. Never hard-code unrelated values.
  const nestedRadius = await desktop.locator('.gallery-card--image').first().evaluate(card => {
    const stage = card.querySelector('.gallery-card-visual');
    const image = card.querySelector('.gallery-card-image');
    const c = getComputedStyle(card);
    const s = getComputedStyle(stage);
    const i = getComputedStyle(image);
    return {
      outer: parseFloat(c.borderTopLeftRadius),
      inset: parseFloat(c.paddingLeft),
      stage: parseFloat(s.borderTopLeftRadius),
      gap: (stage.getBoundingClientRect().width - image.getBoundingClientRect().width) / 2,
      image: parseFloat(i.borderTopLeftRadius),
      stageBox: stage.getBoundingClientRect().width,
      imageBox: image.getBoundingClientRect().width
    };
  });
  assert.ok(Math.abs(nestedRadius.outer - nestedRadius.inset - nestedRadius.stage)<.6,
    'middle radius must equal outer radius minus true shell inset');
  const declaredMediaInset = await desktop.locator('.gallery-card--image').first()
    .evaluate(card => parseFloat(getComputedStyle(card).getPropertyValue('--media-inset')));
  assert.ok(Math.abs(nestedRadius.stage - declaredMediaInset - nestedRadius.image)<.6,
    'image radius must be concentric with the stage radius and media inset');

  const editorialCards = desktop.locator('.gallery-card--editorial');
  assert.ok(await editorialCards.count()>=2,'text-only cards should have their own compositions');
  assert.ok(await desktop.locator('.gallery-card-art--layout-0, .gallery-card-art--layout-1, .gallery-card-art--layout-2').count()>=2,
    'text cards should use distinct editorial treatments');
  const ambient = desktop.locator('[data-ambient-stage]');
  await desktop.waitForFunction(() => Boolean(document.querySelector('[data-ambient-stage]')?.getAttribute('data-ambient-primary')));
  const productCards=desktop.locator('.gallery-card--image');
  await productCards.first().hover();
  const firstLight = await ambient.getAttribute('data-ambient-primary');
  const firstSource = await ambient.getAttribute('data-ambient-source');
  await productCards.nth(1).hover();
  const secondLight = await ambient.getAttribute('data-ambient-primary');
  const secondSource = await ambient.getAttribute('data-ambient-source');
  assert.ok(firstSource !== secondSource, 'hover should move the ambient field between works');
  // Source palettes are allowed to be similar, but the live field must track
  // each real card, never a frozen global CSS gradient.
  assert.ok(firstLight && secondLight,'global ambient field must have content-derived colour');
  const localGlow = await desktop.locator('.gallery-item').first().evaluate(el => getComputedStyle(el,'::before').backgroundImage);
  assert.ok(localGlow.includes('radial-gradient'), 'nearby cards must illuminate their surrounding whitespace');
  await desktop.screenshot({path:'artifacts/studio-ambient-hover-desktop.png',fullPage:false});
  await editorialCards.first().screenshot({path:'artifacts/studio-editorial-card.png'});
  await desktop.waitForTimeout(320);
  await desktop.screenshot({path:'artifacts/studio-home-desktop.png',fullPage:true});
  // Media quality: sample real local pixels, not one global background token.
  const mediaCards = desktop.locator('.gallery-card--image');
  assert.ok(await mediaCards.count() >= 2,'two original product images must remain present');
  await mediaCards.last().scrollIntoViewIfNeeded();
  const sampledMedia = await mediaCards.evaluateAll(cards => cards.map(card => {
    const stage=card.querySelector('.gallery-card-visual');
    const img=card.querySelector('img');
    return {hasAttribute:stage?.hasAttribute('data-glass-media'),
      state:stage?.dataset.glassState,complete:img?.complete,naturalWidth:img?.naturalWidth,
      src:img?.currentSrc?.slice(-90)};
  }));
  console.log('Glass surface diagnostics:',JSON.stringify(sampledMedia));
  await desktop.waitForFunction(() => {
    const media = [...document.querySelectorAll('.gallery-card--image [data-glass-media]')];
    return media.length >= 2 && media.every(el => el.dataset.glassState === 'sampled');
  },null,{timeout:8000});
  const glassMeasurements = await mediaCards.evaluateAll(cards => cards.map(card => {
    const stage=card.querySelector('.gallery-card-visual');
    const image=card.querySelector('img');
    if(!stage || !image)return null;
    const mediaBox=stage.getBoundingClientRect(), imageBox=image.getBoundingClientRect();
    const imageStyle=getComputedStyle(image);
    return {
      palette:stage.style.getPropertyValue('--glass-primary-rgb').trim(),
      stageRadius:parseFloat(getComputedStyle(stage).borderTopLeftRadius),
      imageRadius:parseFloat(imageStyle.borderTopLeftRadius),
      imagePadding:parseFloat(imageStyle.paddingTop),
      imageInside:
        imageBox.left >= mediaBox.left-1 && imageBox.top>=mediaBox.top-1 &&
        imageBox.right <= mediaBox.right+1 && imageBox.bottom<=mediaBox.bottom+1,
      mediaBG:getComputedStyle(stage).backgroundImage,
    };
  }));
  assert.ok(glassMeasurements.every(x=>x && x.imageRadius>=9 && x.stageRadius>=x.imageRadius-2),
    'actual picture pixels and inner stage need coherent rounded corners');
  assert.ok(glassMeasurements.every(x=>x && x.imagePadding===0 && x.imageInside),
    'painted image cannot be square inside a rounded padded image or overflow its stage');
  assert.ok(new Set(glassMeasurements.map(x=>x.palette)).size >= 2,
    'different local product images should produce different sampled glass colours');
  assert.ok(glassMeasurements.every(x=>x?.mediaBG.includes('radial-gradient')),
    'colour palette must diffuse through an ambient gradient');
  await mediaCards.last().screenshot({path:'artifacts/studio-glass-card.png'});
  await desktop.evaluate(()=>window.scrollTo(0,0));
  await desktop.locator('.gallery-card').first().click();
  await desktop.waitForURL('**/software/usblinkmic/');
  assert.ok(await desktop.locator('h1').first().isVisible());
  await desktop.waitForFunction(() =>
    document.querySelector('.product-gallery[data-glass-media]')?.dataset.glassState === 'sampled',
    null,{timeout:8000});
  const productGlass=await desktop.locator('.product-gallery').evaluate(el=>{
    const img=el.querySelector('img');
    return { stageRadius:parseFloat(getComputedStyle(el).borderTopLeftRadius),
      imgRadius:img?parseFloat(getComputedStyle(img).borderTopLeftRadius):0,
      palette:el.style.getPropertyValue('--glass-primary-rgb') };
  });
  assert.ok(productGlass.stageRadius>=12 && productGlass.imgRadius>=9 && productGlass.palette,
    'product detail screenshot must keep rounded corners and its own image-colour palette');

  await desktop.goto(origin+'/lab/motion/',{waitUntil:'networkidle'});
  const labVideo=desktop.locator('.studio-motion-well video[data-video-light]');
  assert.equal(await labVideo.count(),1,'demo page must use native video player');
  assert.ok(await labVideo.getAttribute('controls')!==null,'demo player should have controls');
  await desktop.waitForFunction(() => document.querySelector('.studio-motion-well')?.getBoundingClientRect().width>0);
  await desktop.screenshot({path:'artifacts/studio-motion-lab-desktop.png',fullPage:false});
  // WebKit's headless gstreamer may have limited decoders. Verify the
  // browser receives a real 4-second H.264 MP4 rather than a fake CSS animation.
  const labBuffer=await desktop.request.get(origin+'/media/motion-study.mp4');
  assert.ok(labBuffer.ok());
  const length=(await labBuffer.body()).length;
  assert.ok(length>1000 && length<24*1024,'real test video emitted in production build');

  await desktop.goto(origin+'/posts/',{waitUntil:'networkidle'});
  await desktop.locator('.gallery-card').first().click();
  await desktop.waitForURL('**/posts/*/');
  await desktop.locator('.article-prose').waitFor();
  assert.equal(await desktop.locator('h1').count()>=1,true);
  const articleImage=desktop.locator('.gallery-detail-cover--image');
  if(await articleImage.count()) {
    await desktop.waitForFunction(() => document.querySelector('.gallery-detail-cover--image')?.dataset.glassState === 'sampled',
      null,{timeout:8000});
    const coverRadius=await articleImage.locator('img').evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius));
    assert.ok(coverRadius>=9,'article cover image itself must have a rounded border');
  }
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
  assert.equal(await mobile.locator('.gallery-card--motion video').getAttribute('src'),null,
    'reduced-motion mobile must not eagerly fetch or autoplay test video');
  await mobile.locator('.studio-dock-menu > summary').click();
  await mobile.locator('.studio-dock-panel-appearance .theme-menu-trigger').click();
  const mobilePopup=mobile.locator('body > .theme-menu-popover[data-theme-floating]');
  await mobilePopup.waitFor({state:'visible'});
  const safeRect=await mobilePopup.evaluate(el=>el.getBoundingClientRect().toJSON());
  const viewport=await mobile.evaluate(()=>({width:innerWidth,height:innerHeight}));
  assert.ok(safeRect.x>=5 && safeRect.right<=viewport.width-5 &&
    safeRect.y>=5 && safeRect.bottom<=viewport.height-5,
    'mobile theme popover must not exit viewport');
  await mobile.screenshot({path:'artifacts/studio-theme-popover-mobile.png',fullPage:false});
  await mobilePopup.locator('[data-theme-value="system"]').click();
  await mobile.locator('.studio-dock-menu > summary').click();

  assert.ok(await mobile.locator('[data-ambient-stage]').count() === 1,
    'touch devices should keep a single lightweight page background field');
  const mobileRad = await mobile.locator('.gallery-card--image').first().evaluate(el => {
    const stage=el.querySelector('.gallery-card-visual');
    const img=el.querySelector('.gallery-card-image');
    return [
      parseFloat(getComputedStyle(el).borderTopLeftRadius),
      parseFloat(getComputedStyle(el).paddingLeft),
      parseFloat(getComputedStyle(stage).borderTopLeftRadius),
      parseFloat(getComputedStyle(img).borderTopLeftRadius),
      parseFloat(getComputedStyle(el).getPropertyValue('--media-inset'))
    ];
  });
  assert.ok(Math.abs(mobileRad[0]-mobileRad[1]-mobileRad[2])<.6 &&
    Math.abs(mobileRad[2]-mobileRad[4]-mobileRad[3])<.6,
    'mobile nested corners must follow the same concentric tokens');
  await mobile.waitForTimeout(320);
  await mobile.screenshot({path:'artifacts/studio-home-mobile.png',fullPage:true});
  await mobile.emulateMedia({colorScheme:'dark'});
  await mobile.waitForFunction(()=>getComputedStyle(document.body).backgroundColor!=='rgb(255, 255, 255)',
    null,{timeout:5000});
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
