import { QRCodeSVG } from 'qrcode.react';

function formatDate(value) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)); }

export default function AdminPassPreview({ employee, pass }) {
  const subject = pass.passType === 'employee' ? employee : pass.visitor || pass.dependent;
  const subjectName = subject?.name || employee.name;
  const detail = pass.passType === 'visitor' ? subject?.purpose || 'Visitor' : pass.passType === 'dependent' ? subject?.relationship || 'Dependent' : employee.department;
  return <article className="admin-pass-preview"><header><span>Gate Pass Portal</span><strong>{pass.passType}</strong></header><div className="admin-pass-main"><div><p className="eyebrow">Exact pass preview</p><h3>{subjectName}</h3><p>{detail}</p><p className="pass-detail">Under: {employee.name} · {employee.department}</p><p className="pass-id">{pass.passId}</p><p className="pass-detail">Valid until {formatDate(pass.validUntil)}</p><span className="pass-status">{pass.status}</span></div><div className="pass-qr-wrap"><QRCodeSVG value={pass.qrPayload} size={138} /><small>Scan in Security Verify for live pass details</small></div></div><footer>Generated {formatDate(pass.generatedAt)}</footer></article>;
}