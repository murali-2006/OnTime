import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, RefreshCw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

const CameraScanner = ({ onScan, isPaused = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const detectorRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [hasCameraSupport, setHasCameraSupport] = useState(true);

  // Play audio chime on detection
  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext may be blocked before user gesture; safe to ignore
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraSupport(false);
      setCameraError('Camera access is not supported by your current browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      let message = 'Unable to access camera. Please check camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is currently in use by another application.';
      }
      setCameraError(message);
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous Barcode Scanning Loop using browser BarcodeDetector API if available
  useEffect(() => {
    let active = true;

    const setupDetector = async () => {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          detectorRef.current = new window.BarcodeDetector({
            formats: supported.length > 0 ? supported : ['code_128', 'code_39', 'qr_code', 'ean_13']
          });
        } catch (e) {
          console.warn('BarcodeDetector initialization fallback:', e);
        }
      }
    };

    setupDetector();

    const scanFrame = async () => {
      if (!active) return;

      if (
        cameraActive &&
        !isPaused &&
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        detectorRef.current
      ) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue.trim()) {
              playScanBeep();
              onScan(rawValue.trim());
              return; // Stop loop until resumed
            }
          }
        } catch (err) {
          // Scan errors in individual frames are normal while moving
        }
      }

      if (!isPaused && cameraActive) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    if (cameraActive && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, isPaused, onScan]);

  // Handle mount, unmount & facingMode changes
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playScanBeep();
    onScan(manualCode.trim().toUpperCase());
    setManualCode('');
  };

  const handlePresetClick = (code) => {
    playScanBeep();
    onScan(code);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Scanner Viewport */}
      <div className="scanner-viewport">
        <video
          ref={videoRef}
          className="scanner-video"
          playsInline
          muted
          autoPlay
        />

        {cameraActive && !isPaused && (
          <div className="scanner-reticle">
            <span
              style={{
                position: 'absolute',
                bottom: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}
            >
              Align ID card barcode within frame
            </span>
          </div>
        )}

        {isPaused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 15, 25, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
          >
            <CheckCircle2 size={42} color="#10b981" />
            <p style={{ fontWeight: 600, color: '#fff' }}>Barcode Captured</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Confirm entry below or reset to scan another student.
            </p>
          </div>
        )}

        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 15, 25, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              textAlign: 'center',
              gap: '0.75rem'
            }}
          >
            <CameraOff size={36} color="#ef4444" />
            <p style={{ fontSize: '0.9rem', color: '#fca5a5' }}>{cameraError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={startCamera}>
              <RefreshCw size={14} /> Try Camera Again
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {cameraActive ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={stopCamera}>
            <CameraOff size={15} /> Pause Camera
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={startCamera}>
            <Camera size={15} /> Start Camera
          </button>
        )}

        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleFacingMode}>
          <RefreshCw size={15} /> Flip Camera
        </button>
      </div>

      {/* Manual Barcode Input & Quick Demo Selector */}
      <div
        className="card"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          padding: '1.25rem',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Zap size={16} color="var(--primary-500)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Manual Barcode Input / Demo Tester
          </span>
        </div>

        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px' }}
            placeholder="e.g. STU001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!manualCode.trim()}>
            Lookup
          </button>
        </form>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            Quick Demo Student Barcodes:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['STU001', 'STU002', 'STU003'].map((code) => (
              <button
                key={code}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                onClick={() => handlePresetClick(code)}
              >
                Scan {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraScanner;
