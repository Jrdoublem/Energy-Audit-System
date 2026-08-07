import { createPortal } from 'react-dom';
import companyLogo from '../../assets/Logo.png';
import { useLang } from '../../context/languageStore.js';
import { PrinterIcon } from '../../components/icons';

function fmtNum(n, digits = 0) {
  const v = parseFloat(n);
  if (!Number.isFinite(v)) return '-';
  return v.toLocaleString('th-TH', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function docNumberFor(item, form) {
  const seed = String(form?.equipmentId || item?.id || 'RPT');
  const suffix = seed.replace(/[^0-9A-Za-z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  const buddhistYear = new Date().getFullYear() + 543;
  return `EA-${buddhistYear}-${suffix}`;
}

function formatThaiDate(d) {
  const buddhistYear = d.getFullYear() + 543;
  return `${d.getDate()}/${d.getMonth() + 1}/${buddhistYear}`;
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-[#0F2854]">{value || '-'}</p>
    </div>
  );
}

function SavingsCard({ label, value, unit, color }) {
  return (
    <div className="rounded-xl border border-gray-100 px-3 py-3 text-center" style={{ background: color.bg }}>
      <p className="text-[10px] font-semibold mb-1" style={{ color: color.label }}>{label}</p>
      <p className="text-lg font-extrabold font-mono" style={{ color: color.value }}>{value}</p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  );
}

function SignatureLine({ label }) {
  return (
    <div className="flex flex-col items-center gap-8 flex-1 min-w-[8rem]">
      <div className="w-full border-b border-dashed border-gray-300" />
      <p className="text-xs text-gray-500 text-center -mt-7">{label}</p>
    </div>
  );
}

function ReportPrintPreview({ item, result, measures, form, onClose }) {
  const { t } = useLang();
  const primaryMeasure = (measures || [])[0] || null;
  const evalData = primaryMeasure?.evalData || {};

  const baselinePower = parseFloat(result?.powerCF ?? result?.powerBaseline ?? NaN);
  const operatingHours = parseFloat(evalData.operatingHours || 0);
  const energySaved = parseFloat(evalData.energySaved || 0);
  const powerAfter = Number.isFinite(baselinePower) && operatingHours > 0
    ? baselinePower - (energySaved / operatingHours)
    : null;

  const docNumber = docNumberFor(item, form);
  const printDate = formatThaiDate(new Date());

  const handlePrint = () => window.print();

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-3 font-sans print:bg-white print:p-0 print:block print:overflow-visible">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none">

        {/* Toolbar — hidden when printing */}
        <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 lg:pt-6 bg-[#0F2854] text-white">
          <div className="flex items-center gap-2 min-w-0">
            <PrinterIcon className="w-4 h-4 shrink-0 text-[#38BDF8]" />
            <p className="text-sm font-bold truncate">{t.report.previewTitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #1C4D8D 0%, #4988C4 100%)' }}
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.report.printSaveAsPdf}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
            >
              {t.report.editData}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable document */}
        <div id="report-print-root" className="p-6 sm:p-8 print:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b-2 border-[#0F2854]">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[#0F2854]">
                <img src={companyLogo} alt="" className="w-8 h-8 object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold text-[#0F2854] leading-snug">
                  {form.reportTitle || t.report.untitledReport}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">{t.report.docSubtitle}</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 shrink-0 space-y-0.5">
              <p><span className="font-semibold text-[#0F2854]">{t.report.factoryLabelShort}:</span> {form.factory || '-'}</p>
              <p><span className="font-semibold text-[#0F2854]">{t.report.docNumberLabel}:</span> {docNumber}</p>
              <p><span className="font-semibold text-[#0F2854]">{t.report.printDateLabel}:</span> {printDate}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
            <InfoRow label={t.report.equipmentLabelDoc} value={`${form.equipmentId || '-'}${form.brandModel ? ` - ${form.brandModel}` : ''}`} />
            <InfoRow label={t.report.deptLabelDoc} value={form.department} />
            <InfoRow label={t.report.sourceLabelDoc} value={form.measureOrigin} />
            <InfoRow label={t.report.measureTypeLabelDoc} value={form.measureName || form.measureType} />
          </div>
          {form.objective && (
            <div className="mb-6">
              <p className="text-[11px] text-gray-400 mb-0.5">{t.report.objectiveLabelDoc}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{form.objective}</p>
            </div>
          )}

          {/* Before/after table */}
          <div className="mb-6">
            <div className="bg-[#0F2854] text-white text-xs font-bold px-3 py-2 rounded-t-lg">
              {t.report.beforeAfterTitle}
            </div>
            <table className="w-full text-sm border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="text-left font-semibold px-3 py-2">{t.report.colItem}</th>
                  <th className="text-left font-semibold px-3 py-2">{t.report.colBefore} (-)</th>
                  <th className="text-left font-semibold px-3 py-2">{t.report.colAfter} (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 text-gray-600">{t.report.rowPower}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-[#0F2854]">{fmtNum(baselinePower, 1)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-emerald-600">{powerAfter != null ? fmtNum(powerAfter, 1) : '-'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-600">{t.report.rowHours}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-[#0F2854]">{operatingHours ? fmtNum(operatingHours) : '-'}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-[#0F2854]">{operatingHours ? fmtNum(operatingHours) : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Savings summary */}
          <div className="mb-6">
            <div className="bg-[#0F2854] text-white text-xs font-bold px-3 py-2 rounded-t-lg">
              {t.report.savingsTitle}
            </div>
            <div className="border border-t-0 border-gray-200 rounded-b-lg p-3">
              {primaryMeasure ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <SavingsCard
                    label={t.report.cardEnergySaved} unit="kWh/ปี"
                    value={fmtNum(evalData.energySaved)}
                    color={{ bg: '#ECFDF5', label: '#059669', value: '#047857' }}
                  />
                  <SavingsCard
                    label={t.report.cardCostSaved} unit="บาท/ปี"
                    value={fmtNum(evalData.costSaved)}
                    color={{ bg: '#EFF6FF', label: '#2563EB', value: '#1D4ED8' }}
                  />
                  <SavingsCard
                    label={t.report.cardInvestment} unit="บาท"
                    value={fmtNum(evalData.investmentCost)}
                    color={{ bg: '#F4F7FC', label: '#4988C4', value: '#0F2854' }}
                  />
                  <SavingsCard
                    label={t.report.cardPayback} unit="ปี"
                    value={fmtNum(evalData.payback, 2)}
                    color={{ bg: '#FFFBEB', label: '#D97706', value: '#B45309' }}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">{t.report.noMeasureNote}</p>
              )}
            </div>
          </div>

          {/* Summary + notes */}
          {form.summary && (
            <div className="mb-4">
              <p className="text-xs font-bold text-[#0F2854] mb-1">{t.report.fieldSummary}</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{form.summary}</p>
            </div>
          )}
          {form.additionalNotes && (
            <div className="mb-8">
              <p className="text-xs font-bold text-[#0F2854] mb-1">{t.report.fieldAdditionalNotes}</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{form.additionalNotes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="flex flex-wrap gap-6 pt-6 mt-4 border-t border-gray-100">
            <SignatureLine label={`${t.report.signPreparer}${form.responsible ? ` (${form.responsible})` : ''}`} />
            <SignatureLine label={`${t.report.signConsultant}${form.consultant ? ` (${form.consultant})` : ''}`} />
            <SignatureLine label={`${t.report.signApprover}${form.approver ? ` (${form.approver})` : ''}`} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ReportPrintPreview;
