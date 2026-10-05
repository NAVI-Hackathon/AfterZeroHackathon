import { useEffect, useRef, useState } from 'react';
import { motionMs, useReducedMotion } from '../hooks/useMotion.js';
import Icon from './Icon.jsx';

export default function Dialog({ title, english, onClose, children, variant='' }) {
  const ref = useRef(null);
  const timer=useRef(null);
  const [closing,setClosing]=useState(false);
  const reduced=useReducedMotion();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { clearTimeout(timer.current); dialog.close(); if(previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  function close() {
    if(closing) return;
    if(reduced) {onClose();return;}
    setClosing(true);timer.current=setTimeout(onClose,motionMs('--motion-fast'));
  }
  function trapFocus(e) {
    if(e.key!=='Tab')return;
    const items=Array.from(ref.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),textarea:not(:disabled),summary,[tabindex="0"]')).filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
    const first=items[0], last=items.at(-1);
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
  }
  return <dialog ref={ref} className={`dialog ${variant} ${closing ? 'is-closing' : ''}`} aria-labelledby="dialog-title" onKeyDown={trapFocus} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{const box=ref.current.getBoundingClientRect();if(e.target===ref.current && (e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom))close();}}>
    <div className="dialog-header"><div><h2 id="dialog-title">{title}</h2>{english && <span className="english-label">{english}</span>}</div><button type="button" className="icon-button" aria-label="關閉視窗" onClick={close}><Icon name="close" /></button></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}
