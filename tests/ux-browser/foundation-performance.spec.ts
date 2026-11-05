import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
const phase=process.env.FOUNDATION_PHASE === "before" ? "before" : "after";
const reportRoot=process.env.FOUNDATION_REPORT_ROOT ?? "test-results/foundation-20261105";
const origin=phase === "before" ? "http://127.0.0.1:3110" : "http://127.0.0.1:3102";
test("foundation: local production mobile performance samples",async({browser})=>{
  const results=[];
  for(const route of ["/","/courses","/library","/courses/maths4u-9709-p1","/courses/maths4u-0606","/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square"]){
    for(let run=1;run<=3;run++){
      const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:"light"});
      await context.addInitScript(()=>{
        const metrics={lcp:0,cls:0,interactions:[] as number[],shifts:[] as unknown[]};
        Object.assign(window,{foundationMetrics:metrics});
        new PerformanceObserver(list=>{for(const e of list.getEntries())metrics.lcp=e.startTime;}).observe({type:"largest-contentful-paint",buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries() as (PerformanceEntry & {hadRecentInput:boolean;value:number;sources:{node:HTMLElement;previousRect:DOMRectReadOnly;currentRect:DOMRectReadOnly}[]})[])if(!e.hadRecentInput){metrics.cls+=e.value;metrics.shifts.push({at:e.startTime,value:e.value,sources:e.sources.map(s=>({node:s.node?.tagName,selector:s.node?.className,before:s.previousRect.toJSON(),after:s.currentRect.toJSON()}))});}}).observe({type:"layout-shift",buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries() as (PerformanceEntry & {interactionId:number})[])if(e.interactionId)metrics.interactions.push(e.duration);}).observe({type:"event",buffered:true,durationThreshold:16} as PerformanceObserverInit);
      });
      const page=await context.newPage();await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
      await expect(page.locator(".brand")).toBeVisible();
      const font=await page.locator("body").evaluate(e=>getComputedStyle(e).fontFamily);
      expect(font).toContain(phase === "before" ? "Arial" : "Inter");
      if(phase === 'before') {
        if(await page.locator('.mobile-nav-toggle').isVisible())await page.locator('.mobile-nav-toggle').click();
        await page.getByRole("button",{name:"RU",exact:true}).click();await page.getByRole("button",{name:"EN",exact:true}).click();
      } else {
        await page.locator('.mobile-nav-toggle').click();await page.locator('.mobile-nav-toggle').click();
        await page.locator('.discovery-account summary').click();await page.getByRole('radio',{name:'Dark',exact:true}).check();await page.getByRole('radio',{name:'Light',exact:true}).check();
      }
      await page.waitForTimeout(200);
      const measurement=await page.evaluate(()=>{
        const m=(window as unknown as {foundationMetrics:{lcp:number;cls:number;interactions:number[];shifts:unknown[]}}).foundationMetrics;
        return {lcp_ms:Math.round(m.lcp),cls:Number(m.cls.toFixed(4)),interaction_sample_ms:Math.max(0,...m.interactions),shifts:m.shifts};
      });
      results.push({route,run,font,...measurement});await context.close();
    }
  }
  await fs.mkdir(`${reportRoot}/${phase}`,{recursive:true});
  await fs.writeFile(`${reportRoot}/${phase}/performance.json`,JSON.stringify({environment:"Local production build; headless Edge; 390x844; no CPU/network throttling; three fresh browser contexts per route",limitation:"Interaction timings are lab samples, not field INP or a Lighthouse score. Concurrent local workloads can affect results.",results},null,2));
  if(phase === "after")for(const r of results){expect(r.lcp_ms).toBeLessThanOrEqual(2500);expect(r.cls).toBeLessThanOrEqual(.1);expect(r.interaction_sample_ms).toBeLessThanOrEqual(200);}
});
