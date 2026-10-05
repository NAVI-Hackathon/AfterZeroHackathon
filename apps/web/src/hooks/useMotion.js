import { createContext, useContext, useEffect, useRef, useState } from 'react';
export const MotionContext = createContext(false);
export function useReducedMotion() {
  const override=useContext(MotionContext);
  const [system,setSystem]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=> {
    const query=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setSystem(query.matches);
    query.addEventListener('change',change);
    return ()=>query.removeEventListener('change',change);
  },[]);
  return system || override;
}
export function motionMs(token) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0; }
export function interpolate(from,to,progress) {
  const t=Math.max(0,Math.min(1,progress));
  return from+(to-from)*(1-Math.pow(1-t,3));
}
export function useAnimatedNumber(target,override=false) {
  const reduced=useReducedMotion() || override;
  const [value,setValue]=useState(target);
  const current=useRef(target);
  useEffect(()=> {
    if(reduced) { current.current=target;setValue(target);return; }
    const from=current.current, duration=motionMs('--motion-slow'), start=performance.now();
    let frame;
    function tick(now) {
      const t=duration ? Math.min(1,(now-start)/duration) : 1;
      current.current=interpolate(from,target,t);setValue(current.current);
      if(t<1) frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[target,reduced]);
  return reduced ? target : value;
}
