import React, { useState, useEffect } from 'react';
import {
  User,
  ScanBarcode as BarcodeIcon,
  Printer,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import BarcodeRenderer from '../../components/BarcodeRenderer';

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/student/profile');
        if (res.success && res.student) {
          setProfile(res.student);
        }
      } catch (err) {
        console.error('Failed to load student profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handlePrintCard = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading student credentials...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Digital Student ID Card</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Present this scannable barcode at the campus gate reader
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrintCard}>
          <Printer size={16} /> Print ID Card
        </button>
      </div>

      {/* Official Student ID Badge Card */}
      <div
        className="card receipt-card student-id-card"
        style={{
          border: '1px solid rgba(37, 99, 235, 0.4)',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: '16px'
        }}
      >
        {/* Institution Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary-600), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(37,99,235,0.4)'
            }}>
              <Clock size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em', color: '#ffffff' }}>
                Jai Shriram College Of Engineering
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                STUDENT IDENTIFICATION CREDENTIAL
              </span>
            </div>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
            VALID 2026–2027
          </span>
        </div>

        {/* Student Data Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Student Full Name</span>
            <p className="id-card-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0 0 0' }}>{profile?.name}</p>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Register Number: </span>
                <strong className="id-card-value" style={{ fontFamily: 'monospace', color: '#ffffff', fontWeight: 700 }}>{profile?.register_number}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Department: </span>
                <span className="id-card-value" style={{ color: '#ffffff', fontWeight: 600 }}>{profile?.department}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Year of Study: </span>
                <span className="id-card-value" style={{ color: '#ffffff', fontWeight: 600 }}>{profile?.year}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Official Email: </span>
                <span className="id-card-value" style={{ color: '#ffffff', fontWeight: 600, wordBreak: 'break-all' }}>{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div>
                  <span style={{ color: '#94a3b8' }}>Phone: </span>
                  <span className="id-card-value" style={{ color: '#ffffff', fontWeight: 600 }}>{profile?.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Barcode Display Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Unique Gate ID Barcode
            </span>

            {profile?.student_code && (
              <BarcodeRenderer value={profile.student_code} width={260} height={80} />
            )}

            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.75rem', textAlign: 'center' }}>
              Barcode Identifier: <strong className="id-card-barcode-val" style={{ color: '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem' }}>{profile?.student_code}</strong>
            </div>
          </div>
        </div>

        {/* Security & Verification Footer */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>This digital credential is property of Jai Shriram College Of Engineering.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> System Verified
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
