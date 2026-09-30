import React from 'react';

/**
 * Pure SVG Code 39 Barcode Generator
 * Encodes alphanumeric text (e.g. "STU001") into an authentic scannable barcode
 */
const CODE39_PATTERNS = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100'
};

const BarcodeRenderer = ({ value = 'STU001', width = 240, height = 70, showText = true }) => {
  const cleanValue = `*${value.toUpperCase().replace(/[^0-9A-Z-. ]/g, '')}*`;

  // Build bars: '1' is wide bar (3 units), '0' is narrow bar (1 unit)
  // Each character has 9 elements (5 bars, 4 spaces) followed by a 1-unit gap
  const elements = [];
  let currentX = 10;

  for (let c = 0; c < cleanValue.length; c++) {
    const char = cleanValue[c];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['0'];

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const elementWidth = isWide ? 3 : 1;

      if (isBar) {
        elements.push({
          x: currentX,
          width: elementWidth
        });
      }
      currentX += elementWidth;
    }
    // Inter-character space
    currentX += 1;
  }

  const totalWidth = currentX + 10;
  const barHeight = height - (showText ? 22 : 4);

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '8px' }}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width={width}
        height={height}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {elements.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={6}
            width={bar.width}
            height={barHeight}
            fill="#000000"
          />
        ))}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="13"
            fontWeight="bold"
            letterSpacing="2"
            fill="#000000"
          >
            {value.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
};

export default BarcodeRenderer;
