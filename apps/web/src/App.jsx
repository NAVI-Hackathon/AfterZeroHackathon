import { useCallback, useEffect, useRef, useState } from 'react';
import Icon, { Mark } from './components/Icon.jsx';
import Dialog from './components/Dialog.jsx';
import Landing from './components/Landing.jsx';
import Journey from './components/Journey.jsx';
import Review, { Handoff, Sources } from './components/Review.jsx';
import Toast from './components/Toast.jsx';
import ReadinessPanel from './components/ReadinessPanel.jsx';
import Copilot from './components/Copilot.jsx';
import { createCase, addMockEvidence, removeEvidence, deriveWorkflow, readSession, STORAGE_KEY, LEGACY_STORAGE_KEY, documents, rules } from './domain/workflow.js';
import { intelligenceLabels } from './domain/intelligence.js';
import { understandIntent, waitForAnalysis } from './services/intelligence.js';
import { DEMO_STORY, documentCopy, requirementCopy, serviceCopy } from './presentation.js';
import { MotionContext, motionMs, useAnimatedNumber, useReducedMotion } from './hooks/useMotion.js';
import sources from '../../../knowledge/sitemap.json';

const tabs=[{id:'overview',title:'總覽',icon:'shield'},{id:'journey',title:'旅程',icon:'route'},{id:'assistant',title:'助理',icon:'spark'}];
function Header({claim,inWorkspace,busy,onHome,onResume,onGuide,onReset,reduced,onReduce}) {
  const menu=useRef(null);
  useEffect(()=>{
    function dismiss(e) {
      if(e.type==='keydown' && e.key==='Escape' && menu.current.open){menu.current.open=false;menu.current.querySelector('summary').focus();}
      else if(e.type==='pointerdown' && !menu.current.contains(e.target))menu.current.open=false;
    }
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',dismiss);
    return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',dismiss);};
  },[]);
  function choose(action) {menu.current.open=false;action();}
  return <header className="site-header"><div className="header-inner"><button type="button" className="brand" onClick={onHome} disabled={busy} aria-label="NAVI 首頁"><Mark/><span className="wordmark">NAVI<small>AI Service Journey Navigator</small></span></button><nav aria-label="主要導覽">{claim && <span className="header-case">{claim.id}</span>}{claim && !inWorkspace && <button className="nav-link" type="button" disabled={busy} onClick={onResume}>返回案件<Icon name="arrow" size={14}/></button>}<details className="header-menu" ref={menu}><summary aria-label="更多選項"><Icon name="more" size={20}/></summary><div className="menu-popover"><span className="eyebrow">NAVI</span><button type="button" disabled={busy} onClick={()=>choose(onGuide)}><Icon name="book" size={16}/>示範導覽</button><button type="button" onClick={()=>choose(onReset)}><Icon name="reset" size={16}/>重新開始示範</button><label><input type="checkbox" checked={reduced} onChange={e=>onReduce(e.target.checked)}/>減少動畫</label></div></details></nav></div></header>;
}

