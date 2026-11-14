import { Empty, PersonRow, Title } from "../components/UI";
import { useApp } from "../state/AppState";
export function People() {
  const { data, openEditor } = useApp();
  return (
    <>
      <Title
        name="Your people"
        subtitle="Little details make a big difference."
      />
      <div className="toolbar">
        <span className="smallcaps">{data.people.length} recipients</span>
        <button
          className="floating"
          onClick={() => openEditor({ type: "person" })}
        >
          ＋ Person
        </button>
      </div>
      <div className="card">
        {data.people.length ? (
          data.people.map((p) => <PersonRow key={p.id} person={p} />)
        ) : (
          <Empty>
            Add your first person to start planning thoughtful gifts.
          </Empty>
        )}
      </div>
    </>
  );
}
