import React from 'react';

/**
 * Pure SVG Authentic Dummy QR Code for Project Demonstration
 * Generates a crisp, scannable-aesthetic vector QR code matrix (25x25 modules)
 * Contains standard corner position detection patterns, timing lines, and alignment markers.
 * Not connected to any real account or payment gateway.
 */
const QR_SIZE = 25;

// Deterministic mock data bits for 25x25 demonstration QR code
const DEMO_PATTERN = [
  // 0 - 6: Top finder rows
  '11111110100110001111111',
  '10000010011001101000001',
  '10111010101110001011101',
  '10111010010101101011101',
  '10111010110010101011101',
  '10000010101001001000001',
  '11111110101010101111111',
  // 7: Separator
  '00000000110101000000000',
  // 8 - 16: Middle data & timing rows
  '11011011001110101101101',
  '01101001110001010010110',
  '10110100101101110101001',
  '01011110110010011011010',
  '11000101001111000100111',
  '00111011101001101011000',
  '11010100010110110100101',
  '01101110100101001101110',
  '10010001111011111010001',
  // 17: Bottom separator
  '00000000101001111100000',
  // 18 - 24: Bottom finder rows + alignment
  '11111110110111110111111',
  '10000010001010100010001',
  '10111010110101111010101',
  '10111010011010100010101',
  '10111010100111110111111',
  '10000010111001010001000',
  '11111110010110101110101'
];

const DummyQRCode = ({ size = 140, className = '' }) => {
  // Build cells from the 25x25 matrix
  const cells = [];
  const matrixSize = 25;

  for (let r = 0; r < matrixSize; r++) {
    const rowStr = DEMO_PATTERN[r] || '';
    for (let c = 0; c < matrixSize; c++) {
      // Is Finder Pattern?
      const isTopLeftFinder = r < 7 && c < 7;
      const isTopRightFinder = r < 7 && c >= matrixSize - 7;
      const isBottomLeftFinder = r >= matrixSize - 7 && c < 7;

      let isDark = false;

      if (isTopLeftFinder) {
        // 7x7 position detection box
        const inBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        isDark = inBorder || inCenter;
      } else if (isTopRightFinder) {
        const cRel = c - (matrixSize - 7);
        const inBorder = r === 0 || r === 6 || cRel === 0 || cRel === 6;
        const inCenter = r >= 2 && r <= 4 && cRel >= 2 && cRel <= 4;
        isDark = inBorder || inCenter;
      } else if (isBottomLeftFinder) {
        const rRel = r - (matrixSize - 7);
        const inBorder = rRel === 0 || rRel === 6 || c === 0 || c === 6;
        const inCenter = rRel >= 2 && rRel <= 4 && c >= 2 && c <= 4;
        isDark = inBorder || inCenter;
      } else if (r === 6) {
        // Horizontal timing pattern
        isDark = c % 2 === 0;
      } else if (c === 6) {
        // Vertical timing pattern
        isDark = r % 2 === 0;
      } else if (r >= 16 && r <= 20 && c >= 16 && c <= 20) {
        // 5x5 Alignment Pattern (center at 18, 18)
        const inBorder = r === 16 || r === 20 || c === 16 || c === 20;
        const inCenter = r === 18 && c === 18;
        isDark = inBorder || inCenter;
      } else if (
        (r === 7 && (c < 8 || c >= matrixSize - 8)) ||
        (c === 7 && (r < 8 || r >= matrixSize - 8)) ||
        (r === matrixSize - 8 && c < 8) ||
        (c === 7 && r >= matrixSize - 8)
      ) {
        // Separators around finder patterns
        isDark = false;
      } else {
        // Data modules from bitmask
        const charIdx = c % rowStr.length;
        isDark = rowStr[charIdx] === '1';
      }

      if (isDark) {
        cells.push({ r, c });
      }
    }
  }

  const moduleSize = 10;
  const quietZone = 14;
  const viewBoxSize = matrixSize * moduleSize + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        flexShrink: 0,
        borderRadius: '6px'
      }}
      role="img"
      aria-label="Demo QR Code"
    >
      {/* Crisp White Background */}
      <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" rx={4} />

      {/* Dark Modules in Deep Navy Theme */}
      {cells.map(({ r, c }, idx) => (
        <rect
          key={idx}
          x={quietZone + c * moduleSize}
          y={quietZone + r * moduleSize}
          width={moduleSize}
          height={moduleSize}
          fill="#0f172a"
        />
      ))}

      {/* Center Subtle Demo Badge */}
      <g transform={`translate(${viewBoxSize / 2 - 28}, ${viewBoxSize / 2 - 12})`}>
        <rect
          width="56"
          height="24"
          rx="6"
          fill="#ffffff"
          stroke="#2563eb"
          strokeWidth="2"
        />
        <text
          x="28"
          y="16"
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.05em"
          fill="#2563eb"
        >
          UPI
        </text>
      </g>
    </svg>
  );
};

export default DummyQRCode;
