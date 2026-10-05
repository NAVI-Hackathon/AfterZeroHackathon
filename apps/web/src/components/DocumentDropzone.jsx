import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { documents, validateFile, delayMinutes } from '../domain/workflow.js';
import { documentCopy, city, delayText, fileError } from '../presentation.js';
import { useAnimatedNumber } from '../hooks/useMotion.js';

export default function DocumentDropzone({type,evidence,busy,failure,onUpload,onRemove,onSource}) {
  const doc=documentCopy[type], fixture=documents[type];
  const input=useRef(null);
  const dragDepth=useRef(0);
  const [dragging,setDragging]=useState(false), [error,setError]=useState('');
  const disabled=Boolean(busy), processing=busy===type;
  const minutes=useAnimatedNumber(evidence && type==='delay_certificate' ? delayMinutes(evidence.fields) || 0 : 0);
  function receive(files) {
    dragDepth.current=0;setDragging(false);
    if(disabled) return;
    if(files.length!==1) {setError('請一次上傳一份文件。');return;}
    const validation=validateFile(files[0]);setError(fileError(validation));
    if(!validation) onUpload(type,files[0].name);
  }
  return <article className={`document-card ${evidence ? 'collected' : ''} ${dragging ? 'dragging' : ''} ${processing ? 'processing' : ''}`} data-document={type} aria-busy={processing}
    onDragEnter={e=>{e.preventDefault();dragDepth.current++;if(!disabled)setDragging(true);}}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled ? 'none' : 'copy';}}
    onDragLeave={e=>{e.preventDefault();dragDepth.current=Math.max(0,dragDepth.current-1);if(!dragDepth.current)setDragging(false);}}
    onDrop={e=>{e.preventDefault();receive(Array.from(e.dataTransfer.files));}}>
    <div className="document-heading"><span className="document-icon"><Icon name={evidence ? 'check' : 'document'} size={19}/></span><div><h4>{doc.title}</h4><span className="english-label">{doc.english}</span></div><span className="document-points">{type==='boarding_pass' ? '+35' : '+20'}<small>準備度</small></span>{evidence && <button type="button" className="icon-button tooltip-target" aria-label={`移除${doc.title}`} disabled={disabled} onClick={onRemove}><Icon name="trash" size={16}/><span className="tooltip">移除文件</span></button>}</div>
    {processing ? <div className="document-scanning" role="status"><div className="scan-document"><div className="skeleton-line wide"/><div className="skeleton-line"/><div className="skeleton-line short"/><span className="scan-line"/></div><div><strong>正在辨識文件……</strong><p>整理欄位，確認文件要求</p></div></div>
      : evidence ? <div className="document-result">
        <div className="detected"><Icon name="check" size={13}/><span>已辨識</span><span className="extraction-disclosure">範例資料</span></div>
        {type==='boarding_pass' ? <dl className="extracted-fields"><div><dt>旅客</dt><dd>{evidence.fields.passengerName}</dd></div><div><dt>航班</dt><dd>{evidence.fields.flightNumber}</dd></div><div><dt>航線</dt><dd>{city(evidence.fields.origin)} <span>→</span> {city(evidence.fields.destination)}</dd></div><div><dt>日期</dt><dd>2026 / 10 / 05</dd></div></dl>
          : <><dl className="departure-times"><div><dt>原定起飛</dt><dd>14:20<small>JST</small></dd></div><span className="time-arrow"><Icon name="arrow" size={18}/></span><div><dt>實際起飛</dt><dd>21:43<small>JST</small></dd></div></dl><div className="delay-moment"><span>延誤時間 <small>DELAY DURATION</small></span><strong>{delayText(Math.round(minutes))}</strong></div></>}
        <div className="matched"><Icon name="check" size={14}/>已符合：{doc.requirement}</div><span className="filename" title={evidence.filename}>{evidence.filename}</span>
      </div> : <div className="dropzone-empty"><span className="dropzone-symbol"><Icon name="upload" size={22}/></span><strong>{dragging ? '放開以上傳文件' : '拖曳文件到這裡'}</strong><p>PDF、PNG、JPG、WebP <span>·</span> 10 MB 以內</p><div className="upload-actions"><button className="inline-button" type="button" disabled={disabled} onClick={()=>input.current.click()}>選擇文件<Icon name="arrow" size={14}/></button><span/><button className="sample-button" type="button" disabled={disabled} onClick={()=>{setError('');onUpload(type,fixture.sampleName);}}>使用範例{type==='boarding_pass' ? '登機證' : '延誤證明'}</button></div></div>}
    <input ref={input} className="visually-hidden" data-upload={type} type="file" aria-label={`上傳${doc.title}`} accept="application/pdf,image/jpeg,image/png,image/webp" disabled={disabled} onChange={e=>{receive(Array.from(e.target.files));e.target.value='';}}/>
    {error && <div className="file-error" role="alert"><Icon name="info" size={16}/><p>{error}</p><button type="button" className="inline-button" onClick={()=>input.current.click()}>重新選擇</button></div>}
    {failure?.type===type && !processing && <div className="file-error" role="alert"><Icon name="info" size={16}/><div><strong>這次未能完成文件辨識</strong><p>資料尚未變更，你可以重新嘗試。</p></div><button type="button" className="inline-button" onClick={()=>onUpload(type,failure.filename)}>重新嘗試</button></div>}
    {!evidence && !processing && type==='delay_certificate' && <button type="button" className="document-help inline-button" onClick={onSource}>為什麼需要這份文件？<Icon name="info" size={13}/></button>}
  </article>;
}
