import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useApp } from "../state/AppState";
import type { Event, Gift, GiftStatus, Person } from "../domain/models";
import { today, uid } from "../utils/format";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}
export function EditorSheet() {
  const { data, editor, commit, closeEditor, notify } = useApp(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    sheet = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>("input")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  if (!editor) return null;
  const { type, id } = editor,
    p = data.people.find((p) => p.id === id),
    e = data.events.find((e) => e.id === id),
    g = data.gifts.find((g) => g.id === id);
  const heading =
    type === "person"
      ? id
        ? "Edit person"
        : "Add a person"
      : type === "event"
        ? id
          ? "Edit occasion"
          : "New occasion"
        : id
          ? "Edit gift"
          : "Add gift";
  const remove = () => {
    if (!confirm("Delete this " + type + "?")) return;
    let next = { ...data };
    if (type === "person") {
      next = {
        ...data,
        people: data.people.filter((p) => p.id !== id),
        gifts: data.gifts.filter((g) => g.personId !== id),
        events: data.events.map((e) => ({
          ...e,
          people: e.people.filter((pid) => pid !== id),
          budgets: Object.fromEntries(
            Object.entries(e.budgets).filter(([pid]) => pid !== id),
          ),
        })),
      };
    } else if (type === "event")
      next = {
        ...data,
        events: data.events.filter((e) => e.id !== id),
        gifts: data.gifts.filter((g) => g.eventId !== id),
      };
    else next = { ...data, gifts: data.gifts.filter((g) => g.id !== id) };
    if (commit(next)) {
      closeEditor();
      if (type !== "gift") navigate(type === "person" ? "/people" : "/events");
      notify("Deleted");
    }
  };
  const save = async (form: HTMLFormElement) => {
    const fd = new FormData(form),
      text = (k: string) => String(fd.get(k) || ""),
      name = text("name").trim();
    if (!name) {
      notify("Please add a name.");
      return;
    }
    setBusy(true);
    try {
      let next = { ...data };
      if (type === "person") {
        const v: Person = {
          ...p,
          id: id || uid(),
          name,
          birthday: text("birthday"),
          note: text("note"),
        };
        next.people = id
          ? data.people.map((p) => (p.id === id ? v : p))
          : [...data.people, v];
      } else if (type === "event") {
        const people = data.people
            .filter((p) => fd.get("person_" + p.id) === "on")
            .map((p) => p.id),
          budgets = Object.fromEntries(
            people.map((pid) => [
              pid,
              Math.max(0, Number(fd.get("budget_" + pid)) || 0),
            ]),
          );
        const v: Event = {
          ...e,
          id: id || uid(),
          name,
          date: text("date"),
          kind: text("kind") as Event["kind"],
          people,
          budgets,
          enabled: true,
          demo: false,
        };
        next.events = id
          ? data.events.map((e) => (e.id === id ? v : e))
          : [...data.events, v];
      } else {
        let image = g?.image || "";
        const file = fd.get("imageFile");
        if (file instanceof File && file.size) {
          if (file.size > 6 * 1024 * 1024)
            throw Error("Choose a photo smaller than 6 MB.");
          if (!file.type.startsWith("image/"))
            throw Error("Choose an image file.");
          image = await readImage(file);
        }
        const v: Gift = {
          ...g,
          id: id || uid(),
          name,
          personId: text("personId"),
          eventId: text("eventId"),
          price: Math.max(0, Number(fd.get("price")) || 0),
          status: text("status") as GiftStatus,
          link: text("link"),
          note: text("note"),
          image,
        };
        next.gifts = id
          ? data.gifts.map((g) => (g.id === id ? v : g))
          : [...data.gifts, v];
      }
      if (commit(next)) {
        closeEditor();
        notify(type === "gift" ? "Gift saved ✓" : "Saved ✓");
      }
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modalbg"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget && !busy) closeEditor();
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Escape" && !busy) closeEditor();
        if (ev.key === "Tab") {
          const nodes = sheet.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea",
          );
          if (!nodes?.length) return;
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (ev.shiftKey && document.activeElement === first) {
            ev.preventDefault();
            last.focus();
          } else if (!ev.shiftKey && document.activeElement === last) {
            ev.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <section
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="sheethead">
          <h2>{heading}</h2>
          <button
            className="close"
            disabled={busy}
            onClick={closeEditor}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            void save(ev.currentTarget);
          }}
        >
          <Field
            label={
              type === "person"
                ? "Name"
                : type === "event"
                  ? "Occasion name"
                  : "Gift name"
            }
          >
            <input
              name="name"
              required
              maxLength={type === "gift" ? 100 : 70}
              defaultValue={
                (type === "person" ? p : type === "event" ? e : g)?.name || ""
              }
              placeholder={
                type === "person"
                  ? "Their name"
                  : type === "event"
                    ? "Birthday, New Year…"
                    : "A lovely gift idea"
              }
            />
          </Field>
          {type === "person" ? (
            <>
              <Field label="Birthday (optional)">
                <input
                  name="birthday"
                  type="date"
                  defaultValue={p?.birthday || ""}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  name="note"
                  defaultValue={p?.note || ""}
                  placeholder="What makes them smile?"
                />
              </Field>
            </>
          ) : type === "event" ? (
            <>
              <div className="fieldrow">
                <Field label="Date">
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={e?.date || today()}
                  />
                </Field>
                <Field label="Type">
                  <select name="kind" defaultValue={e?.kind || "holiday"}>
                    <option value="holiday">Celebration</option>
                    <option value="birthday">Birthday</option>
                  </select>
                </Field>
              </div>
              <div className="field">
                <div className="field-label">
                  Recipients & individual budgets (₽)
                </div>
                {data.people.length ? (
                  data.people.map((p) => (
                    <div className="recipient-budget" key={p.id}>
                      <input
                        aria-label={`Include ${p.name}`}
                        name={"person_" + p.id}
                        type="checkbox"
                        defaultChecked={e?.people.includes(p.id)}
                      />
                      <span>{p.name}</span>
                      <input
                        aria-label={`Budget for ${p.name}`}
                        name={"budget_" + p.id}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={
                          e?.budgets[p.id] ??
                          (e?.kind === "birthday"
                            ? data.settings.birthdayBudget
                            : 1000)
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="sub">Add recipients first in People.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="fieldrow">
                <Field label="For">
                  <select
                    name="personId"
                    required
                    defaultValue={
                      g?.personId || editor.personId || data.people[0]?.id
                    }
                  >
                    {data.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Occasion">
                  <select
                    name="eventId"
                    required
                    defaultValue={
                      g?.eventId || editor.eventId || data.events[0]?.id
                    }
                  >
                    {data.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="fieldrow">
                <Field label="Price (₽)">
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={g?.price || 0}
                  />
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue={g?.status || "idea"}>
                    {["idea", "planned", "bought", "given"].map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Link (optional)">
                <input
                  name="link"
                  type="url"
                  defaultValue={g?.link || ""}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Photo (optional, stored in your browser)">
                <div className="upload">
                  {g?.image ? (
                    <img src={g.image} alt="Gift preview" />
                  ) : (
                    <span style={{ fontSize: 27 }}>🖼️</span>
                  )}
                  <input
                    aria-label="Gift photo"
                    name="imageFile"
                    type="file"
                    accept="image/*"
                  />
                </div>
              </Field>
              <Field label="Notes">
                <textarea
                  name="note"
                  defaultValue={g?.note || ""}
                  placeholder="Size, color, where to buy…"
                />
              </Field>
            </>
          )}
          <div className="spacer" />
          <button disabled={busy} className="action full" type="submit">
            {busy ? "Saving…" : `Save ${type}`}
          </button>
          {id && (
            <button
              disabled={busy}
              type="button"
              className="action alt full danger"
              style={{ marginTop: 9 }}
              onClick={remove}
            >
              Delete {type}
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
