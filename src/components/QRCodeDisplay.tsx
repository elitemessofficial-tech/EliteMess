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
  size = 140,
  color = '#10B981',
  backgroundColor = '#FFFFFF',
  showCorners = true,
}: QRCodeDisplayProps) {
  const matrix = generateQRMatrix(value || '00000000');
  const matrixSize = matrix.length; // 25x25
  const cellSize = size / matrixSize;

  return (
    <View style={[styles.outerContainer, { width: size + 28, height: size + 28 }]}>
      {/* Corner Bracket Decorations */}
      {showCorners && (
        <>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </>
      )}

      <View style={[styles.qrCanvas, { width: size + 12, height: size + 12, backgroundColor }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect x={0} y={0} width={size} height={size} fill={backgroundColor} />
          {matrix.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              return (
                <Rect
                  key={`${r}_${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.3} // small overlap to prevent micro gap lines
                  height={cellSize + 0.3}
                  fill={color}
                  rx={0.5}
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
