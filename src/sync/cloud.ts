import type { Firestore, Unsubscribe } from "firebase/firestore";
import type { AppData } from "../domain/models";
import { firebaseConfig } from "../auth/config";
import { getFirebaseAuth } from "../auth/firebase";

/**
 * Firestore layout (one private tree per account, see firestore.rules):
 *
 *   users/{uid}                 settings, skipped and any other top-level
 *                               AppData fields (migration history as JSON)
 *   users/{uid}/people/{id}     friends: name, birthday, likes, photo, …
 *   users/{uid}/events/{id}     occasions & holidays: date, kind, recipients,
 *                               per-person budgets, image, reminders, …
 *   users/{uid}/gifts/{id}      gifts planned for an occasion: price, image,
 *                               link, status, note, source idea, …
 *   users/{uid}/ideas/{id}      saved gift ideas: price, image, link, note, …
 *
 * Every record is stored whole, field for field, so nothing the app keeps
 * locally is dropped. `_pos` keeps the list order the app shows.
 * Photos are already downscaled data URLs (≈30–120 KB); they live inline in
 * their record. Firebase Storage would need the paid Blaze plan.
 */
export const COLLECTIONS = ["people", "events", "gifts", "ideas"] as const;
type Collection = (typeof COLLECTIONS)[number];
type Item = { id: string; [key: string]: unknown };

const MAX_DOC_BYTES = 900_000; // Firestore hard limit is 1 MiB per document.

let pending: Promise<Firestore> | null = null;
export function getDb(): Promise<Firestore> {
  if (!firebaseConfig) return Promise.reject(Error("Firebase is not configured"));
  pending ??= (async () => {
    await getFirebaseAuth(); // initializes the shared app
    const [{ getApp }, fs] = await Promise.all([
      import("firebase/app"),
      import("firebase/firestore"),
    ]);
    const settings = { ignoreUndefinedProperties: true };
    try {
      // Offline cache: edits made without a connection sync later.
      return fs.initializeFirestore(getApp(), {
        ...settings,
        localCache: fs.persistentLocalCache({
          tabManager: fs.persistentMultipleTabManager(),
        }),
      });
    } catch {
      return fs.initializeFirestore(getApp(), settings);
    }
  })();
  return pending;
}

const rootOf = (data: AppData) => {
  const { people: _p, events: _e, gifts: _g, ideas: _i, migration, ...rest } = data;
  const root: Record<string, unknown> = { ...rest, schemaVersion: 3 };
  if (migration) {
    const raw = JSON.stringify(migration);
    // Pre-upgrade snapshot can be big; it always stays in local backups too.
    if (raw.length < MAX_DOC_BYTES / 2) root.migrationJson = raw;
  }
  return root;
};

function fromSnapshots(
  root: Record<string, unknown> | undefined,
  lists: Record<Collection, Item[]>,
): AppData {
  const { schemaVersion: _v, migrationJson, ...rest } = root ?? {};
  const data = {
    settings: { birthdayBudget: 10000, holidays: [] },
    skipped: [],
    ...rest,
    ...lists,
  } as unknown as AppData;
  if (typeof migrationJson === "string") {
    try {
      data.migration = JSON.parse(migrationJson);
    } catch {
      /* keep data without history */
    }
  }
  return data;
}

const ordered = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
  docs
    .map((d) => {
      const { _pos, ...item } = d.data();
      return { pos: typeof _pos === "number" ? _pos : Infinity, item: { ...item, id: d.id } as Item };
    })
    .sort((a, b) => a.pos - b.pos || a.item.id.localeCompare(b.item.id))
    .map((x) => x.item);

/** One-off read of the whole account. Returns null for a brand-new account. */
export async function loadRemote(uid: string): Promise<AppData | null> {
  const db = await getDb(),
    { doc, getDoc, collection, getDocs } = await import("firebase/firestore");
  const [root, ...lists] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    ...COLLECTIONS.map((c) => getDocs(collection(db, "users", uid, c))),
  ]);
  const byName = Object.fromEntries(
    COLLECTIONS.map((c, i) => [c, ordered(lists[i].docs)]),
  ) as Record<Collection, Item[]>;
  const empty = !root.exists() && COLLECTIONS.every((c) => !byName[c].length);
  return empty ? null : fromSnapshots(root.data(), byName);
}

/**
 * Live view of the account. Calls back once every part has loaded, then on
 * each change (including edits from other devices).
 */
