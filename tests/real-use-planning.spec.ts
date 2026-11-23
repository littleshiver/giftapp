import {test,expect} from "@playwright/test";
import {fixture,seed,readData} from "./fixtures";

test("a real recipient shows planned, bought and limit separately, and can collapse without losing add",async({page})=>{
  await seed(page);await page.goto("/#/events/e1");
  const anna=page.locator(".event-recipient-group").first();
  await expect(anna.locator(".recipient-budget-stats")).toContainText("Planned");
  await expect(anna.locator(".recipient-budget-stats")).toContainText("Bought");
  await expect(anna.locator(".recipient-budget-stats")).toContainText("Limit");
  await expect(anna.locator(".recipient-budget-stats")).toContainText(/7\s?400/);
  await expect(anna.locator(".recipient-budget-stats")).toContainText(/1\s?900/);
  await expect(anna.locator(".recipient-budget-stats")).toContainText(/10\s?000/);
  await expect(anna.locator(".recipient-budget-footnote")).toContainText(/2\s?600/);
  await anna.getByRole("button",{name:"Collapse Anna"}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(0);
  await expect(anna.locator(".recipient-budget-stats")).toBeVisible();
  await anna.getByRole("button",{name:"Choose a gift for Anna"}).click();
  await expect(page.getByRole("dialog",{name:"Gift for Anna"})).toBeVisible();
  await page.getByRole("dialog",{name:"Gift for Anna"}).getByRole("button",{name:"Close"}).click();
  await anna.getByRole("button",{name:"Expand Anna"}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(3);
});

test("many recipient gifts use a grid with a Show all control, never a horizontal carousel",async({page})=>{
  const data=fixture();
  for(let i=0;i<6;i++)data.gifts.push({...data.gifts[1],id:`extra-${i}`,eventId:"e2",personId:"p1",name:`Idea ${i}`});
  await seed(page,data);await page.setViewportSize({width:320,height:700});
  await page.goto("/#/events/e2");
  const anna=page.locator(".event-recipient-group").first();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(4);
  const layout=await anna.locator(".event-gift-shelf").evaluate(el=>({
    display:getComputedStyle(el).display,scroll:el.scrollWidth,client:el.clientWidth,
  }));
  expect(layout.display).toBe("grid");
  expect(layout.scroll).toBeLessThanOrEqual(layout.client+2);
  await anna.getByRole("button",{name:"Show all 6 gifts"}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(6);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth",320);
  await anna.getByRole("button",{name:"Show fewer"}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(4);
});

test("opening a saved idea is read-only; saving it to an occasion preserves the original idea",async({page})=>{
  await seed(page);await page.goto("/#/ideas");
  await page.getByRole("button",{name:"Saved",exact:true}).click();
  const before=await readData(page);
  await page.getByRole("button",{name:"View idea Ceramic mug"}).click();
  const sheet=page.getByRole("dialog",{name:"Gift idea"});
  await expect(sheet).toContainText("Ceramic mug");
  await expect(sheet.locator("input,textarea,select")).toHaveCount(0);
  expect((await readData(page)).ideas).toEqual(before.ideas);
  await sheet.getByRole("button",{name:"Edit idea"}).click();
  const edit=page.getByRole("dialog",{name:"Edit idea"});
  await expect(edit.getByRole("combobox",{name:"Save to"})).toHaveValue("");
  await expect(edit.getByRole("button",{name:"Use for an occasion"})).toHaveCount(0);
  await edit.getByRole("combobox",{name:"Save to"}).selectOption("e2");
  await edit.getByRole("button",{name:"Add to occasion"}).click();
  const after=await readData(page);
  expect(after.ideas.find(i=>i.id==="i1")?.name).toBe("Ceramic mug");
  const planned=after.gifts.find(g=>g.name==="Ceramic mug"&&g.eventId==="e2");
  expect(planned).toBeTruthy();
  expect(planned!.id).not.toBe("i1");
  expect(planned!.sourceIdeaId).toBe("i1");
});

test("gift picker distinguishes preview from choosing and keeps its recipient context",async({page})=>{
  await seed(page);await page.goto("/#/events/e1");
  await page.getByRole("button",{name:"Choose a gift for Anna"}).click();
  const picker=page.getByRole("dialog",{name:"Gift for Anna"});
  await expect(picker.getByRole("button",{name:"Use idea Ceramic mug"})).toBeVisible();
  await picker.getByRole("button",{name:"View idea Ceramic mug"}).click();
  const preview=page.getByRole("dialog",{name:"Gift idea"});
  await expect(preview).toContainText("Ceramic mug");
  await preview.getByRole("button",{name:"Choose for this occasion"}).click();
  const editor=page.getByRole("dialog",{name:"Add gift"});
  await expect(editor.getByRole("combobox",{name:"Occasion"})).toHaveValue("e1");
  await expect(editor.getByRole("combobox",{name:"For"})).toHaveValue("p1");
});

test("custom dropdowns are readable and have an inset arrow matching the recipients control",async({page})=>{
  await seed(page);await page.goto("/#/events/e2");
  await page.getByRole("button",{name:"Edit",exact:true}).click();
  const sheet=page.getByRole("dialog",{name:"Edit occasion"});
  const styles=await sheet.locator('input[name="date"]').evaluate(el=>{
    const css=getComputedStyle(el);return {height:el.getBoundingClientRect().height,radius:css.borderRadius,size:css.fontSize};
  });
  const recipients=await sheet.locator(".event-recipient-trigger").evaluate(el=>{
    const css=getComputedStyle(el);return {height:el.getBoundingClientRect().height,radius:css.borderRadius,size:css.fontSize};
  });
  expect(styles.size).toBe("16px");
  expect(recipients.size).toBe("16px");
  expect(Math.abs(styles.height-recipients.height)).toBeLessThanOrEqual(1);
  expect(styles.radius).toBe(recipients.radius);
});
