import {test,expect} from "@playwright/test";
import {fixture,seed,readData} from "./fixtures";
import {ageFromBirthday} from "../src/domain/birthdays";
import {occasionKind} from "../src/domain/occasionKind";

test("person editor has uncluttered birthdays and consistent custom controls",async({page})=>{
  await seed(page);
  await page.goto("/#/people");
  await page.getByRole("button",{name:"Create",exact:true}).click();
  await page.getByRole("button",{name:"Add person"}).click();
  const sheet=page.getByRole("dialog",{name:"Add person"});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Gift preferences")).toHaveCount(0);
  await expect(sheet.locator(".person-birthday-fields .field-label")).toHaveCount(0);
  await expect(sheet.getByRole("combobox",{name:"Birth month"})).toBeVisible();
  await expect(sheet.getByRole("combobox",{name:"Birth day"})).toBeVisible();
  await expect(sheet.locator(".person-select-wrap > svg")).toHaveCount(2);
  for(const el of [sheet.locator('input[name="name"]'),sheet.locator('select[name="birthMonth"]'),sheet.locator('select[name="birthDay"]'),sheet.locator('input[name="birthYear"]'),sheet.locator('textarea[name="likes"]')]) {
    await expect.poll(()=>el.evaluate(node=>Math.round(parseFloat(getComputedStyle(node).fontSize)))).toBe(16);
  }
});
test("age is shown only when the original birth year is known",async({page})=>{
  expect(ageFromBirthday("1997-11-28","2026-11-15")).toBe(28);
  expect(ageFromBirthday("11-28","2026-11-15")).toBeNull();
  await seed(page);
  await page.goto("/#/people/p1");
  await expect(page.locator(".person-profile-age")).toHaveText("28 years old");
  await page.goto("/#/people/p2");
  await expect(page.locator(".person-profile-age")).toHaveCount(0);
});
test("calendar date creates a birthday person without assuming birth year",async({page})=>{
  const data=fixture();data.people=[];data.gifts=[];data.ideas=[];data.events=[];
  await seed(page,data);
  await page.goto("/#/events");
  await page.getByRole("button",{name:"2026-11-26",exact:true}).click();
  await page.getByRole("button",{name:"Add to this date"}).click();
  const picker=page.getByRole("dialog",{name:"Add to this date"});
  await picker.getByRole("button",{name:/Birthday/}).click();
  const form=page.getByRole("dialog",{name:"Add person"});
  await expect(form).toBeVisible();
  await expect(form.locator('select[name="birthMonth"]')).toHaveValue("11");
  await expect(form.locator('select[name="birthDay"]')).toHaveValue("26");
  await expect(form.locator('input[name="birthYear"]')).toHaveValue("");
  await form.getByLabel("Name",{exact:true}).fill("Alex");
  await form.getByRole("button",{name:"Save person"}).click();
  const saved=await readData(page);
  const person=saved.people.find(p=>p.name==="Alex");
  expect(person.birthday).toBe("11-26");
  expect(saved.events.some(e=>e.kind==="birthday"&&e.people.includes(person.id))).toBe(true);
});
test("occasion editor uses a single recipient selector and preserves people budgets",async({page})=>{
  expect(occasionKind("New Year")).toBe("holiday");
  expect(occasionKind("Coffee with friends")).toBe("other");
  await seed(page);
  await page.goto("/#/events/e2");
  await page.getByRole("button",{name:"Edit",exact:true}).click();
  const sheet=page.getByRole("dialog",{name:"Edit occasion"});
  await expect(sheet.getByLabel("Type",{exact:true})).toHaveCount(0);
  await expect(sheet.locator(".event-recipient-trigger")).toBeVisible();
  await sheet.locator(".event-recipient-trigger").click();
  await expect(sheet.getByLabel("Include Anna")).toBeChecked();
  await sheet.getByLabel("Budget for Anna").fill("2300");
  await sheet.getByRole("button",{name:"Save event"}).click();
  const updated=(await readData(page)).events.find(e=>e.id==="e2");
  expect(updated.people).toEqual(["p1","p2","p3"]);
  expect(updated.budgets.p1).toBe(2300);
});
