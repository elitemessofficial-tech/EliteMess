import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  RefreshCw,
  Camera,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  // High Performance 60 FPS HTML Camera Scanner with BarcodeDetector + jsQR
  const htmlScannerContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000000; display: flex; align-items: center; justify-content: center; }
        #video-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; object-fit: cover; }
        canvas { display: none; }
        
        .viewfinder-box {
          position: absolute;
          width: 230px;
          height: 230px;
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          border-radius: 20px;
          box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.65);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Hardware Accelerated Smooth 60 FPS Laser Line */
        .laser-line {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          height: 3px;
          background: linear-gradient(90deg, transparent, #10B981 15%, #34D399 50%, #10B981 85%, transparent);
          box-shadow: 0 0 16px #10B981, 0 0 32px #10B981;
          border-radius: 3px;
          animation: scanLaserSmooth 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
          will-change: transform;
          transform: translateZ(0);
        }

        @keyframes scanLaserSmooth {
          0% { transform: translateY(0px); opacity: 0.75; }
          100% { transform: translateY(205px); opacity: 1; }
        }

        .corner {
          position: absolute;
          width: 26px;
          height: 26px;
          border-color: #10B981;
          border-width: 4px;
        }
        .tl { top: -2px; left: -2px; border-top-style: solid; border-left-style: solid; border-top-left-radius: 18px; }
        .tr { top: -2px; right: -2px; border-top-style: solid; border-right-style: solid; border-top-right-radius: 18px; }
        .bl { bottom: -2px; left: -2px; border-bottom-style: solid; border-left-style: solid; border-bottom-left-radius: 18px; }
        .br { bottom: -2px; right: -2px; border-bottom-style: solid; border-right-style: solid; border-bottom-right-radius: 18px; }

        .status-badge {
          position: absolute;
          bottom: 22px;
          background: rgba(16, 185, 129, 0.95);
          color: #FFFFFF;
          padding: 8px 18px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.6);
          letter-spacing: 0.3px;
          text-align: center;
          max-width: 88%;
          transition: background 0.3s ease;
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
        var barcodeDetector = null;

        // Try native BarcodeDetector API for instant sub-millisecond GPU decoding
        if ('BarcodeDetector' in window) {
          try {
            barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          } catch (e) {}
        }

        function postMessageToParent(data) {
          if (window.parent) {
            window.parent.postMessage(JSON.stringify(data), '*');
          }
        }

        // Start High Quality Camera Stream
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          }).then(function(stream) {
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.play();
            requestAnimationFrame(tick);
          }).catch(function(err) {
            // Fallback for laptops/front cameras
            navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
              video.srcObject = stream;
              video.setAttribute('playsinline', true);
              video.play();
              requestAnimationFrame(tick);
            }).catch(function(finalErr) {
              statusText.innerText = 'Camera permission required';
              statusText.style.background = '#EF4444';
              postMessageToParent({ type: 'CAMERA_ERROR', message: finalErr.message || 'Camera permission denied' });
            });
          });
        } else {
          statusText.innerText = 'Camera not supported';
          statusText.style.background = '#EF4444';
        }

        function onCodeFound(rawString) {
          if (!scanning) return;
          scanning = false;
          statusText.innerText = 'QR Code Detected! Verifying...';
          statusText.style.background = '#10B981';
          
          postMessageToParent({
            type: 'QR_SCANNED',
            otp: rawString.trim()
          });
        }

        function tick() {
          if (!scanning) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // 1. Fast path: Native BarcodeDetector
            if (barcodeDetector) {
              barcodeDetector.detect(video).then(function(barcodes) {
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  onCodeFound(barcodes[0].rawValue);
                  return;
                }
              }).catch(function() {});
            }

            // 2. Ultra-optimized jsQR decoding
            // Downscale to 480x480 for 60fps instant decoding without CPU lag
            var scanSize = 480;
            canvas.width = scanSize;
            canvas.height = scanSize;
            
            // Draw central crop of the video
            var minDim = Math.min(video.videoWidth, video.videoHeight);
            var sx = (video.videoWidth - minDim) / 2;
            var sy = (video.videoHeight - minDim) / 2;
            
            ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, scanSize, scanSize);

            if (window.jsQR) {
              var imgData = ctx.getImageData(0, 0, scanSize, scanSize);
              var code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });

              if (code && code.data && code.data.trim()) {
                onCodeFound(code.data);
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

          {/* Camera Viewport */}
          <View style={styles.cameraViewport}>
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={htmlScannerContent}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 20,
                  backgroundColor: '#000000',
                }}
                allow="camera; microphone"
              />
            ) : null}
          </View>

          {/* Helper Footer */}
          <View style={[styles.footerInfo, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={14} color="#10B981" />
              <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '700' }}>
                Instant OTP Recognition Active
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>
              Scanning student QR automatically deducts 1 token and confirms dining.
            </Text>
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
    height: 520,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    flexDirection: 'column',
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraViewport: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  footerInfo: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
