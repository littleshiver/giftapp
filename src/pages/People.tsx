import { t } from "../utils/format";
import { useState } from "react";
import { Search } from "lucide-react";
import { PersonRow, Title } from "../components/UI";
import { EmptyState } from "../components/EmptyState";
import { UsersRound, SearchX } from "lucide-react";
import { useApp } from "../state/AppState";
import { nextBirthdayDate } from "../domain/birthdays";
import { today } from "../utils/format";

export function People() {
  const { data, openEditor } = useApp();
  const [query, setQuery] = useState("");
  const from = today();
  // Nearest birthday first; people without one stay at the end.
  const people = [...data.people]
    .filter((person) =>
      person.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => {
      const aDate = nextBirthdayDate(a.birthday, from) || "9999-12-31";
      const bDate = nextBirthdayDate(b.birthday, from) || "9999-12-31";
      return aDate.localeCompare(bDate) ||
        a.name.localeCompare(b.name, undefined, {sensitivity:"base"});
    });

  return (
    <>
      <Title name={t("People","Люди")} />
      {data.people.length > 20 && (
        <label className="people-search">
          <Search size={18} aria-hidden="true"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            type="search" aria-label="Search people" placeholder="Find someone"/>
        </label>
      )}
      {people.length ? (
        <div className="people-gallery-grid">
          {people.map((person) => <PersonRow key={person.id} person={person}/>)}
        </div>
      ) : data.people.length ? (
        <EmptyState compact Icon={SearchX} title={t("No matches","Ничего не найдено")} description={t("No one matches your search.","Поиск не нашёл совпадений.")} action={{label:t("Clear search","Сбросить поиск"),onClick:()=>setQuery("")}}/>
      ) : (
        <EmptyState Icon={UsersRound} title={t("Your people live here","Здесь будут ваши близкие")} description={t("Keep people and gift ideas together. Start by adding someone.","Сохраняйте людей и идеи подарков вместе. Начните с первого человека.")} action={{label:t("Add a person","Добавить человека"),onClick:()=>openEditor({type:"person"})}}/>
      )}
    </>
  );
}
