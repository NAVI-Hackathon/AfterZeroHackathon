import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { intelligenceLabels } from '../domain/intelligence.js';
import faq from '../../../../knowledge/faq.json';
import { delayText, serviceCopy } from '../presentation.js';

export default function Copilot({claim,workflow,busy,onSources}) {
  const [question,setQuestion]=useState(''), [messages,setMessages]=useState([]), [answering,setAnswering]=useState(false);
  const timer=useRef(null), log=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{if(messages.length)log.current.scrollTop=log.current.scrollHeight;},[messages,answering]);
  function ask(text) {
    if(!text.trim() || answering)return;
    setMessages(m=>[...m,{role:'user',text:text.trim()}]);setQuestion('');setAnswering(true);
    timer.current=setTimeout(()=>{
      const entry=/why|certificate|為什麼|證明/i.test(text) ? faq[0] : /cover|eligible|claim|理賠|保障/i.test(text) ? faq[1] : /document|need|文件|準備/i.test(text) ? faq[2] : null;
      setMessages(m=>[...m,{role:'assistant',text:entry?.answer || '目前可以協助整理班機延誤的文件與處理步驟。你可以問「需要準備哪些文件？」；其他保單條件可由專員接續確認。',sourceIds:entry?.sourceIds || []}]);setAnswering(false);
    },450);
  }
  const flight=workflow.service.id==='flight_delay', copy=serviceCopy[workflow.service.id];
  const context=workflow.state==='HUMAN_REVIEW' ? '目前的需求或保障條件仍需要確認，下一步可由專員接續。' : busy ? '正在整理文件資訊，並確認符合哪項文件要求。' : workflow.score>=90 ? `已備齊兩份文件，辨識出的延誤時間為 ${delayText(workflow.delay)}。接著確認案件資料。` : workflow.score>=70 ? '航班資訊已補齊，接著準備航空公司的延誤證明。' : '先準備登機證，確認航班與旅客資訊。';
  return <aside className="assistant-rail" id="panel-assistant" role="tabpanel" aria-labelledby="tab-assistant"><div className="section-heading"><div><h2>NAVI</h2><span className="assistant-subtitle">AI 服務助理</span><span className="english-label">AI Service Assistant</span></div><span className="assistant-orbit"><Icon name="spark" size={18}/></span></div>
    <div className="assistant-log" ref={log} role="log" aria-label="服務助理紀錄" aria-live="polite"><div className="user-story"><span className="eyebrow">你的情況</span><p>{claim.input}</p></div><div className="assistant-entry"><span className="assistant-entry-label">NAVI</span>{claim.intelligence && <p>{claim.intelligence.data.summary}</p>}<p>{workflow.state==='HUMAN_REVIEW' ? '目前資訊仍需要專員確認，先整理你的需求與已提供的資料。' : flight ? '我判斷這可能與班機延誤服務有關。先把需要的資訊整理好，再由保險公司確認保障條件。' : copy.description}</p><dl className="intent-facts"><div><dt>已辨識</dt><dd>{claim.intelligence ? intelligenceLabels[claim.intelligence.data.serviceType] : copy.title}</dd></div>{claim.intelligence?.meta.source!=='demo_fallback' && <div><dt>判讀信心估計</dt><dd>{Math.round(claim.interpretation.confidence*100)}<small>%</small></dd></div>}</dl>{flight && <button className="source-trigger" type="button" onClick={()=>onSources(['claim-guide','flight-faq'])}><Icon name="book" size={15}/>服務指引來源 <span>2</span><Icon name="arrow" size={13}/></button>}</div>
      {flight && <div key={workflow.next+Boolean(busy)} className="assistant-context"><span className="context-line"/><span className="eyebrow">目前進度</span><p>{context}</p></div>}
      <div className="assistant-followups">{!messages.length && <p className="conversation-empty">對文件或下一步有疑問？<br/>在下方詢問，或選擇常見問題。</p>}{messages.map((message,i)=><div key={i} className={`assistant-followup ${message.role}`}><span className="eyebrow">{message.role==='user' ? '你的問題' : 'NAVI'}</span><p>{message.text}</p>{message.role==='assistant' && (message.sourceIds.length ? <button className="source-trigger" type="button" onClick={()=>onSources(message.sourceIds)}><Icon name="book" size={14}/>資料來源 <span>{message.sourceIds.length}</span><Icon name="arrow" size={13}/></button> : <span className="no-sources">尚無可引用來源，建議由專員確認。</span>)}</div>)}</div>
      {answering && <div className="assistant-thinking" role="status"><span className="thinking-mark"><Icon name="spark" size={14}/></span>正在整理相關說明</div>}
    </div>
    <div className="assistant-bottom">{flight && <div className="suggested-questions"><button type="button" disabled={answering} onClick={()=>ask(faq[0].title)}>為什麼需要延誤證明？</button><button type="button" disabled={answering} onClick={()=>ask(faq[2].title)}>需要準備哪些文件？</button></div>}<form className="assistant-composer" onSubmit={e=>{e.preventDefault();ask(question);}}><label className="visually-hidden" htmlFor="assistant-question">詢問服務助理</label><input id="assistant-question" value={question} maxLength={500} placeholder="詢問文件或下一步…" onChange={e=>setQuestion(e.target.value)}/><button type="submit" className="icon-button" aria-label="送出問題" disabled={!question.trim() || answering}><Icon name="arrow" size={17}/></button></form><span className="assistant-footnote">常見問題與指引使用示範知識庫。</span></div>
  </aside>;
}
