import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Heart, SlidersHorizontal, UsersRound, X } from "lucide-react";
import type { Idea } from "../domain/models";
import { Empty, PersonAvatar, Product, Title } from "../components/UI";
import { Button, Sheet } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { uid } from "../utils/format";
// Inline the source images: saving a suggestion must work offline, survive a
// GitHub Pages rebuild and export/import without depending on a remote URL.
import artbook from "../assets/discovery/artbook-hires.jpg?inline";
import blanket from "../assets/discovery/blanket-hires.jpg?inline";
import mug from "../assets/discovery/mug-hires.jpg?inline";
import candle from "../assets/discovery/candle-hires.jpg?inline";

type Audience = "adult" | "child";
type Relationship = "close" | "acquaintance";
type DiscoveryFilters = { audiences: Audience[]; relationships: Relationship[] };
type Suggestion = {
  id: string;
  name: string;
  image: string;
  price: number;
  note: string;
  audiences: Audience[];
  relationships: Relationship[];
};

/** An intentionally small starter catalog. Expand content and taxonomy later;
 * neither a skip nor a saved idea depends on the item's array position. */
const suggestions: Suggestion[] = [
  { id: "discovery:ceramic-mug", name: "Ceramic mug", image: mug, price: 1200,
    note: "Handmade styles and different glazes",
    audiences: ["adult"], relationships: ["close", "acquaintance"] },
  { id: "discovery:throw-blanket", name: "Throw blanket", image: blanket, price: 2100,
    note: "Soft textures and cozy corners",
    audiences: ["adult", "child"], relationships: ["close"] },
  { id: "discovery:art-book", name: "Art book", image: artbook, price: 1800,
    note: "Art, photography and illustration",
    audiences: ["adult"], relationships: ["close", "acquaintance"] },
  { id: "discovery:scented-candle", name: "Scented candle", image: candle, price: 900,
    note: "Atmospheric gifts for the home",
    audiences: ["adult"], relationships: ["close", "acquaintance"] },
];
const initialFilters: DiscoveryFilters = { audiences: [], relationships: [] };
const audienceLabels: Record<Audience, string> = { adult: "Adult", child: "Child" };
const relationshipLabels: Record<Relationship, string> = {
  close: "Close person", acquaintance: "Acquaintance",
};

