import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { generateQRMatrix } from '../utils/qrEncoder';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  showCorners?: boolean;
}

export default function QRCodeDisplay({
  value,
  size = 145,
  color = '#064E3B',
  backgroundColor = '#FFFFFF',
  showCorners = true,
}: QRCodeDisplayProps) {
  const matrix = generateQRMatrix(value || '00000000');
  const matrixSize = matrix.length || 21;
  // Standard quiet zone padding of 2 modules
  const totalModules = matrixSize + 4;
  const cellSize = size / totalModules;
  const offset = 2 * cellSize;

  return (
    <View style={[styles.outerContainer, { width: size + 24, height: size + 24 }]}>
      {/* Corner Bracket Decorations */}
      {showCorners && (
        <>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </>
      )}

      <View style={[styles.qrCanvas, { width: size + 10, height: size + 10, backgroundColor }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect x={0} y={0} width={size} height={size} fill={backgroundColor} />
          {matrix.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              return (
                <Rect
                  key={`${r}_${c}`}
                  x={offset + c * cellSize}
                  y={offset + r * cellSize}
                  width={cellSize + 0.3} // small overlap to prevent micro gap lines
                  height={cellSize + 0.3}
                  fill={color}
                />
              );
            })
          )}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrCanvas: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 6,
  },
});
