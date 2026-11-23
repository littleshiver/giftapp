import {test,expect} from "@playwright/test";
import {fixture,seed,readData} from "./fixtures";

test("empty occasion can create its first person directly from the recipient picker",async({page})=>{
  const data=fixture();
  data.people=[];
  data.events=data.events.filter(e=>e.id==="e2").map(e=>({...e,people:[],budgets:{}}));
  data.gifts=[];
  data.ideas=[];
  await seed(page,data);
  await page.goto("/#/events/e2");
  await expect(page.locator(".event-recipient-prompt")).toContainText("No recipients yet");
  await page.getByRole("button",{name:"Choose recipients"}).click();
  await expect(page.getByRole("dialog",{name:"Choose recipients"})).toBeVisible();
  await expect(page.getByRole("dialog").getByText("No people to choose yet")).toBeVisible();
  await page.getByRole("button",{name:"Add a person"}).click();
  await expect(page.getByRole("dialog",{name:"Add person"})).toBeVisible();
  await page.getByLabel("Name",{exact:true}).fill("Alex");
  await page.getByRole("button",{name:"Save person"}).click();
  const d=await readData(page);
  const person=d.people.find(p=>p.name==="Alex");
  expect(person).toBeTruthy();
  expect(d.events.find(e=>e.id==="e2").people).toContain(person.id);
  await page.goto("/#/events/e2");
  await expect(page.locator(".event-gift-empty")).toBeVisible();
  await page.locator(".event-gift-empty").getByRole("button",{name:"Choose a gift"}).click();
  await expect(page.getByRole("dialog",{name:"Gift for Alex"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Saved ideas/})).toBeVisible();
  await expect(page.getByRole("button",{name:/From Givvy/})).toBeVisible();
});

test("the gift picker isolates personal saved ideas from service suggestions",async({page})=>{
  await seed(page);
  await page.goto("/#/events/e1");
  await page.getByRole("button",{name:"Choose another gift"}).click();
  const dialog=page.getByRole("dialog",{name:"Gift for Anna"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button",{name:/Saved ideas/})).toHaveAttribute("aria-pressed","true");
  await expect(dialog.getByRole("button",{name:"Use idea Ceramic mug"})).toBeVisible();
  await dialog.getByRole("button",{name:/From Givvy/}).click();
  await expect(dialog.getByRole("button",{name:/From Givvy/})).toHaveAttribute("aria-pressed","true");
  await expect(dialog.getByRole("button",{name:/Use suggestion/}).first()).toBeVisible();
  const before=(await readData(page)).ideas.length;
  await dialog.getByRole("button",{name:/Use suggestion/}).first().click();
  await expect(page.getByRole("dialog",{name:"Add gift"})).toBeVisible();
  await page.getByRole("button",{name:"Save gift"}).click();
  await expect(page.getByRole("dialog",{name:"Gift details"})).toBeVisible();
  expect((await readData(page)).ideas.length).toBe(before);
});

test("holiday preferences include common celebrations and save legacy choices safely",async({page})=>{
  await seed(page);
  await page.goto("/#/settings/holidays");
  await page.getByRole("switch",{name:/Valentine's Day/}).check();
  await page.getByRole("switch",{name:/International Women's Day/}).check();
  await page.getByRole("switch",{name:/Christmas/}).check();
  await page.reload();
  const settings=(await readData(page)).settings;
  expect(settings.holidays).toContain("valentines");
  expect(settings.holidays).toContain("womens-day");
  expect(settings.christmas).toBe(true);
});
