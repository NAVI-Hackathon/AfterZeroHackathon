import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { requirementCopy } from '../presentation.js';

export default function ReadinessPanel({workflow,score,confirmed,busy,onNext,onSample,onBreakdown}) {
  const previous=useRef(workflow.score);
  const [delta,setDelta]=useState(0);
  useEffect(()=> {
    const change=workflow.score-previous.current;previous.current=workflow.score;
    if(change>0)setDelta(change);else setDelta(0);
    const timer=setTimeout(()=>setDelta(0),2000);return ()=>clearTimeout(timer);
  },[workflow.score]);
  const actions={
    boarding_pass:{title:'上傳登機證',reason:'先確認旅客與航班資訊，補齊旅行證明。',button:'上傳登機證'},
    delay_certificate:{title:'上傳航空公司延誤證明',reason:'這份文件可協助確認實際延誤時間。',button:'上傳延誤證明'},
    review:{title:confirmed ? '資料已準備完成' : '確認案件資料',reason:confirmed ? '資訊已確認。接著由既有理賠服務接續處理。' : '必要文件已備齊，請再確認一次擷取的資訊。',button:confirmed ? '前往服務' : '開始確認'},
    specialist:{title:'這個情況需要進一步確認',reason:'部分條件無法僅依目前資料可靠判斷，我們已整理好目前資訊。',button:'轉由專員協助'},
    service_preview:{title:'相關服務已找到',reason:'先看需要準備的資訊，再由專員協助確認。',button:'查看下一步'},
  };
  const action=actions[workflow.next], flight=workflow.service.id==='flight_delay';
  const missing=['boarding_pass','delay_certificate'].filter(id=>!workflow.requirements.find(r=>r.id===id)?.complete).length;
  return <aside className="intelligence-rail" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
    <section className="readiness-panel"><div className="section-heading"><div><h2>服務準備度</h2><span className="english-label">Service Readiness</span></div><button className="icon-button tooltip-target" aria-label="準備度計算說明" type="button" onClick={onBreakdown}><Icon name="info" size={17}/><span className="tooltip">準備度計算說明</span></button></div>
      {flight ? <><div className="readiness-gauge" role="progressbar" aria-label="服務準備度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={workflow.score}>
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="gauge-track" cx="100" cy="100" r="87"/><circle className="gauge-fill" cx="100" cy="100" r="87" pathLength="100" strokeDasharray="100" strokeDashoffset={100-score}/></svg><div className="gauge-text"><div aria-hidden="true"><strong>{Math.round(score)}</strong><span>%</span></div><p>{workflow.score>=90 ? '資料已備齊' : '逐步備齊資料'}</p></div></div>
      <div className="readiness-caption"><p>{missing ? `還有 ${missing} 份必要文件待補齊` : confirmed ? '資料已確認，可以進行下一步' : '必要文件已備齊，可進行確認'}</p><span className="score-delta" key={delta}>{delta>0 ? `+${delta}% 準備度` : ''}</span></div>
      <details className="evidence-checklist"><summary>資料完整度 <span>{workflow.requirements.filter(r=>r.complete).length} / 6</span><Icon name="chevron" size={13}/></summary><div className="requirements">{workflow.requirements.map(r=><div className={`requirement ${r.complete ? 'complete' : ''}`} key={r.id}><span>{r.complete ? <Icon name="check" size={12}/> : <span/>}</span><span>{requirementCopy[r.id]}</span><small>{r.weight}</small></div>)}</div></details></>
        : <div className="service-readiness"><Icon name={workflow.next==='specialist' ? 'headset' : 'shield'} size={28}/><h3>{workflow.next==='specialist' ? '交給專員，一起確認' : '服務旅程已整理'}</h3><p>{workflow.next==='specialist' ? '你的資訊會隨服務摘要保留。' : '先看下一步需要準備什麼。'}</p></div>}
    </section>
    <section className="next-action"><div className="eyebrow"><span className="status-dot"/>下一步 <span>Next Best Action</span></div><div key={workflow.next+(confirmed?'confirmed':'')} className="action-content"><h3>{action.title}</h3><p>{action.reason}</p><button className="button button-primary" type="button" disabled={Boolean(busy)} onClick={()=>onNext()}>{busy ? '正在辨識文件' : action.button}<Icon name="arrow" size={17}/></button>{['boarding_pass','delay_certificate'].includes(workflow.next) && <button className="inline-button next-sample" type="button" disabled={Boolean(busy)} onClick={()=>onSample(workflow.next)}>使用範例文件體驗</button>}</div></section>
    <p className="readiness-note"><Icon name="shield" size={14}/>準備度代表資料完整性，不代表理賠核准。</p>
    <button type="button" className="specialist-link" disabled={Boolean(busy)} onClick={()=>onNext('specialist')}><Icon name="headset" size={18}/><span>需要協助？轉由專員接續處理</span><Icon name="arrow" size={14}/></button>
  </aside>;
}