export default function App() {
  const [claim,setClaim]=useState(()=>{try{return readSession(sessionStorage);}catch{return null;}});
  const [page,setPage]=useState(()=>location.hash==='#workspace'?'workspace':'home');
  const [analysis,setAnalysis]=useState(null), [interpretation,setInterpretation]=useState(null);
  const [analysisError,setAnalysisError]=useState(null), [analysisResult,setAnalysisResult]=useState(null);
  const [busy,setBusy]=useState(null), [failure,setFailure]=useState(null), [failNext,setFailNext]=useState(false);
  const [dialog,setDialog]=useState(null), [notice,setNotice]=useState(''), [storageError,setStorageError]=useState(false);
  const [tab,setTab]=useState('overview'), [assistantOpen,setAssistantOpen]=useState(false), [revision,setRevision]=useState(0);
  const [reduce,setReduce]=useState(false);
  const reduced=useReducedMotion() || reduce;
  const timers=useRef([]), busyRef=useRef(false), analysisRequest=useRef(null);
  const workflow=deriveWorkflow(claim), score=useAnimatedNumber(workflow.score,reduced);
  const inWorkspace=page==='workspace' && Boolean(claim);
  const dismissNotice=useCallback(()=>setNotice(''),[]);
  function cancelWork() {analysisRequest.current?.abort();analysisRequest.current=null;timers.current.forEach(clearTimeout);timers.current=[];busyRef.current=false;setBusy(null);setAnalysis(null);}
  function later(callback,delay) {timers.current.push(setTimeout(callback,delay));}
  useEffect(()=>{
    const onHash=()=>{cancelWork();setPage(location.hash==='#workspace'?'workspace':'home');};
    window.addEventListener('hashchange',onHash);
    return ()=>{window.removeEventListener('hashchange',onHash);analysisRequest.current?.abort();timers.current.forEach(clearTimeout);};
  },[]);
  useEffect(()=>{
    try {if(claim)sessionStorage.setItem(STORAGE_KEY,JSON.stringify(claim));else sessionStorage.removeItem(STORAGE_KEY);sessionStorage.removeItem(LEGACY_STORAGE_KEY);setStorageError(false);}catch{setStorageError(true);}
  },[claim]);
  useEffect(()=>{document.documentElement.dataset.reducedMotion=String(reduced);return ()=>delete document.documentElement.dataset.reducedMotion;},[reduced]);
  useEffect(()=>{
    if(!inWorkspace)return;
    window.scrollTo(0,0);document.getElementById('workspace-title')?.focus();
  },[inWorkspace]);
  function navigate(next) {cancelWork();history.pushState(null,'',next==='workspace'?'#workspace':location.pathname);setPage(next);setDialog(null);window.scrollTo(0,0);}
  function upload(type,filename) {
    if(busyRef.current)return;
    busyRef.current=true;setBusy(type);setFailure(null);setNotice('');setTab('journey');
    const shouldFail=failNext;setFailNext(false);
    later(()=>{
      if(shouldFail)setFailure({type,filename});
      else {setClaim(current=>addMockEvidence(current,type,filename));setNotice(`${documentCopy[type].title}已辨識，資料已更新。`);}
      busyRef.current=false;setBusy(null);
    },motionMs('--document-processing'));
  }
  async function start(text,attachment) {
    if(busyRef.current)return;
    cancelWork();setDialog(null);setInterpretation(null);setAnalysisError(null);setAnalysisResult(null);setAnalysis(0);busyRef.current=true;
    const controller=new AbortController();analysisRequest.current=controller;
    const started=performance.now(), total=reduced?0:motionMs('--analysis-total');
    try {
      const result=await understandIntent(text,{signal:controller.signal});
      controller.signal.throwIfAborted();setInterpretation(result);setAnalysis(1);
      await waitForAnalysis(Math.max(0,total*.7-(performance.now()-started)),controller.signal);
      setAnalysis(2);await waitForAnalysis(total*.1,controller.signal);
      const next=createCase(text,result);
      if(result.meta.outcome==='supported' || result.meta.outcome==='human_review') {
        setAnalysis(3);await waitForAnalysis(total*.2,controller.signal);
        setClaim(next);setTab('overview');setFailure(null);setNotice('');navigate('workspace');
        if(attachment && result.meta.outcome==='supported')upload('boarding_pass',attachment);
      } else {
        setAnalysisResult(result);setAnalysis(null);busyRef.current=false;analysisRequest.current=null;
        requestAnimationFrame(()=>document.getElementById('analysis-result-title')?.focus());
      }
    } catch(error) {
      if(controller.signal.aborted)return;
      await waitForAnalysis(Math.max(0,total-(performance.now()-started)),controller.signal).catch(()=>{});
      if(controller.signal.aborted)return;
      setAnalysisError(error.code || 'NETWORK_ERROR');setAnalysis(null);busyRef.current=false;analysisRequest.current=null;
      requestAnimationFrame(()=>document.getElementById('analysis-error-title')?.focus());
    }
  }
  function handoffResult(text) {
    if(!analysisResult)return;
    setDialog({type:'specialist',previewCase:createCase(text,analysisResult)});
  }
  function reset() {cancelWork();setAnalysisError(null);setAnalysisResult(null);setClaim(null);setFailure(null);setFailNext(false);setTab('overview');setRevision(r=>r+1);navigate('home');setNotice('已重新開始，可以描述新的情況。');}
  function nextAction(override) {
    const next=override || workflow.next;
    if(['boarding_pass','delay_certificate'].includes(next)) {
      setTab('journey');
      // Wait one frame for the mobile panel to become visible before opening its native picker.
      requestAnimationFrame(()=>{
        const input=document.querySelector(`[data-upload="${next}"]`);
        input?.closest('article').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});input?.click();
      });
    } else setDialog({type:next==='review' && claim.confirmed?'proceed':next});
  }
  function showSources(ids) {setDialog({type:'source',ids,returnTo:dialog?.type==='review'?'review':null});}
  function onTabKey(e,index) {
    const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;
    if(next!==null){e.preventDefault();setTab(tabs[next].id);document.getElementById('tab-'+tabs[next].id)?.focus();}
  }
  const titles={guide:['示範導覽','Demo Guide'],score:['準備度計算說明','Readiness'],source:['資料來源','Sources'],review:['確認案件資料','Review'],specialist:['專員協助','Human Handoff'],service_preview:['服務下一步','Service Navigation'],proceed:['即將前往既有理賠服務','Continue to Service']};
  const dialogTitle=titles[dialog?.type];
  return <MotionContext value={reduce}><div className="app-shell"><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();const main=document.getElementById('main-content');main.tabIndex=-1;main.focus();}}>跳至主要內容</a><Header claim={claim} inWorkspace={inWorkspace} busy={analysis!==null || Boolean(busy)} onHome={()=>navigate('home')} onResume={()=>navigate('workspace')} onGuide={()=>setDialog({type:'guide'})} onReset={reset} reduced={reduce} onReduce={setReduce}/>
    {!inWorkspace ? <Landing key={revision} onStart={start} analysis={analysis} interpretation={interpretation} analysisError={analysisError} result={analysisResult} onHandoff={handoffResult} onEdit={()=>{setAnalysisError(null);setAnalysisResult(null);}}/> : <main className="workspace" id="main-content"><div className="workspace-heading"><div><span className="eyebrow">你的服務工作區</span><h1 id="workspace-title" tabIndex={-1}>{claim.intelligence ? intelligenceLabels[claim.intelligence.data.serviceType] : serviceCopy[workflow.service.id].title}<span>{workflow.service.id==='unknown' && claim.intelligence ? 'Service Review' : serviceCopy[workflow.service.id].english}</span></h1></div><div className="workspace-state"><span className="status-dot"/><span>{workflow.state==='HUMAN_REVIEW'?'需要專員確認':claim.confirmed?'資料已準備完成':workflow.score>=90?'已準備完成，可進行確認':'正在準備資料'}</span><small>{storageError?'目前僅保留於記憶體':'已保留此分頁進度'}</small></div></div>
      {claim.intelligence?.meta.source==='demo_fallback' && <p className="fallback-notice" role="status"><Icon name="info" size={15}/>示範備援判讀 · 本次未使用 AI 分析</p>}
      <nav className="workspace-tabs" role="tablist" aria-label="工作區檢視">{tabs.map((item,i)=><button id={'tab-'+item.id} type="button" role="tab" key={item.id} aria-selected={tab===item.id} aria-controls={'panel-'+item.id} tabIndex={tab===item.id?0:-1} onKeyDown={e=>onTabKey(e,i)} onClick={()=>setTab(item.id)}><Icon name={item.icon} size={16}/>{item.title}{item.id==='overview' && workflow.service.id==='flight_delay' && <span>{Math.round(score)}%</span>}</button>)}</nav>
      <button type="button" className="tablet-assistant-toggle inline-button" aria-expanded={assistantOpen} onClick={()=>setAssistantOpen(o=>!o)}><Icon name="spark" size={16}/>{assistantOpen?'收合服務助理':'展開服務助理'}<Icon name="chevron" size={14}/></button>
      <div className={`workspace-grid ${assistantOpen?'assistant-open':''}`} data-tab={tab}><Copilot key={claim.createdAt} claim={claim} workflow={workflow} busy={busy} onSources={showSources}/><Journey claim={claim} workflow={workflow} busy={busy} failure={failure} onUpload={upload} onRemove={type=>{setFailure(null);setClaim(current=>removeEvidence(current,type));setNotice('文件已移除，準備度與下一步已更新。');}} onSources={showSources} onReview={()=>setDialog({type:'review'})} onPreview={()=>setDialog({type:workflow.state==='HUMAN_REVIEW'?'specialist':'service_preview'})}/><ReadinessPanel workflow={workflow} score={score} confirmed={claim.confirmed} busy={busy} onNext={nextAction} onSample={type=>upload(type,documents[type].sampleName)} onBreakdown={()=>setDialog({type:'score'})}/></div>
      <footer className="page-footer"><span><Icon name="lock" size={13}/>事件描述交由 AI 分析；文件留在裝置，進度保留於此分頁。</span><span>NAVI <span className="footer-separator">/</span> Service Navigation</span></footer>
    </main>}
    {dialog && <Dialog key={dialog.type} title={dialogTitle[0]} english={dialogTitle[1]} variant={dialog.type==='source'?'source-sheet':dialog.type==='review'?'review-dialog':''} onClose={()=>setDialog(null)}>
      {dialog.type==='guide' && <><p className="dialog-lead">一個情況，兩份文件，清楚的下一步。</p><ol className="demo-instructions"><li><strong>描述班機延誤</strong><p>開始分析後，準備度從 35% 開始。</p></li><li><strong>上傳或使用範例登機證</strong><p>航班資料補齊，準備度提升至 70%。</p></li><li><strong>加入航空公司延誤證明</strong><p>確認 14:20 → 21:43，共 7 小時 23 分，準備度達 90%。</p></li><li><strong>確認案件資料</strong><p>完成確認後達 100%，預覽前往既有理賠服務。</p></li></ol><div className="dialog-notice"><Icon name="info" size={17}/><p>事件描述會交由 AI 理解；文件與知識說明仍使用示範資料，不會讀取或上傳文件內容，也不會送出理賠申請。若啟用備援，畫面會明確標示。</p></div><label className="demo-failure-check"><input type="checkbox" checked={failNext} onChange={e=>setFailNext(e.target.checked)}/>下次文件辨識顯示失敗情境</label><button className="button button-primary full-width" type="button" onClick={()=>start(DEMO_STORY,null)}>開始班機延誤示範<Icon name="arrow" size={17}/></button></>}
      {dialog.type==='score' && <><p className="dialog-lead">每補齊一項資料，就更接近下一步。</p><p>準備度依已完成的資料項目累加。</p><div className="score-breakdown">{rules.readiness.map(r=><div key={r.id}><span>{requirementCopy[r.id]}</span><strong>{r.weight}<small>分</small></strong></div>)}<div><span>總計</span><strong>100<small>分</small></strong></div></div><div className="dialog-notice"><Icon name="shield" size={18}/><p>準備度代表資料完整性，不判定保障範圍、理賠資格或金額。</p></div></>}
      {dialog.type==='source' && <Sources items={sources.filter(s=>dialog.ids.includes(s.id))} onBack={dialog.returnTo?()=>setDialog({type:dialog.returnTo}):null}/>}
      {dialog.type==='review' && claim?.evidence.boarding_pass && claim?.evidence.delay_certificate && <Review claim={claim} workflow={workflow} onConfirm={()=>{setClaim(c=>({...c,confirmed:true}));setNotice('資料已確認，準備度已達 100%。');}} onProceed={()=>setDialog({type:'proceed'})} onSources={showSources}/>}
      {dialog.type==='specialist' && (dialog.previewCase || claim) && <Handoff claim={dialog.previewCase || claim} workflow={dialog.previewCase ? deriveWorkflow(dialog.previewCase) : workflow} onPrepare={()=>dialog.previewCase ? setDialog(d=>({...d,previewCase:{...d.previewCase,handoffRequested:true}})) : setClaim(c=>({...c,handoffRequested:true}))}/>}
      {dialog.type==='service_preview' && claim && <><p className="dialog-lead">{serviceCopy[workflow.service.id].title}</p><p>{serviceCopy[workflow.service.id].description}</p><ol className="demo-instructions">{(workflow.service.id==='car_accident'?['記下事故日期、地點與相關人員。','準備事故照片及相關事故紀錄。','由專員確認保障與處理流程。']:['備妥保單號碼及帳戶資訊。','透過既有客戶平台完成身分確認。','選擇可使用的繳費方式，確認變更內容。']).map(step=><li key={step}>{step}</li>)}</ol><p className="dialog-footnote">目前提供服務引導預覽，後續由既有平台或專員接續。</p><button type="button" className="button button-primary full-width" onClick={()=>setDialog({type:'specialist'})}>轉由專員協助<Icon name="arrow" size={17}/></button></>}
      {dialog.type==='proceed' && <div className="proceed-content"><span className="handoff-symbol"><Icon name="arrow" size={30}/></span><h3>你的資料已準備完成</h3><p>NAVI 已整理案件資訊與文件。下一步將由既有理賠服務接續處理，保留保險公司的審核與決策流程。</p><div className="dialog-notice"><Icon name="info" size={17}/><p>本次僅展示服務導引，不會連線至正式平台或送出申請。</p></div><button type="button" className="button button-primary full-width" onClick={()=>{setDialog(null);setNotice('服務導引已完成，案件資料保留於此分頁。');}}>完成導引<Icon name="check" size={17}/></button></div>}
    </Dialog>}
    {notice && <Toast key={notice} message={notice} onDismiss={dismissNotice}/>}
  </div></MotionContext>;
}
