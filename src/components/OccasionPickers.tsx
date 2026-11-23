import {useEffect,useState} from "react";
import {ChevronLeft,ChevronRight,Plus,UsersRound,Lightbulb,Sparkles,Gift as GiftIcon} from "lucide-react";
import {useApp} from "../state/AppState";
import {currencyCode,uid,t} from "../utils/format";
import {discoverySuggestions,ideaFromDiscovery} from "../domain/discovery";
import {Sheet} from "./Primitives";
import {PersonAvatar,Product} from "./UI";
import {EmptyState} from "./EmptyState";

/** Shared event / Home recipient chooser: edits membership, not the whole occasion. */
export function OccasionRecipientPicker() {
  const {data,ui,setUi,commit,notify,openEditor}=useApp();
  const event=data.events.find(x=>x.id===ui.recipientPickerEventId);
  const [chosen,setChosen]=useState<string[]>([]);
  useEffect(()=>{setChosen(event?.people||[]);},[event?.id,ui.recipientPickerEventId]);
  if(!event)return null;
  const close=()=>setUi({recipientPickerEventId:""});
  const locked=event.kind==="birthday";
  const hasGifts=(pid:string)=>data.gifts.some(g=>g.eventId===event.id&&g.personId===pid);
  const toggle=(id:string,checked:boolean)=>{
    setChosen(current=>checked?[...new Set([...current,id])]:current.filter(pid=>pid!==id));
  };
  const save=()=>{
    if(locked){close();return;}
    if(data.gifts.some(g=>g.eventId===event.id&&!chosen.includes(g.personId))){
      notify(t("A recipient with gifts cannot be removed.","Нельзя удалить получателя с подарками."),"error");return;
    }
    const budgets=Object.fromEntries(Object.entries(event.budgets).filter(([id])=>chosen.includes(id)));
    if(commit({...data,events:data.events.map(e=>e.id===event.id?{...e,people:chosen,budgets}:e)})){
      notify(t("Recipients updated","Получатели обновлены"),"success");close();
    }
  };
  const addNew=()=>{close();openEditor({type:"person",eventId:event.id});};
  return <Sheet title={t("Choose recipients","Выберите получателей")} onClose={close}>
    <div className="occasion-picker-content">
      {locked?<EmptyState compact Icon={UsersRound} title={t("Birthday recipient","Именинник")} description={t("A birthday is linked to one person. Change the birthday in their profile.","День рождения связан с одним человеком. Измените данные в его профиле.")}/>:data.people.length?
        <>
          <p className="occasion-picker-intro">{t("Select who you are planning gifts for. Existing budgets will be preserved.","Выберите, кому готовите подарки. Существующие бюджеты сохранятся.")}</p>
          <div className="occasion-recipient-list" role="group" aria-label={t("Recipients","Получатели")}>
            {data.people.map(person=><label className="occasion-recipient-row" key={person.id}>
              <PersonAvatar person={person}/>
              <span>{person.name}{hasGifts(person.id)&&<small>{t("Has planned gifts","Есть подарки")}</small>}</span>
              <input type="checkbox" aria-label={`Include ${person.name}`} checked={chosen.includes(person.id)} disabled={hasGifts(person.id)} onChange={e=>toggle(person.id,e.target.checked)}/>
            </label>)}
          </div>
          <div className="occasion-picker-buttons">
            <button type="button" className="button-secondary" onClick={addNew}><Plus size={16}/>{t("Add a new person","Добавить человека")}</button>
            <button type="button" className="button-primary" onClick={save}>{t("Save recipients","Сохранить получателей")}</button>
          </div>
        </>:
        <EmptyState Icon={UsersRound} title={t("No people to choose yet","Пока некому дарить")} description={t("Add your first person. We'll include them in this occasion automatically.","Создайте первого человека — мы сразу добавим его в это событие.")} action={{label:t("Add a person","Добавить человека"),onClick:addNew}}/>
      }
    </div>
  </Sheet>;
}

