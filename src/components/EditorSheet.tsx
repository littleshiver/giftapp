import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Gift as GiftIcon,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useApp } from "../state/AppState";
import type { Event, Gift, Idea, Person, Editor } from "../domain/models";
import { today, uid, currencyUnit, t, language } from "../utils/format";
import { readImage, readAvatar } from "../utils/images";
import { birthdayFromParts } from "../domain/birthdays";
import { Button, Field, Sheet } from "./Primitives";
import { Photo, PersonAvatar } from "./UI";
import { PhotoCropSheet, validatePhoto } from "./PhotoCropSheet";
import { EmptyState } from "./EmptyState";
import { UsersRound } from "lucide-react";
import { occasionKind } from "../domain/occasionKind";
export function EditorSheet({standalone=false,editId}:{standalone?:boolean;editId?:string}={}) {
  const { data, editor: activeEditor, commit, closeEditor: closeGlobalEditor, notify, openEditor, setUi, tour, updateTour, budgetsEnabled } = useApp(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(""),
    [chosenPhotoUrl, setChosenPhotoUrl] = useState(""),
    [chosenPhotoName, setChosenPhotoName] = useState(""),
    [croppedPhoto, setCroppedPhoto] = useState(""),
    [cropSource, setCropSource] = useState(""),
    [removePersonPhoto, setRemovePersonPhoto] = useState(false),
    [recipientsOpen,setRecipientsOpen]=useState(false);
  const editor = standalone && editId ? ({type:"gift",id:editId} as Editor) : activeEditor;
  const closeEditor = () => {
    // Never carry unsaved crop or a pending filename into another editing session.
    setCroppedPhoto("");
    setChosenPhotoName("");
    setChosenPhotoUrl("");
    setCropSource("");
    if(standalone && editId) navigate(`/gifts/${editId}`,{replace:true});
    else closeGlobalEditor();
  };
  // Browser-owned previews are temporary. Stored photos are never modified
  // until the user explicitly saves this editor.
  useEffect(() => () => {
    if (chosenPhotoUrl.startsWith("blob:")) URL.revokeObjectURL(chosenPhotoUrl);
  }, [chosenPhotoUrl]);
  const g = data.gifts.find((g) => g.id === editor?.id),
    idea = data.ideas.find((i) => i.id === editor?.id),
    p = data.people.find((p) => p.id === editor?.id),
    event = data.events.find((e) => e.id === editor?.id);
  const prefill = editor?.prefill;
  const [eventRecipients,setEventRecipients]=useState<string[]>(()=>event?.people||[]);
  const [budgetDraft,setBudgetDraft]=useState<Record<string,string>>(()=>Object.fromEntries(data.people.map(person=>[person.id,event?.budgets[person.id]!==undefined?String(event.budgets[person.id]):String(data.settings.occasionBudget??data.settings.birthdayBudget)])));
  const birthdayPerson = event?.kind === "birthday" && event.people.length === 1
    ? data.people.find((person) => person.id === (event.birthdayPersonId || event.people[0])) : undefined;
  const lockedBirthday = !!birthdayPerson && !!event;
  const birthdayParts = (p?.birthday || "").split("-");
  const birthMonth = birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts.length === 2 ? birthdayParts[0] : editor?.birthdayDate?.slice(5,7) || "";
  const birthDay = birthdayParts.length === 3 ? birthdayParts[2] : birthdayParts.length === 2 ? birthdayParts[1] : editor?.birthdayDate?.slice(8,10) || "";
  const birthYear = birthdayParts.length === 3 ? birthdayParts[0] : "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formRef = useRef<HTMLFormElement>(null);
  const [eventId, setEventId] = useState(
      editor?.type === "idea"
        ? (editor.eventId || "")
        : (g?.eventId || editor?.eventId ||
          data.events.find(e=>e.people.includes(editor?.personId || prefill?.personId || ""))?.id ||
          (data.events.length===1?data.events[0].id:"") || ""),
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
  const { type, id } = editor;
  const newUnifiedGift = type === "idea" && !id;
  const saveAsGift = type === "gift" || (type === "idea" && Boolean(eventId));
  const heading =
      type === "person"
        ? id
          ? t("Edit person","Редактировать профиль")
          : t("Add person","Добавить человека")
        : type === "event"
          ? id
            ? t("Edit occasion","Редактировать событие")
            : t("Add occasion","Добавить событие")
          : type === "idea"
            ? id
              ? t("Edit idea","Редактировать идею")
              : t("Add gift","Добавить подарок")
            : id
              ? t("Edit gift","Редактировать подарок")
              : t("Add gift","Добавить подарок");
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
        if (!id && tour?.step === "home-person" &&
          (!text("birthMonth") || !text("birthDay"))) {
          throw Error("For this walkthrough, please enter a name and birthday. The year and photo are optional.");
        }
        let photo = removePersonPhoto ? "" : p?.photo || "";
        const photoFile = fd.get("personPhoto");
        if (croppedPhoto) photo = croppedPhoto;
        else if (photoFile instanceof File && photoFile.size) photo = await readAvatar(photoFile);
        const value: Person = {
          ...p,
          id: id || uid(),
          name,
          photo,
          birthday: birthdayFromParts(text("birthMonth"), text("birthDay"), text("birthYear")),
          interests: "", // Legacy tags are consolidated into one positive preference field.

          likes: text("likes"),
          avoid: text("avoid"),
          note: p?.note || "", // Keep legacy notes stored; no obsolete input in new UI.
        };
        next.people = id
          ? data.people.map((p) => (p.id === id ? value : p))
          : [...data.people, value];
        // When a person is created from an occasion's empty state, link them
        // to that occasion immediately; don't lose the user's context.
        if(!id && editor.eventId) {
          next.events = data.events.map(e=>e.id===editor.eventId && e.kind!=="birthday"
            ? {...e,people:[...new Set([...e.people,value.id])]} : e);
        }
      } else if (type === "event") {
        const people = lockedBirthday && birthdayPerson
          ? [birthdayPerson.id]
          : eventRecipients.filter(pid=>data.people.some(p=>p.id===pid));
        if (
          id &&
          data.gifts.some(
            (g) => g.eventId === id && !people.includes(g.personId),
          )
        )
          throw Error(
            "Reassign or delete their gifts before removing a recipient from this occasion.",
          );
        const budgets = budgetsEnabled ? Object.fromEntries(
          people.filter(pid=>(budgetDraft[pid]??"").trim()!=="")
            .map(pid=>{
              const value=Number(budgetDraft[pid]);
              if(!Number.isFinite(value)||value<0)throw Error("Enter a valid non-negative budget.");
              return [pid,value];
            })
        ) : Object.fromEntries(Object.entries(event?.budgets||{}).filter(([pid])=>people.includes(pid)));
        const value: Event = {
          ...event,
          id: id || uid(),
          name: lockedBirthday ? event?.name || name : name,
          date: lockedBirthday ? event!.date : text("date"),
          kind: lockedBirthday ? "birthday" : occasionKind(name,event?.kind),
          people,
          budgets,
          enabled: event?.enabled ?? true,
          demo: false,
        };
        next.events = id
          ? data.events.map((e) => (e.id === id ? value : e))
          : [...data.events, value];
      } else {
        if (saveAsGift) {
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
        if (croppedPhoto) image = croppedPhoto;
        else if (file instanceof File && file.size) image = await readImage(file);
        const value: Idea = {
          ...old,
          id: id || uid(),
          name,
          personId: saveAsGift ? personId : text("personId"),
          price: number("price"),
          link: text("link"),
          note: text("note"),
          image,
        };
        if (saveAsGift) {
          const gift: Gift = {
            ...value,
            id: type === "idea" && id ? uid() : value.id,
            eventId,
            status: text("status") === "bought" ? "bought" : "to_buy",
            sourceIdeaId: g?.sourceIdeaId || (type==="idea" && id ? id : undefined) || (
              prefill && data.ideas.some((idea) => idea.id === prefill.id) ? prefill.id : undefined
            ),
          };
          next.gifts = type === "gift" && id
            ? data.gifts.map((g) => (g.id === id ? gift : g))
            : [...data.gifts, gift];
          // A planned gift is a separate snapshot. An edited saved idea stays saved.
          if(type==="idea" && id)next.ideas=data.ideas.map(i=>i.id===id?value:i);
        } else
          next.ideas = id
            ? data.ideas.map((i) => (i.id === id ? value : i))
            : [...data.ideas, value];
      }
      if (commit(next)) {
        closeEditor();
        if (type === "person" && !id && tour?.step === "home-person") {
          const saved = next.people[next.people.length - 1];
          updateTour({ step: "person-profile", personId: saved.id });
          navigate(`/people/${saved.id}`);
        } else if (type === "gift" && !id &&
          tour?.step === "occasion" &&
          next.gifts.at(-1)?.sourceIdeaId === tour.ideaId) {
          updateTour({ step: "gift-status", giftId: next.gifts[next.gifts.length - 1].id });
        } else if (type === "gift" && id &&
          tour?.step === "gift-status" &&
          next.gifts.find(gift => gift.id === id)?.status === "bought") {
          updateTour({ step: "complete" });
        }
        if(saveAsGift && (type==="idea" || !id) && !tour && next.gifts.length) {
          navigate(`/gifts/${next.gifts[next.gifts.length-1].id}`);
        }
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
      if (type === "person" || type === "event" || (type==="gift" && standalone))
        navigate(type === "person" ? "/people" : type==="event" ? "/events" : `/events/${g?.eventId||""}`,{replace:true});
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
  const form = (
      <form id={standalone?"gift-editor-form":undefined}
        className={type === "person" ? "person-editor-form" : ""}
        ref={formRef}
        onSubmit={(ev) => {
          ev.preventDefault();
          void save(ev.currentTarget);
        }}
      >
        {type !== "person" && (!lockedBirthday ? (
          <Field label={type === "event" ? "Occasion name" : (type === "gift" || newUnifiedGift) ? "Gift name" : "Idea name"}>
            <input className="control" name="name" required
              maxLength={type === "gift" || type === "idea" ? 100 : 70}
              defaultValue={(type === "event" ? event : source)?.name || ""}
              placeholder={type === "event" ? "e.g. New Year" : "A lovely thought"}/>
          </Field>
        ) : <input type="hidden" name="name" value={event?.name || ""} />)}
        {type === "person" ? (
          <>
            <div className="person-editor-identity">
              <div className="person-photo-field">
                <span className="field-label">Photo</span>
                <div className="photo-upload">
                  <div className="photo-upload-preview person-photo-preview" aria-label="Portrait preview">
                    {chosenPhotoUrl || (!removePersonPhoto && p?.photo) ? (
                      <Photo src={chosenPhotoUrl || p?.photo} name={p?.name || "Person portrait"}/>
                    ) : <span className="person-photo-placeholder" aria-hidden="true"/>}
                  </div>
                  <div className="photo-upload-detail">
                    <label className="photo-upload-button">
                      <ImageIcon size={16} aria-hidden="true"/>
                      {p?.photo || chosenPhotoUrl ? "Change photo" : "Add a photo"}
                      <input name="personPhoto" type="file" accept="image/*"
                        aria-label="Person photo" disabled={busy}
                        onChange={(e) => {
                           const file=e.target.files?.[0];e.currentTarget.value="";
                           if(!file)return;
                           try{validatePhoto(file);setChosenPhotoName(file.name);setCropSource(URL.createObjectURL(file));}
                           catch(error){setSaveError((error as Error).message);}
                         }}
                      />
                    </label>
                    {(chosenPhotoUrl || (!removePersonPhoto && p?.photo?.startsWith("data:"))) && (
                      <button type="button" className="person-photo-remove" onClick={()=>setCropSource(chosenPhotoUrl||p?.photo||"")}>{t("Adjust crop","Изменить кадрирование")}</button>
                    )}
                    {p?.photo && !removePersonPhoto && !chosenPhotoUrl && (
                      <button data-ph="person-photo-remove" className="person-photo-remove" type="button"
                        onClick={() => setRemovePersonPhoto(true)}>{t("Remove photo","Удалить фото")}</button>
                    )}
                  </div>
                </div>
              </div>
              <Field label={t("Name","Имя")}>
                  <input className="control" name="name" required maxLength={70}
                    defaultValue={p?.name || ""} placeholder="Their name"/>
                </Field>
              <div className="field-label person-birthday-label">{t("Birthday","День рождения")}</div>
              <div className="person-birthday-fields">
                <div className="person-select-wrap">
                  <select className="control" name="birthMonth" aria-label={t("Birth month","Месяц рождения")} defaultValue={birthMonth}>
                    <option value="">{t("Month","Месяц")}</option>
                    {months.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>{new Intl.DateTimeFormat(language==="ru"?"ru-RU":"en-US",{month:"short"}).format(new Date(2000,i,1))}</option>
                    ))}
                  </select>
                  <ChevronDown size={19} strokeWidth={2.7} aria-hidden="true"/>
                </div>
                <div className="person-select-wrap">
                  <select className="control" name="birthDay" aria-label={t("Birth day","День рождения (число)")} defaultValue={birthDay}>
                    <option value="">{t("Day","День")}</option>
                    {Array.from({length: 31}, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                    ))}
                  </select>
                  <ChevronDown size={19} strokeWidth={2.7} aria-hidden="true"/>
                </div>
                <input className="control" name="birthYear" type="number" inputMode="numeric" min="1900"
                  aria-label={t("Birth year (optional)","Год рождения (необязательно)")}
                  max={new Date().getFullYear()} placeholder={t("Year","Год")} defaultValue={birthYear}/>
              </div>
            </div>
            <section className="person-editor-preferences" aria-label="About them">
              <Field label={t("Good gifts","Что подарить")}>
                <textarea className="control textarea" name="likes"
                  defaultValue={[p?.interests, p?.likes].filter(Boolean).join(" · ")}
                  placeholder="What do they love? Hobbies, wishes, favorite things…"/>
              </Field>
              <Field label={t("Avoid gifting","Что не дарить")}>
                <textarea className="control textarea" name="avoid" defaultValue={p?.avoid || ""}
                  placeholder="Things they dislike or already have…"/>
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
            <Field label={t("Date","Дата")}>
              <input className="control" type="date" name="date" required
                defaultValue={event?.date || editor.date || today()}/>
            </Field>
            )}
            {lockedBirthday && birthdayPerson ? (
              <div className="event-recipient-locked">
                <PersonAvatar person={birthdayPerson}/>
                <span>{birthdayPerson.name}</span>
                {budgetsEnabled && <input className="control" type="number" min="0" step="1"
                  aria-label={`Budget for ${birthdayPerson.name}`}
                  value={budgetDraft[birthdayPerson.id]??""}
                  placeholder={t("Budget","Бюджет")}
                  onChange={ev=>setBudgetDraft(current=>({...current,[birthdayPerson.id]:ev.target.value}))}/>}
              </div>
            ):(
              <div className="event-recipient-control">
                <span className="field-label">{t("Recipients","Получатели")}</span>
                <button className="event-recipient-trigger control" type="button"
                  aria-expanded={recipientsOpen} aria-controls="event-recipient-options"
                  onClick={()=>setRecipientsOpen(open=>!open)}>
                  <span className={eventRecipients.length?"event-recipient-trigger-value":"event-recipient-trigger-placeholder"}>
                    {eventRecipients.length
                      ? data.people.filter(p=>eventRecipients.includes(p.id)).map(p=>p.name).join(", ")
                      : t("Choose recipients","Выберите получателей")}
                  </span>
                  <ChevronDown size={19} strokeWidth={2.7} aria-hidden="true"/>
                </button>
                {recipientsOpen && <div id="event-recipient-options" className="event-recipient-options" role="group"
                  aria-label={t("Recipients","Получатели")}>
                  {data.people.length ? data.people.map(person=>{
                    const selected=eventRecipients.includes(person.id);
                    return <div className="event-recipient-option" key={person.id}>
                      <label>
                        <input aria-label={`Include ${person.name}`} type="checkbox" checked={selected}
                          onChange={ev=>setEventRecipients(current=>ev.target.checked?[...current,person.id]:current.filter(id=>id!==person.id))}/>
                        <span>{person.name}</span>
                      </label>
                      {selected && budgetsEnabled && <input className="control" type="number"
                        aria-label={`Budget for ${person.name}`} min="0" step="1"
                        value={budgetDraft[person.id]??""}
                        onChange={ev=>setBudgetDraft(current=>({...current,[person.id]:ev.target.value}))}
                        placeholder={t("Budget","Бюджет")}/>}
                    </div>;
                  }):<EmptyState compact Icon={UsersRound} title={t("No people yet","Пока нет людей")}
                    description={t("Create a person to select them here.","Создайте человека, чтобы добавить его в событие.")}
                    action={{label:t("Add person","Добавить человека"),onClick:()=>{closeEditor();openEditor({type:"person",eventId:id});}}}/>}
                </div>}
              </div>
            )}
          </>
        ) : (
          <>
            {type === "idea" && (
              <Field label={t("Save to","Сохранить в")}>
                <select className="control" aria-label={t("Save to","Сохранить в")} value={eventId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setEventId(id);
                    const occasion = data.events.find((e) => e.id === id);
                    setPersonId(occasion?.people.includes(personId) ? personId : occasion?.people[0] || "");
                  }}>
                  <option value="">{t("Ideas · save for later","Идеи · на потом")}</option>
                  {data.events.map((occasion) => (
                    <option key={occasion.id} value={occasion.id}>{occasion.name}</option>
                  ))}
                </select>
              </Field>
            )}
            {saveAsGift ? (
              <div className="form-grid">
                {type === "gift" && (
                  <Field label={t("Occasion","Событие")}>
                    <select className="control" name="eventId" required value={eventId}
                      onChange={(e) => {
                        setEventId(e.target.value);
                        const occasion = data.events.find((x) => x.id === e.target.value);
                        setPersonId(occasion?.people.includes(personId) ? personId : occasion?.people[0] || "");
                      }}>
                      <option value="">Choose occasion</option>
                      {eventId && !data.events.some(occasion => occasion.id === eventId) && (
                        <option value={eventId}>Missing occasion — choose another</option>
                      )}
                      {data.events.map((occasion) => (
                        <option key={occasion.id} value={occasion.id}>{occasion.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label={t("For","Для кого")}>
                  <select className="control" name="personId" required value={personId}
                    onChange={(e) => setPersonId(e.target.value)}>
                    <option value="">{t("Choose recipient","Выберите получателя")}</option>
                    {personId && !data.people.some(recipient => recipient.id === personId) && (
                      <option value={personId}>Missing recipient — choose another</option>
                    )}
                    {recipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name}{assignedRecipientIds.has(recipient.id) ? "" : " · add to occasion"}
                      </option>
                    ))}
                  </select>
                </Field>
                {recipientNeedsAssignment && (
                  <p className="section-note" role="status">
                    Saving this gift also adds {data.people.find((p) => p.id === personId)?.name}
                    {" "}to {selectedOccasion?.name}{budgetsEnabled ? ", with no individual budget set." : "."}
                  </p>
                )}
              </div>
            ) : (
              <Field label={t("For (optional)","Для кого (необязательно)")}>
                <select className="control" name="personId" defaultValue={idea?.personId || editor.personId || ""}>
                  <option value="">{t("Anyone","Для кого угодно")}</option>
                  {data.people.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>{recipient.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-grid">
              <Field
                label={(type === "idea" && !saveAsGift ? t("Estimated price","Примерная цена") : t("Price","Цена")) + " (" + currencyUnit() + ")"}
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
              {saveAsGift && !(standalone && type==="gift" && !!id) && (
                <Field label={t("Status","Статус")}>
                  <select
                    className="control"
                    name="status"
                    defaultValue={g?.status || "to_buy"}
                  >
                    <option value="to_buy">{t("To buy","Купить")}</option>
                    <option value="bought">{t("Bought","Куплено")}</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="field">
              <span className="field-label">{t("Photo (optional)","Фото (необязательно)")}</span>
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
                      aria-label={saveAsGift || newUnifiedGift ? "Gift photo" : "Idea photo"}
                      name="imageFile"
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      onChange={(e) => {
                         const file=e.target.files?.[0];e.currentTarget.value="";
                         if(!file)return;
                         try{validatePhoto(file);setChosenPhotoName(file.name);setCropSource(URL.createObjectURL(file));}
                         catch(error){setSaveError((error as Error).message);}
                       }}
                    />
                  </label>
                  {(chosenPhotoUrl || source?.image?.startsWith("data:")) && <button type="button" className="person-photo-remove" onClick={()=>setCropSource(chosenPhotoUrl||source?.image||"")}>{t("Adjust crop","Изменить кадрирование")}</button>}
                  <span className="photo-upload-help">
                    {chosenPhotoName || "JPG, PNG or WebP"}
                  </span>
                </div>
              </div>
            </div>
            <Field label={t("Product link (optional)","Ссылка (необязательно)")}>
              <input
                className="control"
                name="link"
                type="url"
                defaultValue={source?.link || ""}
                placeholder="https://…"
              />
            </Field>
            <Field label={t("Notes","Заметки")}>
              <textarea
                className="control textarea"
                name="note"
                defaultValue={source?.note || ""}
                placeholder="Color, size or where to buy…"
              />
            </Field>

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
            {busy ? t("Saving…","Сохраняем…") : type === "idea" ? (saveAsGift ? t("Add to occasion","Добавить к событию") : t("Save idea","Сохранить идею")) : `Save ${type}`}
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
  );
  return <>
    {standalone ? <div className="gift-edit-page">
      <header className="gift-edit-page-bar">
        <button type="button" onClick={closeEditor}>{t("‹ Gift details","‹ К подарку")}</button>
        <strong>{heading}</strong>
        {type==="gift" && id && <label className="gift-edit-top-status"><span>{t("Status","Статус")}</span>
          <select className="control" name="status" form="gift-editor-form" defaultValue={g?.status||"to_buy"}>
            <option value="to_buy">{t("To buy","Купить")}</option>
            <option value="bought">{t("Bought","Куплено")}</option>
          </select>
        </label>}
      </header>
      <div className="gift-edit-page-body">{form}</div>
    </div> : <Sheet title={heading} busy={busy} onClose={closeEditor}>{form}</Sheet>}
    {cropSource && <PhotoCropSheet src={cropSource} onClose={()=>{
      if(cropSource.startsWith("blob:"))URL.revokeObjectURL(cropSource);
      setCropSource("");
    }} onApply={photo=>{
      setCroppedPhoto(photo);setChosenPhotoUrl(photo);setRemovePersonPhoto(false);setSaveError("");
    }} aspect={1}/>}
  </>;
}
