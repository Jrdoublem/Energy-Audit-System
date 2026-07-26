const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const USERS_COLLECTION = 'users';

async function assertIsAdmin(auth) {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'ต้องเข้าสู่ระบบก่อน');
  }
  const snap = await db.collection(USERS_COLLECTION).doc(auth.uid).get();
  if (!snap.exists || snap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'ต้องเป็นผู้ดูแลระบบเท่านั้น');
  }
}

exports.createUserAccount = onCall(async (request) => {
  await assertIsAdmin(request.auth);

  const { email, password, name, role, factories } = request.data || {};
  if (!email || !password || !name || !role) {
    throw new HttpsError('invalid-argument', 'ข้อมูลผู้ใช้ไม่ครบถ้วน');
  }

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({ email, password, displayName: name });
  } catch (err) {
    throw new HttpsError('already-exists', err.message || 'ไม่สามารถสร้างบัญชีผู้ใช้ได้');
  }

  await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
    name,
    email,
    role,
    factories: factories || [],
  });

  return { uid: userRecord.uid };
});

exports.updateUserAccount = onCall(async (request) => {
  await assertIsAdmin(request.auth);

  const { uid, email, password, name, role, factories } = request.data || {};
  if (!uid) {
    throw new HttpsError('invalid-argument', 'ไม่พบรหัสผู้ใช้');
  }

  const authUpdate = {};
  if (email) authUpdate.email = email;
  if (password) authUpdate.password = password;
  if (name) authUpdate.displayName = name;
  if (Object.keys(authUpdate).length > 0) {
    try {
      await admin.auth().updateUser(uid, authUpdate);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', err.message);
      }
      throw new HttpsError('internal', err.message || 'ไม่สามารถแก้ไขบัญชีผู้ใช้ได้');
    }
  }

  const profileUpdate = {};
  if (name) profileUpdate.name = name;
  if (email) profileUpdate.email = email;
  if (role) profileUpdate.role = role;
  if (factories) profileUpdate.factories = factories;
  if (Object.keys(profileUpdate).length > 0) {
    await db.collection(USERS_COLLECTION).doc(uid).set(profileUpdate, { merge: true });
  }

  return { ok: true };
});

exports.deleteUserAccount = onCall(async (request) => {
  await assertIsAdmin(request.auth);

  const { uid } = request.data || {};
  if (!uid) {
    throw new HttpsError('invalid-argument', 'ไม่พบรหัสผู้ใช้');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'ไม่สามารถลบบัญชีของตัวเองได้');
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', err.message || 'ไม่สามารถลบบัญชีผู้ใช้ได้');
    }
  }
  await db.collection(USERS_COLLECTION).doc(uid).delete();

  return { ok: true };
});