export async function subscribe(
  uid: string,
  onData: (data: AppData) => void,
  onError: (err: unknown) => void,
): Promise<Unsubscribe> {
  const db = await getDb(),
    { doc, collection, onSnapshot } = await import("firebase/firestore");
  let root: Record<string, unknown> | undefined;
  let rootReady = false;
  const lists: Partial<Record<Collection, Item[]>> = {};
  const emit = () => {
    if (rootReady && COLLECTIONS.every((c) => lists[c]))
      onData(fromSnapshots(root, lists as Record<Collection, Item[]>));
  };
  const stops = [
    onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        root = snap.data();
        rootReady = true;
        emit();
      },
      onError,
    ),
    ...COLLECTIONS.map((c) =>
      onSnapshot(
        collection(db, "users", uid, c),
        (snap) => {
          lists[c] = ordered(snap.docs);
          emit();
        },
        onError,
      ),
    ),
  ];
  return () => stops.forEach((stop) => stop());
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Writes only what changed between two versions of the data. */
export async function writeDiff(uid: string, prev: AppData | null, next: AppData) {
  const db = await getDb(),
    { doc, writeBatch } = await import("firebase/firestore");
  type Op = { kind: "set"; path: string[]; value: Record<string, unknown> } | { kind: "delete"; path: string[] };
  const ops: Op[] = [];
  const nextRoot = rootOf(next);
  if (!prev || !same(rootOf(prev), nextRoot))
    ops.push({ kind: "set", path: ["users", uid], value: nextRoot });
  for (const c of COLLECTIONS) {
    const before = new Map((prev?.[c] as Item[] | undefined)?.map((item, i) => [item.id, { item, i }]));
    const after = next[c] as Item[];
    for (const [i, item] of after.entries()) {
      const old = before.get(item.id);
      if (!old || old.i !== i || !same(old.item, item))
        ops.push({ kind: "set", path: ["users", uid, c, item.id], value: await fit({ ...item, _pos: i }) });
      before.delete(item.id);
    }
    for (const id of before.keys()) ops.push({ kind: "delete", path: ["users", uid, c, id] });
  }
  // Firestore batches hold up to 500 writes.
  for (let start = 0; start < ops.length; start += 400) {
    const batch = writeBatch(db);
    for (const op of ops.slice(start, start + 400)) {
      const [first, ...rest] = op.path,
        ref = doc(db, first, ...rest);
      if (op.kind === "set") batch.set(ref, op.value);
      else batch.delete(ref);
    }
    await batch.commit();
  }
  return ops.length;
}

/**
 * Old records may hold photos saved before downscaling existed. If one would
 * not fit in a Firestore document, re-encode its images smaller instead of
 * dropping anything.
 */
async function fit(item: Record<string, unknown>): Promise<Record<string, unknown>> {
  let size = JSON.stringify(item).length;
  if (size <= MAX_DOC_BYTES) return item;
  const out = { ...item };
  for (const side of [640, 480, 320]) {
    for (const [key, value] of Object.entries(out))
      if (typeof value === "string" && value.startsWith("data:image/") && value.length > 50_000)
        out[key] = await shrink(value, side);
    size = JSON.stringify(out).length;
    if (size <= MAX_DOC_BYTES) return out;
  }
  return out;
}

function shrink(src: string, side: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(src);
    img.onload = () => {
      const scale = Math.min(side / img.width, side / img.height, 1),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = src;
  });
}

/**
 * Guest → account: everything the guest created is added to the account.
 * Records already in the account win if the same id exists in both.
 */
export function mergeGuestInto(remote: AppData | null, guest: AppData): AppData {
  if (!remote) return guest;
  const merged: AppData = { ...guest, ...remote };
  for (const c of COLLECTIONS) {
    const ids = new Set((remote[c] as Item[]).map((x) => x.id));
    merged[c] = [...(remote[c] as Item[]), ...(guest[c] as Item[]).filter((x) => !ids.has(x.id))] as never;
  }
  merged.settings = {
    ...guest.settings,
    ...remote.settings,
    onboardingComplete: !!(remote.settings.onboardingComplete || guest.settings.onboardingComplete),
  };
  merged.skipped = [...new Set([...(remote.skipped ?? []), ...(guest.skipped ?? [])])];
  return merged;
}

export const hasContent = (d: AppData) =>
  COLLECTIONS.some((c) => (d[c] as unknown[]).length > 0);