/** A single gift chooser for both Home and occasion details. */
export function OccasionGiftPicker() {
  const {data,ui,setUi,openEditor,openGiftPreview}=useApp();
  const event=data.events.find(e=>e.id===ui.giftPickerEventId);
  const [personId,setPersonId]=useState("");
  const [source,setSource]=useState<"saved"|"suggested">("saved");
  useEffect(()=>{
    const e=data.events.find(x=>x.id===ui.giftPickerEventId);
    setPersonId(e?.people.includes(ui.giftPickerPersonId)?ui.giftPickerPersonId:(e?.people.length===1?e.people[0]:""));
    setSource("saved");
  },[ui.giftPickerEventId]);
  if(!event)return null;
  const close=()=>setUi({giftPickerEventId:""});
  const chooseRecipients=()=>setUi({giftPickerEventId:"",recipientPickerEventId:event.id});
  const person=data.people.find(p=>p.id===personId);
  const savedIdeas=data.ideas.filter(i=>!i.personId||i.personId===personId);
  const suggested=discoverySuggestions.filter(item=>
    !data.skipped.includes(item.id)&&!data.ideas.some(idea=>idea.sourceDiscoveryId===item.id));
  const useSaved=(idea:typeof savedIdeas[number])=>{
    close();openEditor({type:"gift",eventId:event.id,personId, prefill:idea});
  };
  const useSuggestion=(item:typeof suggested[number])=>{
    const idea=ideaFromDiscovery(currencyCode==="RUB"?item:{...item,price:0},personId,uid());
    close();openEditor({type:"gift",eventId:event.id,personId,prefill:idea});
  };
  const addGift=()=>{close();openEditor({type:"gift",eventId:event.id,personId});};
  const title=person?t("Gift for ","Подарок для ")+person.name : t("Choose recipient","Выберите получателя");
  return <Sheet title={title} onClose={close}>
    <div className="occasion-picker-content">
      {event.people.length===0?
        <EmptyState Icon={UsersRound} title={t("Choose who you're gifting","Выберите получателя")} description={t("Add someone to this occasion before planning a gift.","Сначала добавьте человека к событию, затем выберите подарок.")} action={{label:t("Choose recipients","Выбрать получателей"),onClick:chooseRecipients}}/>:
        !person?<>
          <p className="occasion-picker-intro">{t("Who is this gift for?","Кому этот подарок?")}</p>
          <div className="gift-recipient-choices">
            {event.people.map(id=>{
              const p=data.people.find(item=>item.id===id);if(!p)return null;
              return <button data-ph="gift-picker-recipient" type="button" className="gift-recipient-option" key={p.id}
                onClick={()=>{setPersonId(p.id);setSource("saved");}}>
                <PersonAvatar person={p} className="event-person-avatar"/>
                <span className="item-body"><strong>{p.name}</strong></span><ChevronRight size={18}/>
              </button>;
            })}
          </div>
          <button type="button" className="occasion-picker-inline-link" onClick={chooseRecipients}>{t("Manage recipients","Изменить получателей")}</button>
        </>:
        <>
          {event.people.length>1 && <button type="button" className="occasion-picker-back" onClick={()=>setPersonId("")}><ChevronLeft size={17}/>{t("Change recipient","Другой получатель")}</button>}
          <div className="gift-picker-tabs" role="group" aria-label={t("Gift sources","Источники идей")}>
            <button type="button" aria-pressed={source==="saved"} className={source==="saved"?"is-active":""} onClick={()=>setSource("saved")}>
              <Lightbulb size={16}/>{t("Saved ideas","Сохранённые")} <span>{savedIdeas.length}</span>
            </button>
            <button type="button" aria-pressed={source==="suggested"} className={source==="suggested"?"is-active":""} onClick={()=>setSource("suggested")}>
              <Sparkles size={16}/>{t("From Givvy","От Givvy")} <span>{suggested.length}</span>
            </button>
          </div>
          {source==="saved" ? savedIdeas.length?
            <><p className="gift-picker-intro">{t("Your saved ideas for this person (and ideas for anyone).","Ваши идеи для этого человека и универсальные идеи.")}</p>
              <div className="gift-picker-ideas">{savedIdeas.map(idea=><div key={idea.id} className="gift-picker-option">
  <Product item={idea} showEdit={false} onClick={()=>{close();openGiftPreview(`idea:${idea.id}`,{eventId:event.id,personId});}}/>
  <button type="button" className="gift-picker-select-idea" aria-label={`Use idea ${idea.name}`} onClick={()=>useSaved(idea)}>
    {t("Choose gift","Выбрать")}
  </button>
</div>)}</div></>:
            <EmptyState compact Icon={Lightbulb} title={t("No saved ideas yet","Пока нет сохранённых идей")} description={t("Explore Givvy suggestions or add a gift manually.","Посмотрите предложения Givvy или добавьте подарок сами.")} action={{label:t("See Givvy suggestions","Посмотреть предложения"),onClick:()=>setSource("suggested")}}/>:
            suggested.length?
            <><p className="gift-picker-intro">{t("Suggestions from Givvy, separate from the ideas you've saved.","Предложения Givvy — отдельно от ваших сохранённых идей.")}</p>
              <div className="gift-picker-ideas">{suggested.map(item=>{
  const suggestion=ideaFromDiscovery(currencyCode==="RUB"?item:{...item,price:0},personId,item.id);
  return <div key={item.id} className="gift-picker-option">
    <Product item={suggestion} showEdit={false} onClick={()=>{close();openGiftPreview(`idea:${item.id}`,{eventId:event.id,personId,prefill:suggestion});}}/>
    <button type="button" className="gift-picker-select-idea" aria-label={`Use suggestion ${item.name}`} onClick={()=>useSuggestion(item)}>
      {t("Choose gift","Выбрать")}
    </button>
  </div>;
})}</div></>:
            <EmptyState compact Icon={GiftIcon} title={t("That's all our suggestions for now","Пока больше нет предложений")} description={t("You can create a gift of your own.","Можно добавить собственный подарок.")} action={{label:t("Add a new gift","Добавить подарок"),onClick:addGift}}/>
          }
          <button data-ph="gift-picker-new" type="button" className="button-primary gift-picker-new occasion-picker-create" onClick={addGift}><Plus size={16}/>{t("Add a new gift","Добавить свой подарок")}</button>
        </>
      }
    </div>
  </Sheet>;
}
