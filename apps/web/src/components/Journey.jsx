import Icon from './Icon.jsx';
import { intelligenceLabels } from '../domain/intelligence.js';
import DocumentDropzone from './DocumentDropzone.jsx';
import { documents } from '../domain/workflow.js';
import { city, delayText, safeGuidance, serviceCopy } from '../presentation.js';

export default function Journey({claim,workflow,busy,failure,onUpload,onRemove,onSources,onReview,onPreview}) {
  const flight=workflow.service.id==='flight_delay', complete=workflow.score>=90;
  const copy=serviceCopy[workflow.service.id];
  const reportedMinutes=claim.intelligence?.data.extractedData.delayMinutes;
  const reportedDelay=reportedMinutes!==undefined ? delayText(reportedMinutes) : claim.interpretation.extractedData.delayHours ? `${claim.interpretation.extractedData.delayHours} 小時` : '待確認';
  const route=claim.evidence.boarding_pass?.fields || claim.interpretation.extractedData;
  if(workflow.state==='HUMAN_REVIEW') return <section className="journey-panel" id="panel-journey" role="tabpanel" aria-labelledby="tab-journey"><div className="section-heading"><div><h2>服務確認</h2><span className="english-label">Service Review</span></div></div><div className="handoff-intro"><span className="handoff-symbol"><Icon name="headset" size={28}/></span><h3>這個情況需要進一步確認</h3><p>部分需求或保障條件仍需要進一步確認。<br/>NAVI 已整理你的描述，方便專員接續。</p></div><div className="review-sections"><section><h4>你的情況</h4><p>{claim.input}</p></section><section><h4>待確認的服務</h4><p>{claim.intelligence ? intelligenceLabels[claim.intelligence.data.serviceType] : copy.title}</p></section></div><button type="button" className="button button-secondary full-width" onClick={onPreview}>查看服務摘要<Icon name="arrow" size={15}/></button><div className="journey-footer"><Icon name="shield" size={17}/><p>{safeGuidance}</p></div></section>;
  return <section className="journey-panel" id="panel-journey" role="tabpanel" aria-labelledby="tab-journey">
    <div className="section-heading"><div><h2>服務旅程</h2><span className="english-label">Service Journey</span></div><span className="live-label"><span className="status-dot"/>即時更新</span></div>
    <div className="service-identity"><span className="service-symbol"><Icon name={workflow.service.icon} size={25}/></span><div><span className="eyebrow">{copy.category}</span><h3>{copy.title}<span>{copy.english}</span></h3></div></div>
    {flight && <div className="flight-overview"><div><span>航線</span><strong>{city(route.origin)}<Icon name="arrow" size={15}/>{city(route.destination)}</strong></div><div key={workflow.delay}><span>{workflow.delay===null ? '你描述的延誤' : '文件確認的延誤'}</span><strong>{workflow.delay===null ? reportedDelay : delayText(workflow.delay)}</strong></div></div>}
    <ol className="journey-steps">{copy.stages.map((stage,i)=>{
      const done=i<workflow.activeStage || (i===3 && claim.confirmed), active=i===workflow.activeStage && !done;
      return <li key={stage} className={`journey-step ${done?'done':''} ${active?'active':''}`} aria-current={active?'step':undefined}><span className="step-marker">{done ? <Icon name="check" size={13}/> : <span>{String(i+1).padStart(2,'0')}</span>}</span><div className="step-content"><div className="step-heading"><h3>{stage}</h3><span>{done?'已完成':active?'目前進行中':'尚未開始'}</span></div>
        {i===0 && <p className="step-description">已整理你的情況。</p>}
        {i===1 && flight && <p className="step-description">班機延誤服務可能與你的情況相關。</p>}
        {i===2 && flight && <><p className="step-description">{complete ? '必要文件已備齊，接著確認案件資料。' : '先補齊兩份文件，讓資訊更完整。'}</p><div className="document-list">{Object.keys(documents).map(type=><DocumentDropzone key={type} type={type} evidence={claim.evidence[type]} busy={busy} failure={failure} onUpload={onUpload} onRemove={()=>onRemove(type)} onSource={()=>onSources(['claim-guide'])}/>)}</div><p className="extraction-note"><Icon name="lock" size={13}/>文件辨識使用範例資料；你的文件不會上傳。</p></>}
        {i===3 && flight && complete && <div className="review-stage"><p>{claim.confirmed ? '資料已準備完成，可前往既有理賠服務。' : '已準備完成，可進行確認。'}</p><button type="button" className="button button-secondary" onClick={onReview}>{claim.confirmed?'查看案件資料':'確認案件資料'}<Icon name="arrow" size={15}/></button></div>}
        {i===4 && flight && <p className="step-description">由既有理賠服務接續處理。</p>}
        {active && !flight && <div className="service-preview"><p>{copy.description}</p><button type="button" className="button button-secondary" onClick={onPreview}>查看下一步<Icon name="arrow" size={15}/></button></div>}
      </div></li>;
    })}</ol>
    <div className="journey-footer"><Icon name="shield" size={17}/><p>{safeGuidance}</p></div>
  </section>;
}
