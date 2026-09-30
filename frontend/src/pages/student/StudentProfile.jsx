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
        className="card receipt-card"
        style={{
          border: '1px solid rgba(37, 99, 235, 0.4)',
          background: 'linear-gradient(145deg, #111827 0%, #172033 100%)',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: '16px'
        }}
      >
        {/* Institution Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em', color: '#fff' }}>
                ONTIME COLLEGE OF ENGINEERING
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Student Full Name</span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{profile?.name}</p>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Register Number: </span>
                <strong style={{ fontFamily: 'monospace', color: '#fff' }}>{profile?.register_number}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department: </span>
                <span style={{ color: '#fff' }}>{profile?.department}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Year of Study: </span>
                <span style={{ color: '#fff' }}>{profile?.year}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Official Email: </span>
                <span style={{ color: '#fff' }}>{profile?.email}</span>
              </div>
            </div>
          </div>

          {/* Barcode Display Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unique Gate ID Barcode
            </span>

            {profile?.student_code && (
              <BarcodeRenderer value={profile.student_code} width={260} height={80} />
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem', textAlign: 'center' }}>
              Barcode Identifier: <strong style={{ color: 'var(--primary-400)' }}>{profile?.student_code}</strong>
            </div>
          </div>
        </div>

        {/* Security & Verification Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <div>This digital credential is property of OnTime College Administration.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
            <CheckCircle2 size={14} /> System Verified
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
