import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { intelligenceLabels } from '../domain/intelligence.js';
import { city, delayText, documentCopy, safeGuidance, serviceCopy } from '../presentation.js';

export default function Review({claim,workflow,onConfirm,onProceed,onSources}) {
  const [checked,setChecked]=useState(claim.confirmed);
  const b=claim.evidence.boarding_pass.fields;
  return <><div className="review-intro"><div><span className="eyebrow">提交前確認</span><h3>{claim.confirmed ? '資料已準備完成' : '再確認一次，就能進行下一步'}</h3><p>以下文件內容為示範辨識資料，請確認後再繼續。</p></div><div className="review-score"><span>準備度</span><strong>{workflow.score}<small>%</small></strong></div></div>
    <div className="review-sections"><section><h4>你的情況</h4><p>{claim.input}</p></section><section><h4>航班資訊</h4><dl className="review-fields"><div><dt>旅客</dt><dd>{b.passengerName}</dd></div><div><dt>航班 / 日期</dt><dd>{b.flightNumber} · 2026 / 10 / 05</dd></div><div><dt>航線</dt><dd>{city(b.origin)} → {city(b.destination)}</dd></div><div><dt>原定 / 實際起飛</dt><dd>14:20 / 21:43 JST</dd></div><div className="review-delay"><dt>延誤時間</dt><dd>{delayText(workflow.delay)}</dd></div></dl></section><section><h4>已提供文件</h4><div className="review-documents">{Object.entries(claim.evidence).map(([type,evidence])=><div key={type}><Icon name="check" size={15}/><span>{documentCopy[type].title}<small>{evidence.filename}</small></span></div>)}</div></section><section><h4>服務判斷</h4><p>{safeGuidance}</p></section><section><h4>資料來源</h4><button className="source-trigger" type="button" onClick={()=>onSources(['claim-guide','flight-faq'])}><Icon name="book" size={15}/>班機延誤指南與常見問題<span>2</span><Icon name="arrow" size={14}/></button></section></div>
    {!claim.confirmed && <label className="confirmation-check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span>我已確認以上示範案件資料完整。</span></label>}
    <div className="dialog-actions"><p><Icon name="shield" size={14}/>準備度不代表核准，本次操作不會送出理賠申請。</p><button type="button" className="button button-primary" disabled={!checked} onClick={claim.confirmed ? onProceed : onConfirm}>{claim.confirmed ? '前往服務' : '確認資料'}<Icon name={claim.confirmed?'arrow':'check'} size={17}/></button></div>
  </>;
}

export function Handoff({claim,workflow,onPrepare}) {
  const [prepared,setPrepared]=useState(false), [exportText,setExportText]=useState('');
  const downloadButton=useRef(null);
  const serviceTitle=claim.intelligence ? intelligenceLabels[claim.intelligence.data.serviceType] : serviceCopy[workflow.service.id].title;
  const collected=Object.keys(claim.evidence).map(type=>documentCopy[type].title);
  const missing=workflow.service.id==='flight_delay' ? Object.keys(documentCopy).filter(type=>!claim.evidence[type]).map(type=>documentCopy[type].title).concat('保單保障條件') : ['保單資訊','適用服務與保障條件'];
  function download() {
    const text=`NAVI 服務摘要\n案件編號：${claim.id}\n服務：${serviceTitle}\n你的情況：${claim.input}\n延誤時間：${delayText(workflow.delay)}\n已收集：${collected.join('、') || '尚無文件'}\n尚待確認：${missing.join('、')}\n轉交原因：需求或保障與服務條件需要專員確認。\n此為示範摘要，尚未送交專員。`;
    setExportText(text);
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='NAVI-服務摘要.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <><div className="handoff-intro"><span className="handoff-symbol"><Icon name="headset" size={28}/></span><h3>這個情況需要進一步確認</h3><p>部分條件無法僅依目前資料可靠判斷。<br/>我們已經整理好目前資訊，方便專員接續處理。</p></div><div className="review-sections"><section><h4>服務摘要 <span className="english-label">Service Summary</span></h4><dl className="review-fields"><div><dt>服務</dt><dd>{serviceTitle}</dd></div><div><dt>你的情況</dt><dd>{claim.input}</dd></div>{workflow.delay!==null && <div><dt>延誤時間</dt><dd>{delayText(workflow.delay)}</dd></div>}<div><dt>轉交原因</dt><dd>{claim.intelligence?.meta.outcome==='human_review' ? '需求判讀信心不足，需確認適用服務與條件。' : '需求或保障與服務條件需要專員確認。'}</dd></div></dl></section><section><h4>已收集資料</h4><p>{collected.join('、') || '已整理事件描述，尚無文件。'}</p></section><section><h4>尚待確認項目</h4><p>{missing.join('、')}</p></section></div>
    {prepared ? <div className="success-message" role="status"><Icon name="check" size={18}/><div><strong>服務摘要已準備完成</strong><p>你可以下載或複製摘要。本次示範尚未送交專員。</p></div></div> : <button type="button" className="button button-primary full-width" onClick={()=>{setPrepared(true);onPrepare();downloadButton.current.focus();}}>轉由專員協助<Icon name="arrow" size={17}/></button>}
    <button ref={downloadButton} type="button" className="button button-secondary full-width" onClick={download}><Icon name="download" size={16}/>下載服務摘要</button>{exportText && <div className="summary-export"><label htmlFor="case-summary">服務摘要（也可以直接複製）</label><textarea id="case-summary" value={exportText} readOnly onFocus={e=>e.target.select()}/></div>}
  </>;
}

export function Sources({items,onBack}) {
  return <><p className="source-intro">每一步建議，都有可追溯的依據。</p>{items.length ? <div className="source-list">{items.map((source,i)=><article key={source.id}><span className="source-number">{String(i+1).padStart(2,'0')}</span><div><h3>{source.title}</h3><span className="source-section">{source.section}</span><p>{source.content}</p><span className="source-type"><Icon name="book" size={13}/>{source.type==='faq'?'常見問題':'服務指南'}</span></div></article>)}</div> : <div className="source-empty"><Icon name="book" size={28}/><h3>目前沒有可引用的資料來源</h3><p>這項資訊仍需要專員進一步確認。</p></div>}<div className="dialog-notice"><Icon name="info" size={17}/><p>資料來源為示範知識庫，並非 BNP Paribas Cardif 正式保單條款或理賠要求。</p></div>{onBack && <button className="button button-secondary full-width" type="button" onClick={onBack}><Icon name="back" size={15}/>返回案件確認</button>}</>;
}
