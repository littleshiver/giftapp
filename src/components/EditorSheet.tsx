import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Gift as GiftIcon,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { useApp } from "../state/AppState";
import type { Event, Gift, Idea, Person } from "../domain/models";
import { today, uid } from "../utils/format";
import { readImage, readAvatar } from "../utils/images";
import { birthdayFromParts } from "../domain/birthdays";
import { Button, Field, Sheet } from "./Primitives";
import { Photo } from "./UI";
export function EditorSheet() {
  const { data, editor, commit, closeEditor, notify, openEditor } = useApp(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(""),
    [chosenPhotoUrl, setChosenPhotoUrl] = useState(""),
    [chosenPhotoName, setChosenPhotoName] = useState(""),
    [removePersonPhoto, setRemovePersonPhoto] = useState(false);
  // Browser-owned previews are temporary. Stored photos are never modified
  // until the user explicitly saves this editor.
  useEffect(() => () => {
    if (chosenPhotoUrl) URL.revokeObjectURL(chosenPhotoUrl);
  }, [chosenPhotoUrl]);
  const g = data.gifts.find((g) => g.id === editor?.id),
    idea = data.ideas.find((i) => i.id === editor?.id),
    p = data.people.find((p) => p.id === editor?.id),
    event = data.events.find((e) => e.id === editor?.id);
  const prefill = editor?.prefill;
  const birthdayPerson = event?.kind === "birthday" && event.people.length === 1
    ? data.people.find((person) => person.id === (event.birthdayPersonId || event.people[0])) : undefined;
  const lockedBirthday = !!birthdayPerson && !!event;
  const birthdayParts = (p?.birthday || "").split("-");
  const birthMonth = birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts.length === 2 ? birthdayParts[0] : "";
  const birthDay = birthdayParts.length === 3 ? birthdayParts[2] : birthdayParts.length === 2 ? birthdayParts[1] : "";
  const birthYear = birthdayParts.length === 3 ? birthdayParts[0] : "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formRef = useRef<HTMLFormElement>(null);
  const [eventId, setEventId] = useState(
      g?.eventId ||
        editor?.eventId ||
        data.events.find((e) =>
          e.people.includes(editor?.personId || prefill?.personId || ""),
        )?.id ||
        (data.events.length === 1 ? data.events[0].id : "") ||
        "",
    ),
    [personId, setPersonId] = useState(
      g?.personId ||
        editor?.personId ||
        prefill?.personId ||
        (data.events.find((e) => e.id === eventId)?.people.length === 1
          ? data.events.find((e) => e.id === eventId)?.people[0]
          : "") ||
        "",
    );
  if (!editor) return null;
  const { type, id } = editor,
    heading =
      type === "person"
        ? id
          ? "Edit person"
          : "Add person"
        : type === "event"
          ? id
            ? "Edit occasion"
            : "Add occasion"
          : type === "idea"
            ? id
              ? "Edit idea"
              : "Save an idea"
            : id
              ? "Edit gift"
              : "Add gift";
  const save = async (form: HTMLFormElement) => {
    const fd = new FormData(form),
      text = (k: string) => String(fd.get(k) || "").trim(),
      number = (k: string) => {
        const n = Number(fd.get(k));
        if (!Number.isFinite(n) || n < 0)
          throw Error("Enter a valid non-negative amount.");
        return n;
      },
      name = text("name");
    if (!name) {
      notify("Please enter a name.");
      return;
    }
    setSaveError("");
    setBusy(true);
    try {
      const next = { ...data };
      if (type === "person") {
        let photo = removePersonPhoto ? "" : p?.photo || "";
        const photoFile = fd.get("personPhoto");
        if (photoFile instanceof File && photoFile.size) photo = await readAvatar(photoFile);
        const value: Person = {
          ...p,
          id: id || uid(),
          name,
          photo,
          birthday: birthdayFromParts(text("birthMonth"), text("birthDay"), text("birthYear")),
          interests: "", // Legacy tags are consolidated into one positive preference field.

          likes: text("likes"),
          avoid: text("avoid"),
          note: text("note"),
        };
        next.people = id
          ? data.people.map((p) => (p.id === id ? value : p))
          : [...data.people, value];
      } else if (type === "event") {
        const people = lockedBirthday && birthdayPerson
          ? [birthdayPerson.id]
          : data.people.filter((person) => fd.get("person_" + person.id) === "on")
              .map((person) => person.id);
        if (
          id &&
          data.gifts.some(
            (g) => g.eventId === id && !people.includes(g.personId),
          )
        )
          throw Error(
            "Reassign or delete their gifts before removing a recipient from this occasion.",
          );
        const budgets = Object.fromEntries(
          people
            .filter((pid) => text("budget_" + pid) !== "")
            .map((pid) => [pid, number("budget_" + pid)]),
        );
        const value: Event = {
          ...event,
          id: id || uid(),
          name: lockedBirthday ? event?.name || name : name,
          date: lockedBirthday ? event!.date : text("date"),
          kind: lockedBirthday ? "birthday" : text("kind") as Event["kind"],
          people,
          budgets,
          enabled: event?.enabled ?? true,
          demo: false,
        };
        next.events = id
          ? data.events.map((e) => (e.id === id ? value : e))
          : [...data.events, value];
      } else {
        if (type === "gift") {
          const selectedOccasion = data.events.find((e) => e.id === eventId);
          if (!selectedOccasion || !data.people.some((p) => p.id === personId))
            throw Error("Choose an occasion and a recipient.");
          if (selectedOccasion.kind === "birthday" && (
            selectedOccasion.people.length !== 1 || selectedOccasion.people[0] !== personId
          )) {
            throw Error("A birthday has one recipient. Add gifts for others in a separate occasion.");
          }
          // Selecting an existing person also explicitly assigns them to this
          // occasion. Do not invent or overwrite an individual budget.
          if (!selectedOccasion.people.includes(personId))
            next.events = data.events.map((e) =>
              e.id === eventId
                ? { ...e, people: [...e.people, personId] }
                : e,
            );
        }
        const old = type === "gift" ? g : idea;
        let image = old?.image || prefill?.image || "";
        const file = fd.get("imageFile");
        if (file instanceof File && file.size) image = await readImage(file);
        const value: Idea = {
          ...old,
          id: id || uid(),
          name,
          personId: type === "gift" ? personId : text("personId"),
          price: number("price"),
          link: text("link"),
          note: text("note"),
          image,
        };
        if (type === "gift") {
          const gift: Gift = {
            ...value,
            eventId,
            status: text("status") === "bought" ? "bought" : "to_buy",
            sourceIdeaId: g?.sourceIdeaId || (
              prefill && data.ideas.some((idea) => idea.id === prefill.id) ? prefill.id : undefined
            ),
          };
          next.gifts = id
            ? data.gifts.map((g) => (g.id === id ? gift : g))
            : [...data.gifts, gift];
        } else
          next.ideas = id
            ? data.ideas.map((i) => (i.id === id ? value : i))
            : [...data.ideas, value];
      }
      if (commit(next)) {
        closeEditor();
        notify("Saved ✓");
      } else
        setSaveError(
          "Changes were not saved. Browser storage may be full, blocked or awaiting recovery.",
        );
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    const count =
      type === "event"
        ? data.gifts.filter((g) => g.eventId === id).length
        : type === "person"
          ? data.gifts.filter((g) => g.personId === id).length
          : 0;
    const relatedEvents = type === "person"
      ? data.events.filter((e) => e.people.includes(id || "")).length : 0;
    const relatedIdeas = type === "person"
      ? data.ideas.filter((i) => i.personId === id).length : 0;
    const message = type === "person"
      ? `Delete ${p?.name || "this person"} permanently? This removes ${count} assigned gifts and their membership in ${relatedEvents} occasions (including their birthday events). ${relatedIdeas} saved ideas will be kept without a recipient. This cannot be undone. Export a backup first if needed.`
      : `Delete this ${type}?${count ? ` This also deletes ${count} assigned gifts. Export a backup first if needed.` : ""}`;
    if (!confirm(message)) return;
    let next = { ...data };
    if (type === "person")
      next = {
        ...data,
        people: data.people.filter((p) => p.id !== id),
        ideas: data.ideas.map((i) =>
          i.personId === id ? { ...i, personId: "" } : i,
        ),
        gifts: data.gifts.filter((g) => g.personId !== id),
        events: data.events
          .filter((e) => !(
            e.kind === "birthday" && e.people.length === 1 &&
            e.people[0] === id
          ))
          .map((e) => ({
            ...e,
            people: e.people.filter((pid) => pid !== id),
            budgets: Object.fromEntries(
              Object.entries(e.budgets).filter(([pid]) => pid !== id),
            ),
          })),
      };
    else if (type === "event")
      next = {
        ...data,
        events: data.events.filter((e) => e.id !== id),
        gifts: data.gifts.filter((g) => g.eventId !== id),
      };
    else if (type === "gift")
      next = { ...data, gifts: data.gifts.filter((g) => g.id !== id) };
    else next = { ...data, ideas: data.ideas.filter((i) => i.id !== id) };
    if (commit(next)) {
      closeEditor();
      if (type === "person" || type === "event")
        navigate(type === "person" ? "/people" : "/events");
      notify("Deleted");
    }
  };
  const source = type === "gift" ? g || prefill : idea,
    selectedOccasion = data.events.find((e) => e.id === eventId),
    assignedRecipientIds = new Set(selectedOccasion?.people || []),
    recipients = eventId
      ? selectedOccasion?.kind === "birthday" && selectedOccasion.people.length === 1
        ? data.people.filter((p) => p.id === selectedOccasion.people[0])
        : [
          ...data.people.filter((p) => assignedRecipientIds.has(p.id)),
          ...data.people.filter((p) => !assignedRecipientIds.has(p.id)),
        ]
      : [],
    recipientNeedsAssignment =
      !!selectedOccasion && !!personId && !assignedRecipientIds.has(personId);
  return (
    <Sheet title={heading} busy={busy} onClose={closeEditor}>
      <form
        ref={formRef}
        onSubmit={(ev) => {
          ev.preventDefault();
          void save(ev.currentTarget);
        }}
      >
        {!lockedBirthday ? (
          <Field
            label={type === "person" ? "Name" : type === "event" ? "Occasion name" : type === "gift" ? "Gift name" : "Idea name"}
          >
            <input
              className="control" name="name" required
              maxLength={type === "gift" || type === "idea" ? 100 : 70}
              defaultValue={(type === "person" ? p : type === "event" ? event : source)?.name || ""}
              placeholder={type === "person" ? "Their name" : type === "event" ? "e.g. New Year" : "A lovely thought"}
            />
          </Field>
        ) : <input type="hidden" name="name" value={event?.name || ""} />}
        {type === "person" ? (
          <>
            <div className="person-editor-identity">
              <div className="person-photo-field">
                <span className="field-label">Photo</span>
                <div className="photo-upload">
                  <div className="photo-upload-preview person-photo-preview" aria-label="Portrait preview">
                    {chosenPhotoUrl || (!removePersonPhoto && p?.photo) ? (
                      <Photo src={chosenPhotoUrl || p?.photo} name={p?.name || "Person portrait"}/>
                    ) : <span className="person-photo-placeholder">{p?.name?.[0]?.toUpperCase() || "?"}</span>}
                  </div>
                  <div className="photo-upload-detail">
                    <label className="photo-upload-button">
                      <ImageIcon size={16} aria-hidden="true"/>
                      {p?.photo || chosenPhotoUrl ? "Change photo" : "Add a photo"}
                      <input name="personPhoto" type="file" accept="image/*"
                        aria-label="Person photo" disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setChosenPhotoName(file?.name || "");
                          setChosenPhotoUrl(file ? URL.createObjectURL(file) : "");
                          if (file) setRemovePersonPhoto(false);
                        }}
                      />
                    </label>
                    {p?.photo && !removePersonPhoto && !chosenPhotoUrl && (
                      <button data-ph="person-photo-remove" className="person-photo-remove" type="button"
                        onClick={() => setRemovePersonPhoto(true)}>Remove photo</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="field-label person-birthday-label">Birthday</div>
              <div className="person-birthday-fields">
                <Field label="Month">
                  <select className="control" name="birthMonth" defaultValue={birthMonth}>
                    <option value="">Month</option>
                    {months.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Day">
                  <select className="control" name="birthDay" defaultValue={birthDay}>
                    <option value="">Day</option>
                    {Array.from({length: 31}, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Year (optional)">
                  <input className="control" name="birthYear" type="number" min="1900"
                    max={new Date().getFullYear()} placeholder="Not required" defaultValue={birthYear}/>
                </Field>
              </div>
            </div>
            <section className="person-editor-preferences" aria-label="About them">
              <h3 className="person-editor-subtitle">Gift preferences</h3>
              <Field label="Good gifts">
                <textarea className="control textarea" name="likes"
                  defaultValue={[p?.interests, p?.likes].filter(Boolean).join(" · ")}
                  placeholder="What do they love? Hobbies, wishes, favorite things…"/>
              </Field>
              <Field label="Avoid gifting">
                <textarea className="control textarea" name="avoid" defaultValue={p?.avoid || ""}
                  placeholder="Things they dislike or already have…"/>
              </Field>
              <Field label="Notes">
                <textarea className="control textarea" name="note" defaultValue={p?.note || ""}
                  placeholder="Little details worth remembering…"/>
              </Field>
            </section>
          </>
        ) : type === "event" ? (
          <>
            {lockedBirthday && birthdayPerson ? (
              <p className="section-note person-birthday-help">
                This birthday belongs to {birthdayPerson.name}. Edit their birthday date in People.
              </p>
            ) : (
            <div className="form-grid">
              <Field label="Date">
                <input
                  className="control"
                  type="date"
                  name="date"
                  required
                  defaultValue={event?.date || today()}
                />
              </Field>
              <Field label="Type">
                <select
                  className="control"
                  name="kind"
                  defaultValue={event?.kind || "birthday"}
                >
                  {event?.kind === "birthday" && <option value="birthday">Birthday</option>}
                  <option value="holiday">Holiday</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            )}
            <div className="field-label">{lockedBirthday ? "Birthday budget (₽)" : "Recipients and budgets (₽)"}</div>
            {data.people.length ? (
              (lockedBirthday && birthdayPerson ? [birthdayPerson] : data.people).map((p) => (
                <div className="recipient-selector" key={p.id}>
                  <label className="checkline">
                    <input
                      aria-label={`Include ${p.name}`}
                      type="checkbox"
                      name={"person_" + p.id}
                      defaultChecked={event?.people.includes(p.id)}
                      disabled={lockedBirthday}
                    />
                    <span>{p.name}</span>
                  </label>
                  <input
                    className="control"
                    aria-label={`Budget for ${p.name}`}
                    type="number"
                    min="0"
                    step="1"
                    name={"budget_" + p.id}
                    defaultValue={
                      event
                        ? (event.budgets[p.id] ?? "")
                        : data.settings.birthdayBudget
                    }
                  />
                </div>
              ))
            ) : (
              <p className="section-note">
                Add people first, then assign them to the occasion.
              </p>
            )}
            <p className="section-note">
              Leave a budget blank for not set. Zero is a valid limit.
            </p>
          </>
        ) : (
          <>
            {type === "gift" ? (
              <div className="form-grid">
                <Field label="Occasion">
                  <select
                    className="control"
                    name="eventId"
                    required
                    value={eventId}
                    onChange={(e) => {
                      setEventId(e.target.value);
                      const event = data.events.find(
                        (x) => x.id === e.target.value,
                      );
                      setPersonId(
                        event?.people.includes(personId)
                          ? personId
                          : event?.people[0] || "",
                      );
                    }}
                  >
                    <option value="">Choose occasion</option>
                    {eventId && !data.events.some((e) => e.id === eventId) && (
                      <option value={eventId}>
                        Missing occasion — choose another
                      </option>
                    )}
                    {data.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="For">
                  <select
                    className="control"
                    name="personId"
                    required
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                  >
                    <option value="">Choose recipient</option>
                    {personId &&
                      !data.people.some((p) => p.id === personId) && (
                        <option value={personId}>
                          Missing recipient — choose another
                        </option>
                      )}
                    {recipients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {assignedRecipientIds.has(p.id)
                          ? ""
                          : " · add to occasion"}
                      </option>
                    ))}
                  </select>
                </Field>
                {recipientNeedsAssignment && (
                  <p className="section-note" role="status">
                    Saving this gift will also add{" "}
                    {data.people.find((p) => p.id === personId)?.name} to{" "}
                    {selectedOccasion?.name}. Their budget will remain unset.
                  </p>
                )}
                {!eventId && (
                  <p className="section-note">
                    Choose an occasion first, then choose who will receive the gift.
                  </p>
                )}
              </div>
            ) : (
              <Field label="For (optional)">
                <select
                  className="control"
                  name="personId"
                  defaultValue={idea?.personId || editor.personId || ""}
                >
                  <option value="">Anyone</option>
                  {data.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-grid">
              <Field
                label={type === "idea" ? "Estimated price (₽)" : "Price (₽)"}
              >
                <input
                  className="control"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={source?.price ?? 0}
                />
              </Field>
              {type === "gift" && (
                <Field label="Status">
                  <select
                    className="control"
                    name="status"
                    defaultValue={g?.status || "to_buy"}
                  >
                    <option value="to_buy">To buy</option>
                    <option value="bought">Bought</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="field">
              <span className="field-label">Photo (optional)</span>
              <div className="photo-upload">
                <div className="photo-upload-preview" aria-label="Photo preview">
                  {chosenPhotoUrl || source?.image ? (
                    <Photo
                      src={chosenPhotoUrl || source?.image}
                      name={source?.name || "Selected photo"}
                    />
                  ) : (
                    <ImageIcon size={29} aria-hidden="true" />
                  )}
                </div>
                <div className="photo-upload-detail">
                  <strong>{chosenPhotoUrl ? "New photo selected" : source?.image ? "Current photo" : "No photo yet"}</strong>
                  <label className="photo-upload-button">
                    <ImageIcon size={16} aria-hidden="true" />
                    {source?.image || chosenPhotoUrl ? "Change photo" : "Choose photo"}
                    <input
                      aria-label={type === "gift" ? "Gift photo" : "Idea photo"}
                      name="imageFile"
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setChosenPhotoName(file?.name || "");
                        setChosenPhotoUrl(file ? URL.createObjectURL(file) : "");
                      }}
                    />
                  </label>
                  <span className="photo-upload-help">
                    {chosenPhotoName || "JPG, PNG or WebP"}
                  </span>
                </div>
              </div>
            </div>
            <Field label="Product link (optional)">
              <input
                className="control"
                name="link"
                type="url"
                defaultValue={source?.link || ""}
                placeholder="https://…"
              />
            </Field>
            <Field label="Notes">
              <textarea
                className="control textarea"
                name="note"
                defaultValue={source?.note || ""}
                placeholder="Color, size or where to buy…"
              />
            </Field>
            {type === "idea" && idea && (
              <Button data-ph="idea-add-to-occasion"
                type="button"
                variant="secondary"
                className="button-full"
                disabled={busy}
                onClick={async () => {
                  if (!formRef.current) return;
                  const fd = new FormData(formRef.current),
                    price = Number(fd.get("price"));
                  if (!Number.isFinite(price) || price < 0) {
                    notify("Enter a valid non-negative amount.");
                    return;
                  }
                  setBusy(true);
                  try {
                    let image = idea.image;
                    const file = fd.get("imageFile");
                    if (file instanceof File && file.size)
                      image = await readImage(file);
                    openEditor({
                      type: "gift",
                      personId: String(fd.get("personId") || ""),
                      prefill: {
                        ...idea,
                        name: String(fd.get("name") || idea.name),
                        note: String(fd.get("note") || ""),
                        link: String(fd.get("link") || ""),
                        personId: String(fd.get("personId") || ""),
                        price,
                        image,
                      },
                    });
                  } catch (error) {
                    notify((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <GiftIcon size={16} />
                Use for an occasion
              </Button>
            )}
            {type === "gift" && (
              <p className="section-note">
                To buy and Bought both count toward occasion costs. Unassigned
                inspiration lives in Ideas.
              </p>
            )}
          </>
        )}
        {saveError && (
          <p className="warning" role="alert">
            {saveError}
          </p>
        )}
        <div className="sheet-cta">
          <Button data-ph={`editor-save-${type}`} className="button-full" type="submit" disabled={busy}>
            <Check size={17} />
            {busy ? "Saving…" : `Save ${type}`}
          </Button>
          {id && (
            <Button data-ph={`editor-delete-${type}`}
              type="button"
              variant="secondary"
              className="button-full button-danger"
              disabled={busy}
              onClick={remove}
            >
              <Trash2 size={15} />
              Delete {type}
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
