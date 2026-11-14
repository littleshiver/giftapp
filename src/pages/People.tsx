import { Plus } from "lucide-react";
import { Empty, PersonRow, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { Button } from "../components/Primitives";
export function People() {
  const { data, openEditor } = useApp();
  return (
    <>
      <Title
        name="Your people"
        subtitle="Birthdays, little details and thoughtful ideas."
      />
      <div className="info-list">
        {data.people.length ? (
          data.people.map((p, index) => (
            <PersonRow key={p.id} person={p} index={index} />
          ))
        ) : (
          <Empty>Add people you love giving gifts to.</Empty>
        )}
      </div>
      <Button
        variant="secondary"
        className="button-full"
        style={{ marginTop: 16 }}
        onClick={() => openEditor({ type: "person" })}
      >
        <Plus size={16} />
        Add person
      </Button>
    </>
  );
}
