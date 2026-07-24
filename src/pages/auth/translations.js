import { useState, useCallback } from 'react';

export const TRANSLATIONS = {
  th: {
    // Login
    emailLabel: 'อีเมล',
    passwordLabel: 'รหัสผ่าน',
    remember: 'จดจำฉันในอุปกรณ์นี้',
    forgot: 'ลืมรหัสผ่าน?',
    confirmPasswordLabel: 'ยืนยันรหัสผ่าน',
    loginBtn: 'เข้าสู่ระบบ',
    // ForgotPassword
    forgotTitle: 'Forgot Password',
    forgotDesc: 'กรอกอีเมลของคุณ เราจะส่งรหัสยืนยัน\nสำหรับตั้งรหัสผ่านใหม่ให้',
    send: 'SEND',
    rememberPw: 'จำรหัสผ่านได้แล้ว?',
    backLogin: 'เข้าสู่ระบบ',
    // Verify
    checkEmail: 'Check Email',
    checkEmailDesc: 'เราได้ส่งรหัส 6 หลักไปที่ email ของคุณแล้ว',
    verify: 'VERIFY',
    notReceived: 'ไม่ได้รับรหัส?',
    resend: 'ส่งอีกครั้ง',
    wrongEmail: 'อีเมลผิด?',
    backEdit: 'กลับไปแก้ไข',
    // ResetPassword
    resetTitle: 'Reset Password',
    resetDesc: 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ',
    newPasswordLabel: 'รหัสผ่านใหม่',
    confirm: 'CONFIRM',
    backToLogin: 'กลับหน้าเข้าสู่ระบบ',
  },
  en: {
    // Login
    emailLabel: 'Email',
    passwordLabel: 'Password',
    remember: 'Remember this device',
    forgot: 'Forgot password?',
    confirmPasswordLabel: 'Confirm Password',
    loginBtn: 'LOGIN',
    // ForgotPassword
    forgotTitle: 'Forgot Password',
    forgotDesc: 'Enter your email and we will send\na verification code to reset your password.',
    send: 'SEND',
    rememberPw: 'Remember your password?',
    backLogin: 'Sign In',
    // Verify
    checkEmail: 'Check Email',
    checkEmailDesc: 'We sent a 6-digit code to your email.',
    verify: 'VERIFY',
    notReceived: "Didn't receive the code?",
    resend: 'Resend',
    wrongEmail: 'Wrong email?',
    backEdit: 'Go back',
    // ResetPassword
    resetTitle: 'Reset Password',
    resetDesc: 'Set a new password for your account.',
    newPasswordLabel: 'New Password',
    confirm: 'CONFIRM',
    backToLogin: 'Back to Sign In',
  },
};

export function useLang() {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'th');

  const setLang = useCallback((l) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  }, []);

  return { lang, setLang, t: TRANSLATIONS[lang] };
}
