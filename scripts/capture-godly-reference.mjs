/**
 * Visual reference capture for Godly. Public pages only, optional:
 * network failures must never cause MYZJX deployment tests to fail.
 */
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
let browser;
try {
  mkdirSync('artifacts',{recursive:true});
  browser=await webkit.launch({headless:true});
  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  await desktop.goto('https://godly.design/sites/',{waitUntil:'domcontentloaded',timeout:20000});
  await desktop.waitForTimeout(1000);
  await desktop.screenshot({path:'artifacts/godly-reference-desktop.png'});
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await mobile.goto('https://godly.design/sites/',{waitUntil:'domcontentloaded',timeout:20000});
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({path:'artifacts/godly-reference-mobile.png'});
  await desktop.goto('https://godly.design/website/rulebase/',{waitUntil:'domcontentloaded',timeout:20000});
  await desktop.waitForTimeout(800);
  await desktop.screenshot({path:'artifacts/godly-reference-detail.png'});
  console.log('Godly visual references captured');
}catch(error){
  console.warn('Optional external Godly reference unavailable:',error instanceof Error?error.message:String(error));
}finally{await browser?.close();}
