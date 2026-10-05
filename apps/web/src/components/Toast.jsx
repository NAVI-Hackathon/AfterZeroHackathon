import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { motionMs } from '../hooks/useMotion.js';
export default function Toast({ message,onDismiss }) {
  const [closing,setClosing]=useState(false);
  useEffect(()=> {const timer=setTimeout(()=>setClosing(true),3200);return ()=>clearTimeout(timer);},[]);
  useEffect(()=> {if(!closing) return;const timer=setTimeout(onDismiss,motionMs('--motion-fast'));return ()=>clearTimeout(timer);},[closing,onDismiss]);
  return <div className={`toast ${closing ? 'is-closing' : ''}`} role="status"><span className="toast-check"><Icon name="check" size={16}/></span><p>{message}</p><button type="button" className="icon-button" aria-label="關閉提示" onClick={()=>setClosing(true)}><Icon name="close" size={16}/></button></div>;
}
