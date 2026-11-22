import {useEffect,useRef,useState,type PointerEvent} from "react";
import {createPortal} from "react-dom";
import {Crop,RotateCcw} from "lucide-react";
import {Sheet} from "./Primitives";
import {t} from "../utils/format";
const SIZE=640;
const clamp=(n:number)=>Math.min(1,Math.max(-1,n));
export function PhotoCropSheet({src,onClose,onApply,aspect=1}:{
  src:string;onClose:()=>void;onApply:(photo:string)=>void;aspect?:number;
}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [image,setImage]=useState<HTMLImageElement|null>(null);
  const [error,setError]=useState("");
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const drag=useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  useEffect(()=>{
    const img=new Image();let cancelled=false;
    img.onload=()=>{if(!cancelled){setImage(img);setError("");}};
    img.onerror=()=>{if(!cancelled)setError(t("This image cannot be cropped.","Не удалось открыть изображение для кадрирования."));};
    img.src=src;
    return ()=>{cancelled=true;};
  },[src]);
  useEffect(()=>{
    const element=canvas.current;if(!element||!image)return;
    const ctx=element.getContext("2d");if(!ctx)return;
    const iw=image.naturalWidth,ih=image.naturalHeight;
    const maxW=Math.min(iw,ih*aspect),maxH=maxW/aspect;
    const w=maxW/zoom,h=maxH/zoom,x=(iw-w)*(1-pan.x)/2,y=(ih-h)*(1-pan.y)/2;
    ctx.clearRect(0,0,element.width,element.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(image,x,y,w,h,0,0,element.width,element.height);
  },[image,zoom,pan,aspect]);
  const down=(e:PointerEvent<HTMLCanvasElement>)=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={x:e.clientX,y:e.clientY,startX:pan.x,startY:pan.y};
  };
  const move=(e:PointerEvent<HTMLCanvasElement>)=>{
    if(!drag.current)return;
    const rect=e.currentTarget.getBoundingClientRect(),d=drag.current;
    setPan({x:clamp(d.startX+(e.clientX-d.x)*2/rect.width),y:clamp(d.startY+(e.clientY-d.y)*2/rect.height)});
  };
  const done=()=>{
    if(!image||!canvas.current)return;
    try{onApply(canvas.current.toDataURL("image/jpeg",.82));onClose();}
    catch{setError(t("Could not save the crop.","Не удалось сохранить кадрирование."));}
  };
  return createPortal(<div className="photo-crop-layer"><Sheet title={t("Crop photo","Кадрировать фото")} onClose={onClose}>
    <div className="photo-crop-content">
      <div className="photo-crop-frame" style={{aspectRatio:String(aspect)}}>
        <canvas ref={canvas} width={SIZE} height={Math.round(SIZE/aspect)} role="img" aria-label={t("Crop preview","Предпросмотр кадрирования")} onPointerDown={down} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>
        {!image&&!error&&<span className="photo-crop-loading">{t("Loading photo…","Загрузка фото…")}</span>}
        <span className="photo-crop-grid" aria-hidden="true"/>
      </div>
      <label className="photo-crop-zoom"><Crop size={16}/><span>{t("Zoom","Масштаб")}</span>
        <input aria-label={t("Zoom","Масштаб")} type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
        <span>{zoom.toFixed(1)}×</span>
      </label>
      {error&&<p role="alert" className="warning">{error}</p>}
      <div className="photo-crop-actions">
        <button type="button" className="button-secondary" onClick={()=>{setPan({x:0,y:0});setZoom(1);}}><RotateCcw size={16}/>{t("Reset","Сбросить")}</button>
        <button type="button" className="button-primary" disabled={!image||!!error} onClick={done}>{t("Use photo","Использовать")}</button>
      </div>
    </div>
  </Sheet></div>,document.body);
}
export function validatePhoto(file:File) {
  if(!file.type.startsWith("image/"))throw Error(t("Choose an image file.","Выберите изображение."));
  if(file.size>10*1024*1024)throw Error(t("Choose an image smaller than 10 MB.","Выберите изображение меньше 10 МБ."));
}
