import { useLang } from '../context/languageStore.js';

export default function ChillerLoadCurve({
  specTR = 0,
  specKW = 0,
  specKwPerTr = 0,
  coolingLoadTR = 0,
  currentKW = 0,
  kwPerTrCurrent = 0,
  kwPerTrProposed = null,
  showProposed = false,
  compact = false,
  title,
  subtitle,
}) {
  const { t } = useLang();

  const ratedTR = parseFloat(specTR) || 0;
  const ratedKW = parseFloat(specKW) || 0;
  const ratedEff = parseFloat(specKwPerTr) || (ratedTR > 0 && ratedKW > 0 ? ratedKW / ratedTR : 0.55);

  const actualTR = parseFloat(coolingLoadTR) || 0;
  const actualKW = parseFloat(currentKW) || 0;
  const actualEff = parseFloat(kwPerTrCurrent) || (actualTR > 0 && actualKW > 0 ? actualKW / actualTR : 0);
  const proposedEff = kwPerTrProposed != null ? parseFloat(kwPerTrProposed) : null;

  const pctCoolingLoad = ratedTR > 0 && actualTR > 0 ? (actualTR / ratedTR) * 100 : null;
  const pctElectricalLoad = ratedKW > 0 && actualKW > 0 ? (actualKW / ratedKW) * 100 : null;

  // Zone classification
  let zoneKey = 'optimal';
  let zoneLabel = t.calcResult?.optimalZone || 'ช่วงประหยัดพลังงานสูงสุด (Optimal Zone 60-85%)';
  let zoneBadgeCls = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40';
  let zoneAdvice = 'Chiller ทำงานอยู่ในช่วงภาระที่ประหยัดพลังงานสูงสุด (Optimal Efficiency Zone 60-85%) มีอัตราการกินไฟเฉลี่ยต่อตัน (kW/TR) ต่ำที่สุด';

  if (pctCoolingLoad != null) {
    if (pctCoolingLoad < 40) {
      zoneKey = 'low';
      zoneLabel = t.calcResult?.lowLoadZone || 'ช่วงภาระต่ำกินไฟสูง (Low Load <40%)';
      zoneBadgeCls = 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40';
      zoneAdvice = 'Chiller ทำงานที่ภาระต่ำกว่า 40% ส่งผลให้ค่า kW/TR สูงขึ้น กินไฟมากกว่าปกติ แนะนำให้จัดลำดับเดินเครื่อง (Chiller Sequencing) หรือติดตั้ง VFD เพื่อลดการสูญเสีย';
    } else if (pctCoolingLoad >= 40 && pctCoolingLoad < 60) {
      zoneKey = 'moderate';
      zoneLabel = t.calcResult?.moderateZone || 'ช่วงภาระปานกลาง (Moderate 40-60%)';
      zoneBadgeCls = 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
      zoneAdvice = 'Chiller ทำงานในระดับภาระปานกลาง 40-60% สมรรถนะอยู่ในเกณฑ์มาตรฐาน สามารถเพิ่มประสิทธิภาพได้หากปรับการจ่ายโหลดให้อยู่ช่วง 65-80%';
    } else if (pctCoolingLoad > 85) {
      zoneKey = 'overload';
      zoneLabel = t.calcResult?.overloadZone || 'ช่วงภาระเต็มพิกัด (Full Load >90%)';
      zoneBadgeCls = 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40';
      zoneAdvice = 'Chiller ทำงานใกล้หรือเต็มพิกัด >85% จ่ายความเย็นเต็มกำลัง ประสิทธิภาพคงที่ตามพิกัดโรงงาน';
    }
  }

  // SVG Dimensions & Scales
  const svgW = 620;
  const svgH = compact ? 260 : 300;
  const padL = 60;
  const padR = 40;
  const padT = 35;
  const padB = 48;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const yMin = 0.3;
  const highestVal = Math.max(actualEff || 0, proposedEff || 0, ratedEff || 0, 1.2);
  const yMax = Math.max(1.3, Math.ceil(highestVal * 1.15 * 10) / 10);

  const xToPx = (pct) => padL + (Math.max(0, Math.min(100, pct)) / 100) * chartW;
  const yToPx = (kw) => padT + ((yMax - Math.max(yMin, Math.min(yMax, kw))) / (yMax - yMin)) * chartH;

  // Generate curve path points
  const pctSteps = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const baseStd = ratedEff || 0.55;

  const stdCurveD = pctSteps.reduce((acc, x, i) => {
    const mult = 0.88 + 1.22 * Math.pow((100 - x) / 95, 2.6) + 0.12 * Math.pow((x - 70) / 30, 2);
    const px = xToPx(x);
    const py = yToPx(baseStd * mult);
    return i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : `${acc} L ${px.toFixed(1)} ${py.toFixed(1)}`;
  }, '');

  const vfdCurveD = pctSteps.reduce((acc, x, i) => {
    const mult = 0.70 + 0.65 * Math.pow((100 - x) / 95, 2.0) + 0.25 * Math.pow((x - 60) / 40, 2);
    const px = xToPx(x);
    const py = yToPx(baseStd * mult);
    return i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : `${acc} L ${px.toFixed(1)} ${py.toFixed(1)}`;
  }, '');

  const opX = pctCoolingLoad != null ? xToPx(pctCoolingLoad) : null;
  const opY = actualEff > 0 ? yToPx(actualEff) : null;

  const propX = showProposed && pctCoolingLoad != null && proposedEff != null ? xToPx(pctCoolingLoad) : null;
  const propY = showProposed && proposedEff != null ? yToPx(proposedEff) : null;

  const ratedX = xToPx(100);
  const ratedY = yToPx(ratedEff);

  // Y-axis grid ticks
  const yTicks = [];
  for (let yv = 0.4; yv <= yMax; yv += 0.2) {
    yTicks.push(parseFloat(yv.toFixed(1)));
  }

  return (
    <div className="space-y-4">
      {/* Header and Zone Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-[#38BDF8] shrink-0" />
            {title || t.calcResult?.loadCurveTitle || 'กราฟสมรรถนะตามภาระโหลด (CHILLER PART-LOAD PERFORMANCE CURVE)'}
          </h4>
          <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5">
            {subtitle || t.calcResult?.loadCurveSubtitle || 'เปรียบเทียบประสิทธิภาพการใช้พลังงาน (kW/TR) ณ ระดับภาระการทำงานจริง (% Cooling Load) กับเส้นมาตรฐานอุตสาหกรรม'}
          </p>
        </div>
        {pctCoolingLoad != null && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${zoneBadgeCls}`}>
            {zoneLabel}
          </span>
        )}
      </div>

      {/* Top Status Cards: Cooling Load / Electrical Load / Specific Power */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Cooling Load */}
          <div className="p-3.5 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-1.5">
            <p className="text-xs text-gray-500 dark:text-[#7E93AF] font-bold">
              {t.calcResult?.coolingLoadFactorLabel || 'ภาระทำความเย็น (% Cooling Load)'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono leading-none">
                {pctCoolingLoad != null ? `${pctCoolingLoad.toFixed(1)}%` : '-'}
              </span>
              {actualTR > 0 && ratedTR > 0 && (
                <span className="text-xs text-gray-400 font-mono">
                  ({actualTR.toFixed(1)} / {ratedTR} TR)
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pctCoolingLoad || 0)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              Q = ṁ·Cp·ΔT = {actualTR.toFixed(1)} TR ({ratedTR > 0 ? `${((actualTR / ratedTR) * 100).toFixed(0)}% ของสเปก` : ''})
            </p>
          </div>

          {/* 2. Electrical Load */}
          <div className="p-3.5 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-1.5">
            <p className="text-xs text-gray-500 dark:text-[#7E93AF] font-bold">
              {t.calcResult?.electricalLoadFactorLabel || 'ภาระโหลดทางไฟฟ้า (% Electrical Load)'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-mono leading-none">
                {pctElectricalLoad != null ? `${pctElectricalLoad.toFixed(1)}%` : '-'}
              </span>
              {actualKW > 0 && ratedKW > 0 && (
                <span className="text-xs text-gray-400 font-mono">
                  ({actualKW.toFixed(1)} / {ratedKW} kW)
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pctElectricalLoad || 0)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              กำลังไฟฟ้าวัดจริง = {actualKW.toFixed(1)} kW (พิกัด {ratedKW} kW)
            </p>
          </div>

          {/* 3. Specific Power */}
          <div className="p-3.5 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-1.5">
            <p className="text-xs text-gray-500 dark:text-[#7E93AF] font-bold">
              สมรรถนะพลังงานจริง (kW/TR)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono leading-none">
                {actualEff > 0 ? actualEff.toFixed(3) : '-'}
              </span>
              <span className="text-xs text-gray-400 font-mono">kW/TR</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-gray-400">พิกัดเต็มสเปก:</span>
              <span className="font-mono font-bold text-gray-700 dark:text-[#C3D2E5]">{ratedEff.toFixed(3)} kW/TR</span>
            </div>
            {actualEff > 0 && ratedEff > 0 && (
              <p className={`text-[10px] font-bold ${actualEff <= ratedEff ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {actualEff <= ratedEff ? '✓ ดีกว่าพิกัดเต็มสเปก' : `+${(((actualEff - ratedEff) / ratedEff) * 100).toFixed(1)}% จากพิกัดเต็ม`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SVG Performance Curve Chart */}
      <div className="w-full rounded-2xl bg-white dark:bg-[#0B1B33] border border-[#E4EBF6] dark:border-white/10 p-3 sm:p-4 shadow-sm overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-sans">
          {/* Zone Background Rectangles */}
          {/* 0-40% Low Load */}
          <rect x={xToPx(0)} y={padT} width={xToPx(40) - xToPx(0)} height={chartH} fill="#EF4444" fillOpacity="0.08" />
          {/* 40-60% Moderate */}
          <rect x={xToPx(40)} y={padT} width={xToPx(60) - xToPx(40)} height={chartH} fill="#F59E0B" fillOpacity="0.06" />
          {/* 60-85% Optimal */}
          <rect x={xToPx(60)} y={padT} width={xToPx(85) - xToPx(60)} height={chartH} fill="#10B981" fillOpacity="0.12" />
          {/* 85-100% Full Load */}
          <rect x={xToPx(85)} y={padT} width={xToPx(100) - xToPx(85)} height={chartH} fill="#3B82F6" fillOpacity="0.06" />

          {/* Zone Headers on top of chart */}
          <text x={xToPx(20)} y={padT + 12} textAnchor="middle" fill="#EF4444" fontSize="9.5" fontWeight="bold">ภาระต่ำ &lt;40% (กินไฟสูง)</text>
          <text x={xToPx(50)} y={padT + 12} textAnchor="middle" fill="#D97706" fontSize="9.5" fontWeight="bold">ปานกลาง 40-60%</text>
          <text x={xToPx(72.5)} y={padT + 12} textAnchor="middle" fill="#059669" fontSize="9.5" fontWeight="bold">★ จุดประหยัดสูงสุด 60-85%</text>
          <text x={xToPx(92.5)} y={padT + 12} textAnchor="middle" fill="#2563EB" fontSize="9.5" fontWeight="bold">เต็มพิกัด</text>

          {/* Y Grid lines & tick labels */}
          {yTicks.map((yv) => {
            const py = yToPx(yv);
            return (
              <g key={yv}>
                <line x1={padL} y1={py} x2={padL + chartW} y2={py} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" className="text-gray-400 dark:text-white" />
                <text x={padL - 8} y={py + 3.5} textAnchor="end" fontSize="10" fontWeight="bold" fill="currentColor" className="text-gray-400 dark:text-[#7E93AF]">
                  {yv.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X Grid lines & tick labels */}
          {[0, 20, 40, 60, 80, 100].map((xv) => {
            const px = xToPx(xv);
            return (
              <g key={xv}>
                <line x1={px} y1={padT} x2={px} y2={padT + chartH} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" className="text-gray-400 dark:text-white" />
                <text x={px} y={padT + chartH + 16} textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor" className="text-gray-500 dark:text-[#8CA3C0]">
                  {xv}%
                </text>
              </g>
            );
          })}

          {/* Axis baseline lines */}
          <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" className="text-gray-500 dark:text-white" />
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" className="text-gray-500 dark:text-white" />

          {/* Axis Titles */}
          <text x={padL - 10} y={padT - 12} textAnchor="end" fontSize="10" fontWeight="bold" fill="currentColor" className="text-gray-600 dark:text-[#A6BBD5]">
            kW/TR
          </text>
          <text x={padL + chartW / 2} y={svgH - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" className="text-gray-600 dark:text-[#A6BBD5]">
            ภาระทำความเย็น (% Cooling Load = Actual TR / Rated TR × 100%)
          </text>

          {/* Standard Benchmark Curve (Blue) */}
          <path d={stdCurveD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />

          {/* High Efficiency / VFD Curve (Emerald Dashed) */}
          <path d={vfdCurveD} fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />

          {/* Rated 100% Spec Point Marker */}
          <g>
            <rect x={ratedX - 5} y={ratedY - 5} width="10" height="10" fill="#2563EB" transform={`rotate(45 ${ratedX} ${ratedY})`} />
            <text x={ratedX - 8} y={ratedY - 8} textAnchor="end" fontSize="9.5" fontWeight="bold" fill="#2563EB">
              สเปก 100% ({ratedEff.toFixed(2)})
            </text>
          </g>

          {/* Current Operating Point Marker & Projections */}
          {opX != null && opY != null && (
            <g>
              {/* Projection Dashed lines */}
              <line x1={opX} y1={opY} x2={opX} y2={padT + chartH} stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1={padL} y1={opY} x2={opX} y2={opY} stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Glowing Ripple & Point */}
              <circle cx={opX} cy={opY} r="13" fill="#38BDF8" fillOpacity="0.25" />
              <circle cx={opX} cy={opY} r="7.5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx={opX} cy={opY} r="3" fill="#FFFFFF" />

              {/* Callout Tag */}
              <g transform={`translate(${Math.min(padL + chartW - 145, Math.max(padL + 5, opX - 70))}, ${Math.max(padT + 16, opY - (showProposed ? 40 : 30))})`}>
                <rect width="140" height="22" rx="11" fill="#0F2854" stroke="#38BDF8" strokeWidth="1" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))" />
                <text x="70" y="15" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#FFFFFF">
                  📍 เดิม: {pctCoolingLoad.toFixed(1)}% · {actualEff.toFixed(3)} kW/TR
                </text>
              </g>
            </g>
          )}

          {/* Proposed Target Point Marker (For Measure Evaluation) */}
          {showProposed && propX != null && propY != null && (
            <g>
              {/* Arrow connecting current -> proposed */}
              {opY != null && propY > opY && (
                <line x1={opX} y1={opY + 8} x2={propX} y2={propY - 8} stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
              )}
              {opY != null && propY < opY && (
                <line x1={opX} y1={opY - 8} x2={propX} y2={propY + 8} stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
              )}

              {/* Glowing Target Ring */}
              <circle cx={propX} cy={propY} r="14" fill="#10B981" fillOpacity="0.3" />
              <circle cx={propX} cy={propY} r="8" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx={propX} cy={propY} r="3" fill="#FFFFFF" />

              {/* Callout Tag */}
              <g transform={`translate(${Math.min(padL + chartW - 145, Math.max(padL + 5, propX - 70))}, ${Math.min(padT + chartH - 28, propY + 12)})`}>
                <rect width="140" height="22" rx="11" fill="#064E3B" stroke="#34D399" strokeWidth="1" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))" />
                <text x="70" y="15" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#A7F3D0">
                  ✨ ใหม่: {proposedEff.toFixed(3)} kW/TR
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-[#C3D2E5] pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 rounded-full bg-[#2563EB]" />
          <span>{t.calcResult?.manufacturerCurve || 'เส้นมาตรฐาน Chiller ทั่วไป (Manufacturer / AHRI Benchmark)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 border-t-2 border-dashed border-[#059669]" />
          <span>{t.calcResult?.highEffCurve || 'เส้นอ้างอิง Chiller ประสิทธิภาพสูง (High-Efficiency / VFD)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] ring-2 ring-[#38BDF8]" />
          <span className="font-bold">{t.calcResult?.currentOperatingPoint || 'จุดทำงานปัจจุบัน (Operating Point)'}</span>
        </div>
        {showProposed && proposedEff != null && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] ring-2 ring-[#34D399]" />
            <span className="font-bold text-emerald-600 dark:text-emerald-400">จุดเป้าหมายใหม่ (Proposed)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rotate-45 bg-[#2563EB]" />
          <span>{t.calcResult?.ratedSpecPoint || 'พิกัดเต็มสเปก 100%'}</span>
        </div>
      </div>

      {/* Advice Callout */}
      {!compact && (
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <p className="leading-relaxed">{zoneAdvice}</p>
        </div>
      )}
    </div>
  );
}
