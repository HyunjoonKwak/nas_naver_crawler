interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showArea?: boolean;
}

/**
 * Sparkline 차트 컴포넌트
 *
 * 간단한 가격 추이를 시각화하는 작은 라인 차트입니다.
 * SVG로 직접 렌더링하여 가볍고 빠릅니다.
 */
export const Sparkline = ({
  data,
  width = 100,
  height = 30,
  color = '#3b82f6',
  fillColor = 'rgba(59, 130, 246, 0.1)',
  showArea = true,
}: SparklineProps) => {
  if (!data || data.length < 2) {
    return null;
  }

  // 데이터 정규화
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // 0으로 나누기 방지

  // 포인트 생성
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  // SVG 경로 생성
  const linePath = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Area 경로 생성 (선 아래 영역)
  const areaPath = showArea
    ? `${linePath} L ${width} ${height} L 0 ${height} Z`
    : '';

  // 추세 계산 (상승/하락)
  const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'flat';

  return (
    <div className="inline-block relative" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className="block"
        style={{ overflow: 'visible' }}
      >
        {/* Area (배경 영역) */}
        {showArea && (
          <path
            d={areaPath}
            fill={fillColor}
            strokeWidth={0}
          />
        )}

        {/* Line (라인) */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 마지막 포인트 강조 */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2}
          fill={color}
        />
      </svg>

      {/* 추세 표시 (선택) */}
      {trend !== 'flat' && (
        <span
          className={`absolute -right-1 top-1/2 -translate-y-1/2 text-xs ${
            trend === 'up'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {trend === 'up' ? '↗' : '↘'}
        </span>
      )}
    </div>
  );
};
