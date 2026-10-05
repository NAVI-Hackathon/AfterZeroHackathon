import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { intelligenceLabels } from '../domain/intelligence.js';
import { analysisErrors } from '../services/intelligence.js';
import { validateFile } from '../domain/workflow.js';
import { DEMO_STORY, fileError } from '../presentation.js';
import { motionMs, useReducedMotion } from '../hooks/useMotion.js';

export default function Landing({ onStart, analysis, interpretation, analysisError, result, onEdit, onHandoff }) {
  const [text,setText]=useState('');
  const [attachment,setAttachment]=useState(null);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState(null);
  const fileInput=useRef(null), textarea=useRef(null), fillFrame=useRef(null);
  const reduced=useReducedMotion();
  const loading=analysis!==null;
  const failure=analysisErrors[analysisError] || analysisErrors.DEFAULT;
  useEffect(()=>()=>cancelAnimationFrame(fillFrame.current),[]);
  const examples=[
    {icon:'plane',label:'我的班機延誤了',text:DEMO_STORY},
    {icon:'car',label:'我發生車禍了',text:'我發生車禍了，想知道接下來需要準備什麼。'},
    {icon:'card',label:'我想更改繳費方式',text:'我想更改保單的繳費方式，該從哪裡開始？'},
  ];
  function fill(example) {
    cancelAnimationFrame(fillFrame.current);setSelected(example.icon);setError('');onEdit();textarea.current.focus();
    if(reduced) {setText(example.text);return;}
    const start=performance.now(), duration=motionMs('--motion-normal');
    function tick(now) {
      const t=Math.min(1,(now-start)/duration);
      setText(example.text.slice(0,Math.ceil(example.text.length*t)));
      if(t<1) fillFrame.current=requestAnimationFrame(tick);
    }
    fillFrame.current=requestAnimationFrame(tick);
  }
  function submit(e) {
    e.preventDefault();cancelAnimationFrame(fillFrame.current);
    const value=selected ? examples.find(example=>example.icon===selected).text : text;
    if(!value.trim()) {setError('先描述你的情況，或選擇下方的範例。');textarea.current.focus();return;}
    setText(value);setError('');onStart(value,attachment);
  }
  return <main id="main-content" className={`landing ${loading ? 'is-analysing' : ''} ${analysis===3 ? 'is-leaving' : ''}`}>
    <div className="ambient-field" aria-hidden="true"/>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="tiny-line"/> UNDERSTAND. GUIDE. RESOLVE.</span><h1>告訴我，<br className="mobile-break"/>發生了什麼事？</h1><p>不用知道保險術語，也不用自己尋找服務入口。<br/>NAVI 會理解你的需求，整理資訊，帶你完成下一步。</p></div>
      <form className="command-surface" onSubmit={submit} aria-busy={loading}>
        <div className="command-top"><Icon name="spark" size={17}/><span>從你的情況開始</span><span className="command-caption">YOUR STORY, YOUR NEXT STEP</span></div>
        <label className="visually-hidden" htmlFor="incident">描述你的情況</label>
        <textarea ref={textarea} id="incident" value={text} maxLength={2000} aria-describedby="incident-help" disabled={loading} onChange={e=>{cancelAnimationFrame(fillFrame.current);setText(e.target.value);setSelected(null);setError('');onEdit();}} placeholder="例如：我從東京回台灣的班機延誤了 7 小時，不知道可以怎麼處理……"/>
        {attachment && <div className="attachment"><Icon name="document" size={15}/><span>{attachment}</span><button className="icon-button" type="button" aria-label="移除附加文件" disabled={loading} onClick={()=>setAttachment(null)}><Icon name="close" size={14}/></button></div>}
        <div className="command-actions"><button type="button" className="attach-button" disabled={loading} onClick={()=>fileInput.current.click()}><span className="attach-plus"><Icon name="plus" size={16}/></span>附加文件</button><span className="input-language">繁體中文 / English</span><button className="button button-primary" type="submit" disabled={loading}>{loading ? '正在分析' : analysisError ? '重新分析' : '開始分析'}<Icon name={loading ? 'spark' : 'arrow'} size={18}/></button></div>
        <input ref={fileInput} className="visually-hidden" type="file" aria-label="附加登機證" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={loading} onChange={e=>{const file=e.target.files[0];if(file){const failure=validateFile(file);setError(fileError(failure));if(!failure)setAttachment(file.name);}e.target.value='';}}/>
      </form>
      <p id="incident-help" className="incident-help">描述會交由 AI 分析，請避免填入身分證字號或帳戶資料。附加文件目前僅使用示範辨識。</p>
      <div className="input-feedback">{error && <p role="alert" className="error-message"><Icon name="info" size={15}/>{error}</p>}</div>
      <div className="hero-after-input">
        {!loading ? <>{analysisError && <section className="analysis-feedback" role="alert"><span className="eyebrow">分析暫時未完成</span><h2 id="analysis-error-title" tabIndex={-1}>{failure[0]}</h2><p>{failure[1]}</p></section>}{result && <section className="analysis-feedback" role="status"><span className="eyebrow">{result.meta.outcome==='clarification'?'補充你的情況':'NAVI 已辨識你的需求'}</span><h2 id="analysis-result-title" tabIndex={-1}>{result.meta.outcome==='clarification'?'我還需要一些資訊':intelligenceLabels[result.data.serviceType]}</h2><p>{result.meta.outcome==='clarification'?'可以再描述一下你目前想處理的事情，或發生了什麼嗎？':result.data.summary}</p>{result.meta.outcome==='preview' && <p>目前 Prototype 尚未開放這項需求的完整服務旅程。</p>}<div className="analysis-feedback-actions"><button type="button" className="button button-secondary" onClick={()=>{onEdit();textarea.current.focus();}}>{result.meta.outcome==='clarification'?'補充說明':'重新描述'}<Icon name="arrow" size={16}/></button><button type="button" className="inline-button" onClick={()=>onHandoff(text)}>轉由專員協助<Icon name="arrow" size={15}/></button></div></section>}<div className="examples"><span>也可以從這裡開始</span><div>{examples.map(example=><button type="button" className={`example-chip ${selected===example.icon ? 'selected' : ''}`} key={example.icon} aria-pressed={selected===example.icon} onClick={()=>fill(example)}><Icon name={example.icon} size={16}/>{example.label}<Icon name="arrow" size={14}/></button>)}</div></div></>
          : <div className="analysis-sequence" role="status" aria-live="polite"><div className="analysis-heading"><span className="thinking-mark"><Icon name="spark" size={18}/></span><strong>正在理解你的情況</strong><span className="english-label">UNDERSTANDING YOUR SITUATION</span></div><div className="analysis-steps">{['理解需求',`辨識服務${interpretation ? '：'+intelligenceLabels[interpretation.data.serviceType] : ''}`,interpretation?.meta.outcome==='supported'?'建立服務旅程':'整理下一步'].map((label,i)=><div key={i} className={analysis>i ? 'complete' : analysis===i ? 'current' : ''}><span>{analysis>i ? <Icon name="check" size={12}/> : i+1}</span>{label}</div>)}</div></div>}
      </div>
    </section>
    <section className="landing-journey" aria-label="服務導航流程"><div><span className="eyebrow">從「怎麼辦」，到下一步。</span><p>一個清楚的旅程，<br/>取代來回尋找。</p></div><div className="landing-path"><div><Icon name="spark" size={19}/><strong>理解情況</strong><small>用你的話，找到相關服務</small></div><span/><div><Icon name="document" size={19}/><strong>整理資料</strong><small>看見已備齊與待補充的資訊</small></div><span/><div><Icon name="arrow" size={19}/><strong>前往服務</strong><small>保留人的判斷，帶你完成下一步</small></div></div></section>
    <footer className="page-footer"><span><Icon name="shield" size={15}/> 清楚的引導，保留你的選擇。</span><span>NAVI <span className="footer-separator">/</span> Service Navigation</span></footer>
  </main>;
}
