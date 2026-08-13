// Corrective-measure names grouped by equipment category — split out of
// MeasureSelect.jsx so both it and CalcResult.jsx (recommended-measure
// chips) can import the data without tripping the "a file exporting a
// component must only export components" fast-refresh rule.
export const MEASURES = {
  chiller: [
    'ล้าง Condenser',
    'ล้าง Evaporator',
    'เติมน้ำยาทำความเย็น',
    'ปรับ Setpoint น้ำเย็น',
    'ปรับแต่ง Refrigerant Charge',
    'ทำความสะอาดหอผึ่งน้ำ',
    'ติดตั้ง VFD สำหรับปั๊มน้ำเย็น',
    'เปลี่ยนเครื่องทำน้ำเย็นประสิทธิภาพสูง',
  ],
  compressor: [
    'ตรวจสอบระบบรั่วซึม',
    'เปลี่ยนไส้กรองอากาศ',
    'ปรับความดันใช้งาน',
    'ติดตั้ง VFD',
    'เปลี่ยน Compressor ประสิทธิภาพสูง',
  ],
  pump: [
    'ติดตั้ง VFD',
    'ปรับขนาดปั๊มให้เหมาะสม',
    'เปลี่ยนปั๊มประสิทธิภาพสูง',
    'ตรวจสอบและซ่อมแซมระบบท่อ',
  ],
  boiler: [
    'ตรวจสอบฉนวนกันความร้อน',
    'ปรับอัตราส่วนอากาศต่อเชื้อเพลิง',
    'ติดตั้งระบบ Heat Recovery',
    'ทำความสะอาด Boiler Tube',
    'เปลี่ยนหม้อไอน้ำประสิทธิภาพสูง',
  ],
  cooling: [
    'ทำความสะอาดหอผึ่งน้ำ',
    'ปรับปรุงระบบกระจายน้ำ',
    'เปลี่ยนพัดลมประสิทธิภาพสูง',
    'ติดตั้ง VFD สำหรับพัดลม',
    'เปลี่ยนหอผึ่งน้ำประสิทธิภาพสูง',
  ],
  electrical: [
    'ติดตั้ง Power Factor Correction',
    'เปลี่ยนหลอดไฟ LED',
    'ติดตั้ง Energy Management System',
    'ปรับปรุงระบบไฟฟ้าแสงสว่าง',
    'เปลี่ยนหม้อแปลงประสิทธิภาพสูง',
    'เปลี่ยนมอเตอร์ประสิทธิภาพสูง',
  ],
};

export const ALL_MEASURES = [...new Set(Object.values(MEASURES).flat())];