export function Ideas() {
  const { data, commit, notify, ui, setUi, openEditor } = useApp();
  const tab = ui.ideasTab;
  const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likedId, setLikedId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);
  const isAnimating = exiting !== null;

  const hasSeen = (id: string) => data.skipped.includes(id) ||
    data.ideas.some(idea => idea.sourceDiscoveryId === id);
  const remaining = suggestions.filter(item =>
    !hasSeen(item.id) &&
    (!filters.audiences.length || item.audiences.some(value => filters.audiences.includes(value))) &&
    (!filters.relationships.length || item.relationships.some(value => filters.relationships.includes(value))),
  );
  const suggestion = remaining[0];
  const liked = suggestions.find(item => item.id === likedId);

  const dismissSuggestion = (id: string) => {
    if (data.skipped.includes(id)) return;
    if (commit({ ...data, skipped: [...data.skipped, id] })) {
      notify("Not for you — we'll remember", "info");
    } else {
      notify("Couldn't skip idea", "error");
    }
  };
  const reactToIdea = (direction: "left" | "right") => {
    if (!suggestion || exiting) return;
    const id = suggestion.id;
    dragStart.current = null;
    setExiting(direction);
    setDragX((direction === "right" ? 1 : -1) * Math.max(520, window.innerWidth + 90));
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      setExiting(null);
      setDragX(0);
      if (direction === "right") setLikedId(id);
      else dismissSuggestion(id);
    }, 280);
  };
  const releaseDrag = () => {
    const x = dragX;
    dragStart.current = null;
    if (Math.abs(x) > 85) reactToIdea(x > 0 ? "right" : "left");
    else setDragX(0);
  };
  const toggleDraft = <T extends Audience | Relationship>(
    field: "audiences" | "relationships", value: T,
  ) => setDraftFilters(current => {
    const currentItems = current[field] as T[];
    const nextItems = currentItems.includes(value)
      ? currentItems.filter(item => item !== value)
      : [...currentItems, value];
    return { ...current, [field]: nextItems };
  });
  const saveFor = (personId: string) => {
    if (!liked || data.ideas.some(idea => idea.sourceDiscoveryId === liked.id)) {
      setLikedId(null);
      return;
    }
    const idea: Idea = {
      id: uid(),
      name: liked.name,
      personId,
      price: liked.price,
      image: liked.image,
      note: liked.note,
      link: "",
      sourceDiscoveryId: liked.id,
    };
    if (commit({ ...data, ideas: [...data.ideas, idea] })) {
      setLikedId(null);
      notify("Saved to ideas", "success");
    } else {
      notify("Couldn't save this idea", "error");
    }
  };
  const openFilters = () => {
    setDraftFilters({ audiences: [...filters.audiences], relationships: [...filters.relationships] });
    setFiltersOpen(true);
  };
  const savedPerson = ui.filterPerson;
  const savedIdeas = data.ideas.filter(idea =>
    savedPerson === "all" || (savedPerson === "anyone" ? !idea.personId : idea.personId === savedPerson),
  );

  return (
    <div className="ideas-page">
      <Title name="Ideas" />
      <div className="pill-tabs ideas-mode-tabs" role="group" aria-label="Ideas views">
        <button type="button" className={`pill-tab ${tab === "discover" ? "is-active" : ""}`}
          aria-pressed={tab === "discover"} onClick={() => setUi({ ideasTab: "discover" })}>
          Discover
        </button>
        <button type="button" className={`pill-tab ${tab === "saved" ? "is-active" : ""}`}
          aria-pressed={tab === "saved"} onClick={() => setUi({ ideasTab: "saved" })}>
          Saved
        </button>
      </div>

      {tab === "discover" ? (
        <section className="ideas-discover" aria-label="Discover gift ideas">
          <div className="ideas-filter-toolbar">
            <button className="ideas-filters-button" type="button" onClick={openFilters}>
              <SlidersHorizontal size={17} aria-hidden="true" />
              Filters
              {filters.audiences.length + filters.relationships.length > 0 && (
                <span className="ideas-filter-count" aria-label="Filters active">
                  {filters.audiences.length + filters.relationships.length}
                </span>
              )}
            </button>
            {filters.audiences.length + filters.relationships.length > 0 && (
              <div className="ideas-active-filters" aria-label="Active filters">
                {filters.audiences.map(value => (
                  <button key={value} type="button" className="ideas-filter-chip"
                    aria-label={`Remove ${audienceLabels[value]} filter`}
                    onClick={() => setFilters(current => ({
                      ...current, audiences: current.audiences.filter(item => item !== value),
                    }))}>
                    {audienceLabels[value]} <X size={13} aria-hidden="true" />
                  </button>
                ))}
                {filters.relationships.map(value => (
                  <button key={value} type="button" className="ideas-filter-chip"
                    aria-label={`Remove ${relationshipLabels[value]} filter`}
                    onClick={() => setFilters(current => ({
                      ...current, relationships: current.relationships.filter(item => item !== value),
                    }))}>
                    {relationshipLabels[value]} <X size={13} aria-hidden="true"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          {suggestion ? (
            <div className="ideas-swipe-stage">
              <article className={`ideas-discovery-card ${exiting ? "is-exiting" : ""} ${dragX ? "is-dragging" : ""}`}
                data-swipe-direction={dragX > 0 ? "right" : dragX < 0 ? "left" : "none"}
                style={{
                  transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX / 24}deg)`,
                  touchAction: "pan-y",
                }}
                onPointerDown={e => {
                  if (isAnimating || liked || (e.pointerType === "mouse" && e.button !== 0)) return;
                  dragStart.current = { x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={e => {
                  if (!dragStart.current || isAnimating) return;
                  const deltaX = e.clientX - dragStart.current.x;
                  const deltaY = e.clientY - dragStart.current.y;
                  if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
                  if (Math.abs(deltaY) > Math.abs(deltaX) * 1.3 && !dragX) return;
                  setDragX(Math.max(-170, Math.min(170, deltaX)));
                }}
                onPointerUp={releaseDrag}
                onPointerCancel={() => { dragStart.current = null; setDragX(0); }}>
                <div className="ideas-discovery-visual">
                  <img className="ideas-discovery-photo" src={suggestion.image} alt={suggestion.name} draggable={false}/>
                  <div className={`ideas-swipe-overlay ${dragX >= 0 ? "positive" : "negative"}`}
                    style={{ opacity: Math.min(0.85, Math.abs(dragX) / 150) }} aria-hidden="true">
                    {dragX >= 0 ? <Heart size={65} strokeWidth={2.2} fill="currentColor"/> :
                      <X size={72} strokeWidth={2.4}/>}
                  </div>
                </div>
                <div className="ideas-discovery-caption">
                  <h2>{suggestion.name}</h2>
                </div>
              </article>
              <div className="ideas-reactions" role="group" aria-label="React to gift idea">
                <button type="button" className="ideas-reaction ideas-dislike"
                  aria-label="Dislike idea" title="Skip this idea" disabled={isAnimating}
                  onClick={() => reactToIdea("left")}>
                  <X size={27} strokeWidth={2.6} aria-hidden="true"/>
                </button>
                <button type="button" className="ideas-reaction ideas-like"
                  aria-label="Like idea" title="Save this idea" disabled={isAnimating}
                  onClick={() => reactToIdea("right")}>
                  <Heart size={27} strokeWidth={2.1} aria-hidden="true"/>
                </button>
              </div>
            </div>
          ) : (
            <div className="ideas-discover-empty">
              <Empty>You've seen all the ideas in this selection.</Empty>
              {data.skipped.some(id => suggestions.some(suggestion => suggestion.id === id)) && (
                <button type="button" className="ideas-review-skipped"
                  onClick={() => {
                    if (commit({ ...data, skipped: data.skipped.filter(id =>
                      !suggestions.some(suggestion => suggestion.id === id)) })) {
                      notify("Skipped ideas are back in Discover");
                    }
                  }}>
                  Review skipped ideas
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="ideas-saved" aria-label="Saved gift ideas">
          <div className="filter-row ideas-people-filters" aria-label="Filter ideas by person">
            {[{ id: "all", name: "All" }, { id: "anyone", name: "Anyone" },
              ...data.people].map(person => (
              <button key={person.id} data-ph="ideas-filter-person" type="button"
                className={`filter-pill ${savedPerson === person.id ? "active" : ""}`}
                aria-pressed={savedPerson === person.id}
                onClick={() => setUi({ filterPerson: person.id })}>
                {person.name}
              </button>
            ))}
          </div>
          {savedIdeas.length ? (
            <div className="smallcards-grid ideas-saved-grid">
              {savedIdeas.map(idea => (
                <Product key={idea.id} item={idea}
                  onClick={() => openEditor({type:"idea", id:idea.id})}/>
              ))}
            </div>
          ) : (
            <Empty>No saved ideas here yet. Discover one you like or add your own with +.</Empty>
          )}
        </section>
      )}

      {filtersOpen && (
        <Sheet title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="ideas-filter-sheet">
            <fieldset className="ideas-filter-fieldset">
              <legend>Age</legend>
              <div className="ideas-filter-choices">
                {([
                  ["any", "Any age"], ["adult", "Adult"], ["child", "Child"],
                ] as const).map(([value, label]) => (
                  <button type="button" key={value}
                    className={`ideas-filter-choice ${draftFilters.audience === value ? "is-selected" : ""}`}
                    aria-pressed={draftFilters.audience === value}
                    onClick={() => setDraftFilters(current => ({ ...current, audience: value }))}>
                    {label}
                    {draftFilters.audience === value && <Check size={18} aria-hidden="true"/>}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="ideas-filter-fieldset">
              <legend>Relationship</legend>
              <div className="ideas-filter-choices">
                {([
                  ["any", "Anyone"], ["close", "Close person"],
                  ["acquaintance", "Acquaintance"],
                ] as const).map(([value, label]) => (
                  <button type="button" key={value}
                    className={`ideas-filter-choice ${draftFilters.relationship === value ? "is-selected" : ""}`}
                    aria-pressed={draftFilters.relationship === value}
                    onClick={() => setDraftFilters(current => ({ ...current, relationship: value }))}>
                    {label}
                    {draftFilters.relationship === value && <Check size={18} aria-hidden="true"/>}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="ideas-filter-footer">
              <button type="button" className="button-outline"
                onClick={() => setDraftFilters({ ...initialFilters })}>Clear</button>
              <Button type="button" onClick={() => { setFilters(draftFilters); setFiltersOpen(false); }}>
                Apply filters
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {liked && (
        <Sheet title="Save this idea for who?" onClose={() => setLikedId(null)}>
          <div className="ideas-recipient-sheet">
            <button type="button" className="ideas-recipient-option ideas-recipient-anyone"
              onClick={() => saveFor("")}>
              <span className="ideas-recipient-anyone-icon" aria-hidden="true">
                <UsersRound size={21} aria-hidden="true"/>
              </span>
              <span className="ideas-recipient-text"><strong>Anyone</strong>
                <small>A universal idea</small></span>
              <ChevronRight size={19} className="ideas-recipient-chevron" aria-hidden="true"/>
            </button>
            {data.people.map(person => (
              <button type="button" className="ideas-recipient-option" key={person.id}
                onClick={() => saveFor(person.id)}>
                <PersonAvatar person={person} className="ideas-recipient-avatar"/>
                <span className="ideas-recipient-text"><strong>{person.name}</strong></span>
                <ChevronRight size={19} className="ideas-recipient-chevron" aria-hidden="true"/>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
