import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // State Autentikasi
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // State Splash Screen Animasi Logo BMKG
  const [showSplash, setShowSplash] = useState(false);

  // State Feedback Notifikasi Inline
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error' | 'warning', message: '' }

  // State Dashboard Navigasi & Form Stepper
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
  const [formStep, setFormStep] = useState(1); // 1, 2, 3

  // State Data Form Permohonan Data BMKG
  const [nama, setNama] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instansi, setInstansi] = useState('');
  const [jenisData, setJenisData] = useState('Data Iklim');
  const [jalur, setJalur] = useState('Non-Berbayar (Tarif Rp 0 / Mahasiswa)');
  const [fileNik, setFileNik] = useState(null);
  const [fileKtm, setFileKtm] = useState(null);
  const [fileSurat, setFileSurat] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Riwayat Permohonan Data
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showNotice = (type, message) => setNotice({ type, message });
  const clearNotice = () => setNotice(null);

  // Cek & Dengar Sesi Login Pemohon
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        triggerSplashScreen();
      }
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        triggerSplashScreen();
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Memuat Riwayat Permohonan saat Tab Riwayat Aktif
  useEffect(() => {
    if (session && activeTab === 'history') {
      fetchPermohonanHistory();
    }
  }, [session, activeTab]);

  // Trigger Animasi Splash Screen Logo BMKG selama 5 Detik
  const triggerSplashScreen = () => {
    setShowSplash(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 5000); // Durasi Tepat 5 Detik
  };

  // Fetch Riwayat Permohonan Pengguna dari Supabase Database
  const fetchPermohonanHistory = async () => {
    if (!session?.user?.email) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('permohonan')
        .select('*')
        .eq('email', session.user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
    } catch (err) {
      console.error('Error fetching history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 1. Login via Google OAuth Direct
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    clearNotice();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      showNotice('error', 'Gagal terhubung dengan Akun Google: ' + error.message);
      setAuthLoading(false);
    }
  };

  // 2. Kirim Kode OTP Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearNotice();

    const targetEmail = email.trim();
    if (!targetEmail) {
      showNotice('warning', 'Silakan masukkan alamat email Anda terlebih dahulu.');
      setAuthLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: null,
      },
    });

    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        showNotice(
          'error',
          'Pengiriman email OTP mencapai kuota. Silakan gunakan tombol "Masuk dengan Akun Google" di atas atau coba beberapa menit lagi.'
        );
      } else {
        showNotice('error', 'Gagal mengirim OTP: ' + error.message);
      }
    } else {
      showNotice('success', 'Kode OTP 6-digit berhasil dikirim! Silakan periksa notifikasi email Anda.');
      setOtpSent(true);
    }
    setAuthLoading(false);
  };

  // 3. Verifikasi Kode OTP 6-Digit
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearNotice();

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'email',
    });

    if (error) {
      showNotice('error', 'Kode OTP salah atau telah kedaluwarsa: ' + error.message);
    } else {
      setSession(data.session);
      triggerSplashScreen();
    }
    setAuthLoading(false);
  };

  // 4. Validasi Berkas Persyaratan
  const validateFile = (file, label) => {
    if (!file) return null;
    const maxSizeBytes = 5 * 1024 * 1024;
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowedExts.includes(ext)) {
      throw new Error(`Berkas ${label} harus berformat PDF, JPG, JPEG, atau PNG.`);
    }
    if (file.size > maxSizeBytes) {
      throw new Error(`Ukuran berkas ${label} melebihi 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }
    return true;
  };

  // 5. Upload Berkas ke Storage Supabase
  const uploadFile = async (file, prefix) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${prefix}_${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${cleanFileName}`;

    let bucketName = 'berkas-pelayanan-bmkg';
    let { error } = await supabase.storage.from(bucketName).upload(filePath, file);

    if (error && error.message?.includes('not found')) {
      bucketName = 'Berkas Pelayanan BMKG';
      const fallback = await supabase.storage.from(bucketName).upload(filePath, file);
      error = fallback.error;
    }

    if (error) throw error;
    return filePath;
  };

  // 6. Submit Form Permohonan Data BMKG
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    clearNotice();

    try {
      validateFile(fileNik, 'KTP / NIK');
      validateFile(fileKtm, 'KTM / Bukti Mahasiswa');
      validateFile(fileSurat, 'Surat Permohonan Resmi');

      const pathNik = await uploadFile(fileNik, 'nik');
      const pathKtm = await uploadFile(fileKtm, 'ktm');
      const pathSurat = await uploadFile(fileSurat, 'surat');

      const { error } = await supabase.from('permohonan').insert([
        {
          nama_lengkap: nama,
          email: session.user.email,
          whatsapp: whatsapp,
          instansi: instansi,
          jenis_data: jenisData,
          jalur: jalur,
          url_nik: pathNik,
          url_ktm: pathKtm,
          url_surat: pathSurat,
          status: 'MENUNGGU_VERIFIKASI',
        },
      ]);

      if (error) throw error;

      showNotice('success', 'Hore! Permohonan data BMKG Anda berhasil dikirim. Tim kami akan memverifikasinya maksimal dalam 1 hari kerja! 🎉');
      setNama('');
      setWhatsapp('');
      setInstansi('');
      setFileNik(null);
      setFileKtm(null);
      setFileSurat(null);
      setFormStep(1);
      fetchPermohonanHistory();
    } catch (err) {
      showNotice('error', 'Gagal mengirim permohonan: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 7. Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOtpSent(false);
    setOtpCode('');
    setEmail('');
    setFormStep(1);
    clearNotice();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fa', fontFamily: "'Poppins', sans-serif", color: '#2d3748', width: '100%', boxSizing: 'border-box' }}>
      {/* CSS Keyframe & Layout Injection */}
      <style>{`
        * { box-sizing: border-box; }
        @keyframes splashFadeInOut {
          0% { opacity: 0; transform: scale(0.85); }
          20% { opacity: 1; transform: scale(1.02); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.92); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(0, 168, 255, 0.45); }
          50% { box-shadow: 0 0 55px rgba(0, 168, 255, 0.85); }
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-hover-effect {
          transition: all 0.25s ease;
        }
        .btn-hover-effect:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 43, 91, 0.18);
        }
        .form-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 640px) {
          .form-grid-2col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ANIMASI SPLASH SCREEN LOGO BMKG DURASI 5 DETIK */}
      {showSplash && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#001c3d',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'splashFadeInOut 5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          <div
            style={{
              padding: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              animation: 'pulseGlow 2.5s infinite ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src="https://www.bmkg.go.id/asset/img/logo/logo-bmkg.png"
              alt="BMKG Splash Logo"
              style={{ height: '100px', width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))' }}
            />
          </div>
          
          <h2 style={{ color: '#ffffff', marginTop: '26px', fontSize: '21px', fontWeight: 700, letterSpacing: '0.8px', textAlign: 'center' }}>
            BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
          </h2>
          <p style={{ color: '#ffffff', marginTop: '8px', fontSize: '14px', fontWeight: 500, textAlign: 'center', opacity: 0.95 }}>
            Portal Resmi Pelayanan Data BMKG
          </p>
        </div>
      )}

      {/* HEADER UTAMA NAVIGATION BAR */}
      <header
        style={{
          backgroundColor: '#002b5b',
          color: '#ffffff',
          padding: '14px 36px',
          boxShadow: '0 4px 20px rgba(0, 43, 91, 0.15)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          width: '100%'
        }}
      >
        {/* SEBELAH KIRI: HANYA LOGO BMKG & INFORMASI RESMI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="https://www.bmkg.go.id/asset/img/logo/logo-bmkg.png" alt="BMKG Logo" style={{ height: '48px', width: 'auto' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 700, letterSpacing: '0.5px', color: '#ffffff' }}>
                PELAYANAN DATA BMKG
              </h1>
              <span style={{ backgroundColor: '#00a8ff', color: '#002b5b', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                RESMI
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#ffffff', fontWeight: 500, opacity: 0.95 }}>
              Badan Meteorologi, Klimatologi, dan Geofisika
            </p>
          </div>
        </div>

        {/* SEBELAH KANAN: KHUSUS PENGATURAN AKUN & ACTION */}
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginLeft: 'auto' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>
                {session.user.email}
              </span>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                ● Terverifikasi
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn-hover-effect"
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
              }}
            >
              Keluar
            </button>
          </div>
        )}
      </header>

      {/* KONTEN UTAMA */}
      <div style={{ maxWidth: session ? '1020px' : '480px', width: '100%', margin: '36px auto', padding: '0 24px', animation: 'cardSlideUp 0.4s ease-out' }}>
        
        {/* BANNER NOTIFIKASI INLINE */}
        {notice && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              backgroundColor: notice.type === 'success' ? '#ecfdf5' : notice.type === 'warning' ? '#fffbe6' : '#fef2f2',
              color: notice.type === 'success' ? '#065f46' : notice.type === 'warning' ? '#92400e' : '#991b1b',
              borderLeft: `6px solid ${notice.type === 'success' ? '#10b981' : notice.type === 'warning' ? '#f59e0b' : '#ef4444'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>
                {notice.type === 'success' ? '✅' : notice.type === 'warning' ? '⚠️' : '❌'}
              </span>
              <span>{notice.message}</span>
            </div>
            <button
              onClick={clearNotice}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        )}

        {!session ? (
          /* CARD LOGIN */
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '40px 36px',
              borderRadius: '18px',
              boxShadow: '0 12px 36px rgba(0, 43, 91, 0.09)',
              borderTop: '6px solid #002b5b'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  fontSize: '28px'
                }}
              >
                ☁️
              </div>
              <h2 style={{ margin: '0 0 8px 0', color: '#002b5b', fontSize: '22px', fontWeight: 700 }}>
                Selamat Datang di Portal BMKG
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                Silakan masuk untuk mengajukan permohonan data cuaca, iklim, atau geofisika.
              </p>
            </div>

            {/* TOMBOL GOOGLE OAUTH */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="btn-hover-effect"
              style={{
                width: '100%',
                padding: '14px 18px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {authLoading ? 'Menghubungkan Akun Google...' : 'Masuk dengan Akun Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 14px', fontWeight: 500 }}>atau via Kode OTP Email</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            {/* FORM OTP */}
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Alamat Email Google / Aktif
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh: pemohon@gmail.com"
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-hover-effect"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#002b5b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {authLoading ? 'Mengirim OTP...' : 'Kirim Kode OTP ke Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '14px', borderRadius: '10px', marginBottom: '22px', textAlign: 'center', fontSize: '13px', color: '#0369a1' }}>
                  Kode 6-digit dikirimkan ke <b>{email}</b>
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #002b5b',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-hover-effect"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {authLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk Dashboard'}
                </button>

                <button
                  type="button"
                  onClick={() => { setOtpSent(false); clearNotice(); }}
                  style={{ width: '100%', marginTop: '14px', background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Ganti Alamat Email
                </button>
              </form>
            )}
          </div>
        ) : (
          /* DASHBOARD UTAMA */
          <div>
            {/* HERO GREETING CARD (VERIFIKASI 1 HARI KERJA) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #002b5b 0%, #00458f 100%)',
                color: '#ffffff',
                padding: '32px 36px',
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(0, 43, 91, 0.16)',
                marginBottom: '28px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', color: '#38bdf8', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                  ✨ JAMINAN VERIFIKASI SUPER CEPAT
                </span>
              </div>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
                Halo, Selamat Datang! 👋
              </h2>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#f1f5f9' }}>
                Kami siap melayani kebutuhan data meteorologi, klimatologi, dan geofisika Anda. 
                Tenang saja, <b>semua jalur pelayanan</b> (baik <i>Mahasiswa Tarif Rp 0</i> maupun <i>PNBP Umum</i>) akan 
                <b> diverifikasi dalam 1 hari kerja</b>! 🚀
              </p>
            </div>

            {/* NAVIGATION TABS */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
              <button
                onClick={() => setActiveTab('form')}
                className="btn-hover-effect"
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: activeTab === 'form' ? '#002b5b' : '#ffffff',
                  color: activeTab === 'form' ? '#ffffff' : '#64748b',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <span>📝 Buat Permohonan Baru</span>
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className="btn-hover-effect"
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: activeTab === 'history' ? '#002b5b' : '#ffffff',
                  color: activeTab === 'history' ? '#ffffff' : '#64748b',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <span>📂 Riwayat Permohonan Saya</span>
              </button>
            </div>

            {activeTab === 'form' ? (
              /* FORM STEPPER 3 LANGKAH */
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '36px 32px',
                  borderRadius: '20px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.04)'
                }}
              >
                {/* STEPPER INDICATOR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '36px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '12%', right: '12%', height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }}></div>
                  <div style={{ position: 'absolute', top: '20px', left: '12%', width: formStep === 1 ? '0%' : formStep === 2 ? '38%' : '76%', height: '3px', backgroundColor: '#002b5b', zIndex: 1, transition: 'width 0.3s ease' }}></div>

                  {[
                    { step: 1, title: 'Identitas Pemohon', icon: '👤' },
                    { step: 2, title: 'Detail Data', icon: '📊' },
                    { step: 3, title: 'Upload Berkas', icon: '📁' }
                  ].map((item) => (
                    <div
                      key={item.step}
                      onClick={() => setFormStep(item.step)}
                      style={{ position: 'relative', zIndex: 2, textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div
                        className="step-circle"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: formStep >= item.step ? '#002b5b' : '#ffffff',
                          color: formStep >= item.step ? '#ffffff' : '#64748b',
                          border: `2px solid ${formStep >= item.step ? '#002b5b' : '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px auto',
                          fontWeight: 700,
                          fontSize: '15px',
                          boxShadow: formStep === item.step ? '0 0 14px rgba(0, 43, 91, 0.28)' : 'none'
                        }}
                      >
                        {item.step}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: formStep === item.step ? 700 : 500, color: formStep === item.step ? '#002b5b' : '#64748b' }}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmitForm}>
                  {/* STEP 1: IDENTITAS PEMOHON */}
                  {formStep === 1 && (
                    <div style={{ animation: 'cardSlideUp 0.3s ease-out' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#002b5b', fontSize: '18px', fontWeight: 700 }}>
                        Langkah 1: Informasi Identitas Diri
                      </h3>
                      
                      <div className="form-grid-2col" style={{ marginBottom: '18px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
                            Nama Lengkap *
                          </label>
                          <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Sesuai KTP / Kartu Mahasiswa"
                            required
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
                            Nomor WhatsApp *
                          </label>
                          <input
                            type="text"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="08123456789"
                            required
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '28px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
                          Instansi / Universitas / Sekolah *
                        </label>
                        <input
                          type="text"
                          value={instansi}
                          onChange={(e) => setInstansi(e.target.value)}
                          placeholder="Nama Universitas atau Instansi Resmi"
                          required
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!nama || !whatsapp || !instansi) {
                            showNotice('warning', 'Harap lengkapi semua bidang di Langkah 1.');
                          } else {
                            clearNotice();
                            setFormStep(2);
                          }
                        }}
                        className="btn-hover-effect"
                        style={{
                          width: '100%',
                          padding: '14px',
                          backgroundColor: '#002b5b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Lanjut ke Spesifikasi Data ➔
                      </button>
                    </div>
                  )}

                  {/* STEP 2: DETAIL DATA BMKG */}
                  {formStep === 2 && (
                    <div style={{ animation: 'cardSlideUp 0.3s ease-out' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#002b5b', fontSize: '18px', fontWeight: 700 }}>
                        Langkah 2: Spesifikasi & Jalur Permohonan Data
                      </h3>

                      <div className="form-grid-2col" style={{ marginBottom: '24px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
                            Jenis Data BMKG *
                          </label>
                          <select
                            value={jenisData}
                            onChange={(e) => setJenisData(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                          >
                            <option value="Data Iklim">Data Iklim (Curah Hujan, Suhu, Angin)</option>
                            <option value="Data Cuaca">Data Cuaca (Prakiraan & Historis)</option>
                            <option value="Data Gempa Bumi">Data Gempa Bumi & Seismologi</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
                            Jalur Pelayanan *
                          </label>
                          <select
                            value={jalur}
                            onChange={(e) => setJalur(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                          >
                            <option value="Non-Berbayar (Tarif Rp 0 / Mahasiswa)">Non-Berbayar (Mahasiswa - Rp 0)</option>
                            <option value="Berbayar (PNBP Umum)">Berbayar (PNBP Umum / Swasta)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#f0f9ff', padding: '16px 20px', borderRadius: '12px', marginBottom: '28px', borderLeft: '5px solid #0284c7' }}>
                        <span style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.5', display: 'block' }}>
                          ⚡ <b>Info Verifikasi:</b> Jalur pilihan Anda (<i>{jalur}</i>) tetap mendapat jaminan verifikasi cepat <b>maksimal 1 hari kerja</b>!
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setFormStep(1)}
                          style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          ⬅️ Kembali
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStep(3)}
                          className="btn-hover-effect"
                          style={{ flex: 2, padding: '14px', backgroundColor: '#002b5b', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Lanjut Upload Berkas ➔
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: UPLOAD BERKAS */}
                  {formStep === 3 && (
                    <div style={{ animation: 'cardSlideUp 0.3s ease-out' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#002b5b', fontSize: '18px', fontWeight: 700 }}>
                        Langkah 3: Unggah Berkas Persyaratan
                      </h3>

                      <div style={{ backgroundColor: '#fafafa', border: '1.5px dashed #cbd5e1', padding: '24px', borderRadius: '14px', marginBottom: '28px' }}>
                        
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                            1. Foto KTP / NIK Pemohon *
                          </label>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFileNik(e.target.files[0])} required />
                          {fileNik && <span style={{ display: 'block', color: '#10b981', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>✓ {fileNik.name} ({(fileNik.size / 1024).toFixed(0)} KB)</span>}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                            2. Kartu Tanda Mahasiswa (KTM) / Identitas Resmi *
                          </label>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFileKtm(e.target.files[0])} required />
                          {fileKtm && <span style={{ display: 'block', color: '#10b981', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>✓ {fileKtm.name} ({(fileKtm.size / 1024).toFixed(0)} KB)</span>}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                            3. Surat Permohonan Data Resmi *
                          </label>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFileSurat(e.target.files[0])} required />
                          {fileSurat && <span style={{ display: 'block', color: '#10b981', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>✓ {fileSurat.name} ({(fileSurat.size / 1024).toFixed(0)} KB)</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setFormStep(2)}
                          style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          ⬅️ Kembali
                        </button>
                        <button
                          type="submit"
                          disabled={submitLoading}
                          className="btn-hover-effect"
                          style={{ flex: 2, padding: '14px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {submitLoading ? 'Mengirim Data Permohonan...' : '🚀 Kirim Permohonan Sekarang'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              /* TAB RIWAYAT PERMOHONAN */
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.04)',
                  animation: 'cardSlideUp 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, color: '#002b5b', fontSize: '18px', fontWeight: 700 }}>
                    Riwayat Permohonan Data Anda
                  </h3>
                  <button
                    onClick={fetchPermohonanHistory}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🔄 Segarkan Data
                  </button>
                </div>

                {loadingHistory ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Memuat riwayat permohonan...</p>
                ) : historyList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                    <span style={{ fontSize: '44px', display: 'block', marginBottom: '12px' }}>📁</span>
                    <p style={{ margin: 0, fontWeight: 500 }}>Belum ada permohonan data yang dikirim.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          padding: '20px',
                          borderRadius: '14px',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#002b5b', fontWeight: 700 }}>
                              {item.jenis_data}
                            </h4>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '4px 12px',
                                borderRadius: '14px',
                                fontWeight: 700,
                                backgroundColor: item.status === 'MENUNGGU_VERIFIKASI' ? '#fef3c7' : '#dcfce7',
                                color: item.status === 'MENUNGGU_VERIFIKASI' ? '#d97706' : '#15803d'
                              }}
                            >
                              ● {item.status === 'MENUNGGU_VERIFIKASI' ? 'Dalam Verifikasi (Maks 1 Hari)' : item.status}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#64748b', display: 'block' }}>
                            Jalur: {item.jalur} | Instansi: {item.instansi}
                          </span>
                          <small style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                            Dikirim pada: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}