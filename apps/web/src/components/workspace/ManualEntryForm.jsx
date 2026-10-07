import { useState } from 'react';
import Icon from '../Icon.jsx';
import { manualSchemas } from '../../services/journeyEngine.js';

const forms = {
  boarding_pass: {
    fields: [
      { name: 'passengerName', label: '乘客姓名', placeholder: '與護照相同，例如 EN JU CHEN' },
      { name: 'flightNumber', label: '航班', placeholder: '例如 BR197' },
      { name: 'origin', label: '出發地', placeholder: '例如 東京' },
      { name: 'destination', label: '目的地', placeholder: '例如 台北' },
      { name: 'departureDate', label: '搭乘日期', type: 'date' },
    ],
    toFields: v => v,
  },
  delay_certificate: {
    fields: [
      { name: 'flightNumber', label: '航班', placeholder: '例如 BR197' },
      { name: 'date', label: '原訂起飛日期', type: 'date' },
      { name: 'scheduled', label: '原訂起飛時間', type: 'time' },
      { name: 'actualDate', label: '實際起飛日期', type: 'date' },
      { name: 'actual', label: '實際起飛時間', type: 'time' },
    ],
    // Times are entered as printed on the certificate; only the difference matters, so a fixed offset is used.
    toFields: v => ({
      flightNumber: v.flightNumber,
      scheduledDeparture: `${v.date}T${v.scheduled}:00+08:00`,
      actualDeparture: `${v.actualDate || v.date}T${v.actual}:00+08:00`,
    }),
  },
};

export default function ManualEntryForm({ type, onSubmit, onCancel }) {
  const form = forms[type];
  const [values, setValues] = useState(() => Object.fromEntries(form.fields.map(f => [f.name, ''])));
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const fields = form.toFields(values);
    const result = manualSchemas[type].safeParse(fields);
    if (!result.success) {
      const ordering = result.error.issues.some(i => i.message.includes('晚於'));
      setError(ordering ? '實際起飛時間需晚於原訂起飛時間。' : '請完整填寫所有欄位。');
      return;
    }
    onSubmit(result.data);
  }

  return (
    <form className="manual-form" onSubmit={submit} noValidate>
      <p className="manual-intro"><Icon name="edit" size={15} />請依文件上的內容填寫，送出後會更新準備完成度。</p>
      <div className="manual-grid">
        {form.fields.map(f => (
          <label key={f.name} className="field">
            <span>{f.label}</span>
            <input type={f.type ?? 'text'} value={values[f.name]} placeholder={f.placeholder} maxLength={60}
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
