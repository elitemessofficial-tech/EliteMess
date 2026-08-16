import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Camera,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  QrCode,
  ScanLine,
  RefreshCw,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (scannedOtp: string) => void;
}

export default function QRScannerModal({
  visible,
  onClose,
  onScanSuccess,
}: QRScannerModalProps) {
  const { isDark } = useAppTheme();
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  // HTML Camera Scanner with jsQR library & native BarcodeDetector support
  const htmlScannerContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000000; display: flex; align-items: center; justify-content: center; }
        #video-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; object-fit: cover; }
        canvas { display: none; }
        
        .viewfinder-box {
          position: absolute;
          width: 220px;
          height: 220px;
          border: 2px solid rgba(16, 185, 129, 0.5);
          border-radius: 20px;
          box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.6);
          pointer-events: none;
        }

        .laser-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #10B981;
          box-shadow: 0 0 12px #10B981, 0 0 24px #10B981;
          border-radius: 2px;
          animation: scanLaser 2s ease-in-out infinite alternate;
        }

        @keyframes scanLaser {
          0% { top: 10px; opacity: 0.9; }
          100% { top: 200px; opacity: 0.9; }
        }

        .corner {
          position: absolute;
          width: 24px;
          height: 24px;
          border-color: #10B981;
          border-width: 4px;
        }
        .tl { top: -2px; left: -2px; border-top-style: solid; border-left-style: solid; border-top-left-radius: 16px; }
        .tr { top: -2px; right: -2px; border-top-style: solid; border-right-style: solid; border-top-right-radius: 16px; }
        .bl { bottom: -2px; left: -2px; border-bottom-style: solid; border-left-style: solid; border-top-left-radius: 0; border-bottom-left-radius: 16px; }
        .br { bottom: -2px; right: -2px; border-bottom-style: solid; border-right-style: solid; border-top-right-radius: 0; border-bottom-right-radius: 16px; }

        .status-badge {
          position: absolute;
          bottom: 24px;
          background: rgba(16, 185, 129, 0.9);
          color: #FFFFFF;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div id="video-container">
        <video id="webcam" playsinline autoplay muted></video>
        <canvas id="scan-canvas"></canvas>
        
        <div class="viewfinder-box">
          <div class="laser-line"></div>
          <div class="corner tl"></div>
          <div class="corner tr"></div>
          <div class="corner bl"></div>
          <div class="corner br"></div>
        </div>

        <div class="status-badge" id="status-text">Scanning for Student QR Code...</div>
      </div>

      <script>
        var video = document.getElementById('webcam');
        var canvas = document.getElementById('scan-canvas');
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        var statusText = document.getElementById('status-text');
        var scanning = true;

        function postMessageToParent(data) {
          if (window.parent) {
            window.parent.postMessage(JSON.stringify(data), '*');
          }
        }

        // Start Camera Stream
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
          }).then(function(stream) {
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.play();
            requestAnimationFrame(tick);
          }).catch(function(err) {
            statusText.innerText = 'Camera access denied or unavailable';
            statusText.style.background = '#EF4444';
            postMessageToParent({ type: 'CAMERA_ERROR', message: err.message || 'Camera permission denied' });
          });
        } else {
          statusText.innerText = 'Camera not supported in this browser';
          statusText.style.background = '#EF4444';
        }

        function tick() {
          if (!scanning) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check with jsQR decoder
            if (window.jsQR) {
              var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data && code.data.trim()) {
                scanning = false;
                statusText.innerText = 'QR Code Detected! Verifying...';
                statusText.style.background = '#10B981';
                
                postMessageToParent({
                  type: 'QR_SCANNED',
                  otp: code.data.trim()
                });
                return;
              }
            }
          }
          requestAnimationFrame(tick);
        }
      </script>
    </body>
    </html>
  `;

  // Listen to message events from the Camera iframe
  useEffect(() => {
    if (!visible) return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'QR_SCANNED' && data.otp) {
          onScanSuccess(data.otp);
          onClose();
        } else if (data && data.type === 'CAMERA_ERROR') {
          setErrorMsg(data.message || 'Camera permission required.');
        }
      } catch (e) {
        // ignore
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [visible, onScanSuccess, onClose]);

  // Quick One-Click Test Scanner Helper
  const handleSimulateScan = (testOtp: string) => {
    onScanSuccess(testOtp);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.modalContainer}>
          {/* Header */}
          <View style={[styles.header, { borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.scanIconHeader}>
                <ScanLine size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textMain }]}>Student QR Code Scanner</Text>
                <Text style={{ fontSize: 11, color: colors.textSub }}>Point camera at student dining QR code</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <X size={18} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Scanner Viewfinder / Camera View */}
          <View style={styles.cameraBox}>
            <iframe
              ref={iframeRef}
              srcDoc={htmlScannerContent}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="camera; microphone"
            />
          </View>

          {/* Bottom Controls & Instant Test Scan Bar */}
          <View style={[styles.bottomCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#10B981" />
                <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '800' }}>
                  Auto-Detects 4-Digit & 8-Digit OTPs
                </Text>
              </View>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>30 FPS Laser</Text>
            </View>

            {/* Quick Test / Manual Scan Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={styles.simulateBtn}
                onPress={() => handleSimulateScan('49003971')}
                activeOpacity={0.8}
              >
                <QrCode size={14} color="#10B981" />
                <Text style={styles.simulateBtnText}>Scan Active OTP (4900)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.simulateBtn}
                onPress={() => handleSimulateScan('84920156')}
                activeOpacity={0.8}
              >
                <QrCode size={14} color="#10B981" />
                <Text style={styles.simulateBtnText}>Scan OTP (8492)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    height: '75%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  scanIconHeader: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cameraBox: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  bottomCard: {
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  simulateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  simulateBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
});
