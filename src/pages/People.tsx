import { useState } from "react";
import { Search } from "lucide-react";
import { Empty, PersonRow, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { nextBirthdayDate } from "../domain/birthdays";
import { today } from "../utils/format";

export function People() {
  const { data } = useApp();
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
      <Title name="People" />
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
        <Empty>No one matches your search.</Empty>
      ) : (
        <Empty>Keep your favorite people and gift ideas together. Add someone with the + button.</Empty>
      )}
    </>
  );
}
