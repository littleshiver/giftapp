import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Empty, PersonRow, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { Button } from "../components/Primitives";

export function People() {
  const { data, openEditor } = useApp();
  const [query, setQuery] = useState("");
  const sorted = [...data.people].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const people = sorted.filter((person) =>
    person.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <Title name="People" />
      {data.people.length > 8 && (
        <label className="people-search">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            type="search" aria-label="Search people" placeholder="Search people" />
        </label>
      )}
      <div className="info-list">
        {people.length ? (
          people.map((person, index) => (
            <PersonRow key={person.id} person={person} index={index} />
          ))
        ) : data.people.length ? (
          <Empty>No people match your search.</Empty>
        ) : (
          <Empty>Add someone to remember their birthday, favorites and gift ideas.</Empty>
        )}
      </div>
      <Button variant="secondary" className="button-full people-add"
        onClick={() => openEditor({ type: "person" })}>
        <Plus size={16} />
        Add person
      </Button>
    </>
  );
}
