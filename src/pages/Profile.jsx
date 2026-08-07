import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import {
  getSession, fetchUserProfile, saveUserProfile, updateSessionUser, changeOwnPassword,
} from '../context/authStore.js';
import { fileToResizedDataUrl } from '../utils/image.js';
import { uploadImage, deleteImage } from '../context/storageStore.js';
import { useLang } from '../context/languageStore.js';
import { CameraIcon } from '../components/icons';

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function Profile() {
  const { t } = useLang();
  const session = getSession();
  const roleLabel = session.role === 'admin' ? t.nav.roleAdmin : t.settings.roleEngineer;
  const isAdmin = session.role === 'admin';

  const [name, setName] = useState(session.name || '');
  const [photoURL, setPhotoURL] = useState(session.photoURL || '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    fetchUserProfile(session.id).then((profile) => {
      if (!profile) return;
      setName(profile.name || '');
      setPhotoURL(profile.photoURL || '');
    }).catch(() => {});
  }, [session.id]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    setPhotoUploading(true);
    const previousPhotoURL = photoURL;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const url = await uploadImage(dataUrl, 'avatars');
      setPhotoURL(url);
      await saveUserProfile(session.id, { photoURL: url });
      updateSessionUser({ photoURL: url });
      if (previousPhotoURL) deleteImage(previousPhotoURL).catch(() => {});
    } catch (err) {
      console.error('Profile photo upload failed:', err);
      setPhotoError(t.profile.photoUploadFailed);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) {
      setInfoError(t.profile.errName);
      return;
    }
    setSavingInfo(true);
    setInfoError('');
    setInfoSaved(false);
    try {
      await saveUserProfile(session.id, { name: name.trim() });
      updateSessionUser({ name: name.trim() });
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2000);
    } catch (err) {
      console.error('Profile info save failed:', err);
      setInfoError(t.profile.saveFailed);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordChanged(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.profile.errAllPasswordFields);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.profile.errPasswordMismatch);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t.profile.errPasswordTooShort);
      return;
    }
    setChangingPassword(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordChanged(true);
      setTimeout(() => setPasswordChanged(false), 2000);
    } catch (err) {
      setPasswordError(err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
        ? t.profile.errWrongCurrentPassword
        : t.profile.passwordChangeFailed);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout title={t.profile.pageTitle} hideFactorySelect factoryRowBelowTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-2xl lg:max-w-none lg:items-start">

        <Panel className="p-5">
          <SectionHeader title={t.profile.photoSectionTitle} />
          <div className="flex flex-col items-center text-center">
            {photoURL ? (
              <img src={photoURL} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4988C4] to-[#1C4D8D] flex items-center justify-center text-white text-2xl font-bold shrink-0 font-mono shadow-md">
                {initialsOf(name || session.name)}
              </div>
            )}
            <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mt-3">{name || session.name}</p>
            <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5">{roleLabel}</p>
            <label className={`w-full flex items-center justify-center py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-[#4988C4] mt-4 transition-colors ${
              photoUploading ? 'opacity-60 pointer-events-none' : 'hover:border-[#4988C4] hover:bg-[#4988C4]/5 cursor-pointer'
            }`}>
              <CameraIcon className="w-4 h-4 mr-1.5" />
              {photoUploading ? t.profile.uploadingPhoto : t.profile.changePhoto}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" disabled={photoUploading} />
            </label>
          </div>
          {photoError && <p className="text-xs text-red-500 mt-2.5 text-center">{photoError}</p>}
        </Panel>

        <Panel className="p-5">
          <SectionHeader title={t.profile.infoSectionTitle} />
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.fullName}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.email}</label>
              <input
                value={session.email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-400 dark:text-[#7E93AF] cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-1">{t.profile.emailNotEditable}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.role}</label>
              <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{roleLabel}</p>
              {!isAdmin && (
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-1">
                  {t.profile.responsibleFactories}: {(session.factories || []).length ? session.factories.join(', ') : t.profile.notAssignedYet}
                </p>
              )}
            </div>
            {infoError && <p className="text-xs text-red-500">{infoError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="px-5 py-2.5 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {savingInfo ? '...' : t.profile.saveInfo}
              </button>
              {infoSaved && <span className="text-xs font-semibold text-emerald-600">{t.profile.infoSaved}</span>}
            </div>
          </div>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <SectionHeader title={t.profile.passwordSectionTitle} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.newPassword}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{t.profile.confirmNewPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
          </div>
          {passwordError && <p className="text-xs text-red-500 mb-3">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="px-5 py-2.5 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {changingPassword ? '...' : t.profile.changePassword}
            </button>
            {passwordChanged && <span className="text-xs font-semibold text-emerald-600">{t.profile.passwordChanged}</span>}
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}

export default Profile;
