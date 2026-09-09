import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { existsSync, globSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const base=process.env.TEST_URL||'http://127.0.0.1:8789/'
const fallback=process.platform==='win32'?globSync(`${process.env.LOCALAPPDATA.replaceAll('\\','/')}/ms-playwright/chromium-*/chrome-win64/chrome.exe`).pop():undefined
const executablePath=existsSync(chromium.executablePath())?undefined:fallback
const browser=await chromium.launch({executablePath})
const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']})
const page=await context.newPage()
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
await mkdir('output/playwright',{recursive:true})
const wait=()=>page.waitForFunction(()=>window.__ready===true)
const pixels=()=>page.locator('#stage canvas').evaluate(c=>c.toDataURL())
const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow')
const report=[]
try{
  await page.goto(base);await wait();await noOverflow()
  assert.equal(await page.locator('#rail .portrait').count(),6)
  await page.screenshot({path:'output/playwright/verified-home.png'})
  await page.locator('#namebar button').click()
  assert.match(await page.locator('#status').textContent(),/Enter a name/)
  await page.locator('#nameinput').fill('Ada Lovelace')
  await page.locator('#namebar').press('Enter')
  assert.ok(await page.locator('#view-result').isVisible())
  const first=await pixels(),firstURL=page.url()
  await page.reload();await wait();assert.equal(await pixels(),first)
  await page.locator('#back').click()
  await page.locator('#nameinput').fill('  ADA  LOVELACE  ')
  await page.locator('#namebar').press('Enter');assert.equal(await pixels(),first)
  report.push('Name normalization and exact image reproduction after reload')
  await page.locator('#keep').click();assert.equal(await page.locator('#saved-count').textContent(),'1')
  await page.reload();await wait();assert.equal(await page.locator('#saved-count').textContent(),'1')
  await page.locator('#cabinet-button').click();assert.ok(await page.locator('#cabinet-dialog').isVisible())
  await page.locator('#cabinet-grid .portrait').click();assert.equal(await pixels(),first)
  await page.locator('#cabinet-button').click();await page.locator('.remove-saved').click();assert.match(await page.locator('#cabinet-grid').textContent(),/No keepers/)
  await page.keyboard.press('Escape');assert.ok(await page.locator('#view-result').isVisible())
  report.push('Save, persistence, reopen, remove and dialog Escape behavior')
  await page.locator('#copylink').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),page.url())
  const downloadPromise=page.waitForEvent('download');await page.locator('#savepng').click();const download=await downloadPromise
  await download.saveAs('output/playwright/download.png')
  const meta=await sharp('output/playwright/download.png').metadata();assert.equal(meta.width,1600);assert.equal(meta.height,2400)
  report.push('Clipboard sharing and valid 1600 × 2400 PNG export')
  await page.locator('#again').click();assert.notEqual(page.url(),firstURL)
  await page.goBack();assert.equal(await pixels(),first)
  await page.locator('#back').click();await page.locator('#photo-input').setInputFiles('assets/art/ram.webp')
  await page.waitForURL(/seed=/);const photoPixels=await pixels();const photoURL=page.url()
  await page.locator('#back').click();await page.locator('#photo-input').setInputFiles('assets/art/ram.webp')
  await page.waitForURL(/seed=/);assert.equal(page.url(),photoURL);assert.equal(await pixels(),photoPixels)
  report.push('Random discovery, browser history and repeatable local photo input')
  await page.goto(new URL('?seed=0',base).href);await wait();assert.match(page.url(),/seed=0/)
  await page.goto(new URL('?seed=Infinity',base).href);await wait();assert.ok(await page.locator('#view-summon').isVisible())
  await page.locator('#nameinput').fill('<img src=x onerror=alert(1)>');await page.locator('#namebar').press('Enter')
  assert.equal(await page.locator('#plate img').count(),0)
  assert.match(await page.locator('.for-name').textContent(),/<img/)
  report.push('Zero seed, invalid link recovery and safe handling of markup in names')
  await page.goto(new URL('?name=akbar',base).href);await wait()
  await page.screenshot({path:'output/playwright/verified-result.png'})
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});await noOverflow()
    if(width===390)await page.screenshot({path:'output/playwright/verified-mobile-result.png',fullPage:true})
    await page.locator('#back').click();await noOverflow()
    await page.locator('#plus').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#view-result').isVisible())
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#back').click()
  await page.screenshot({path:'output/playwright/verified-mobile-home.png',fullPage:true})
  await page.locator('#about-button').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#about-button').evaluate(e=>e===document.activeElement),true)
  report.push('320/390/768px layouts, keyboard discovery, reduced motion and focus restoration')
  assert.deepEqual(errors,[])
  report.push('No runtime errors or failed HTTP responses')
  await writeFile('output/playwright/checks.json',JSON.stringify({base,passed:report},null,2))
  console.log(report.map(x=>`PASS ${x}`).join('\n'))
}finally{await browser.close()}
