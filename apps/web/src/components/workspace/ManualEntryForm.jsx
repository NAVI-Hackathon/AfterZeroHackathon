import { useState } from 'react';
import Icon from '../Icon.jsx';
import { manualSchemas } from '../../services/journeyEngine.js';

const forms = {
  diagnosis_certificate: [
    { name: 'patientName', label: '病患姓名', placeholder: '與診斷書相同' },
    { name: 'hospitalName', label: '醫院', placeholder: '例如 臺中榮民總醫院' },
    { name: 'admissionDate', label: '入院日期', type: 'date' },
    { name: 'dischargeDate', label: '出院日期', type: 'date' },
    { name: 'diagnosis', label: '診斷', placeholder: '診斷書上的病名' },
  ],
  bank_passbook: [
    { name: 'accountHolder', label: '戶名', placeholder: '與存摺封面相同' },
    { name: 'bankName', label: '銀行或郵局', placeholder: '例如 某某銀行' },
    { name: 'accountLast4', label: '帳號末四碼', placeholder: '例如 1234', inputMode: 'numeric', maxLength: 4 },
  ],
};

export default function ManualEntryForm({ type, onSubmit, onCancel }) {
  const fields = forms[type];
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, ''])));
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const result = manualSchemas[type].safeParse(values);
    if (!result.success) {
      const message = result.error.issues.find(i => /晚於/.test(i.message))?.message;
      setError(message ? `${message}。` : '請完整填寫所有欄位。');
      return;
    }
    onSubmit(result.data);
  }

  return (
    <form className="manual-form" onSubmit={submit} noValidate>
      <p className="manual-intro"><Icon name="edit" size={15} />請依文件上的內容填寫，送出後會更新準備完成度。</p>
      <div className="manual-grid">
        {fields.map(f => (
          <label key={f.name} className="field">
            <span>{f.label}</span>
            <input type={f.type ?? 'text'} value={values[f.name]} placeholder={f.placeholder} maxLength={f.maxLength ?? 60} inputMode={f.inputMode}
              onChange={e => { setValues(v => ({ ...v, [f.name]: e.target.value })); setError(''); }} />
          </label>
        ))}
      </div>
      {error && <p className="inline-error" role="alert"><Icon name="info" size={15} />{error}</p>}
      <div className="manual-actions">
        <button type="button" className="button button-ghost button-small" onClick={onCancel}>取消</button>
        <button type="submit" className="button button-primary button-small">確認內容<Icon name="check" size={15} /></button>
      </div>
    </form>
  );
}
