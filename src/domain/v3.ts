export interface Person { id:string; name:string; birthday:string; note:string; likes?:string; [key:string]:unknown }
export interface Event { id:string; name:string; date:string; kind:'birthday'|'holiday'|'other'; people:string[]; budgets:Record<string,number>; enabled:boolean; image?:string; demo?:boolean; [key:string]:unknown }
export interface EventRecipientBudget { eventId:string; personId:string; amount:number }
export type GiftStatus='to_buy'|'bought';
export interface Idea { id:string; name:string; personId:string; price:number; note:string; image:string; link?:string; migration?:{original:Record<string,unknown>}; [key:string]:unknown }
export interface Gift extends Idea { eventId:string; status:GiftStatus }
export interface Settings { birthdayBudget:number; name?:string; holidays?:string[]; onboardingComplete?:boolean; christmas?:boolean; hanukkah?:boolean; [key:string]:unknown }
export interface AppData { people:Person[]; events:Event[]; gifts:Gift[]; ideas:Idea[]; settings:Settings; skipped:string[]; migration?:{sourceVersion:1|2; original:Record<string,unknown>}; [key:string]:unknown }
export type Editor={ type:'person'|'event'|'gift'|'idea'; id?:string; personId?:string; eventId?:string; prefill?:Idea };
