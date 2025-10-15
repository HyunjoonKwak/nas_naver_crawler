import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'sale'    // 매매
  | 'jeonse'  // 전세
  | 'monthly'; // 월세

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', children, className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

    const variantClasses = {
      default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      secondary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
      success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      sale: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300', // 매매 (파란색 계열)
      jeonse: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', // 전세 (녹색 계열)
      monthly: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300', // 월세 (주황색 계열)
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// 거래 유형 Badge 컴포넌트 (편의 함수)
interface TradeBadgeProps {
  tradeType: string; // 'A1' (매매), 'B1' (전세), 'B2' (월세)
  className?: string;
}

export const TradeBadge: React.FC<TradeBadgeProps> = ({ tradeType, className }) => {
  const getTradeInfo = (type: string) => {
    switch (type) {
      case 'A1':
      case '매매':
        return { variant: 'sale' as BadgeVariant, label: '매매' };
      case 'B1':
      case '전세':
        return { variant: 'jeonse' as BadgeVariant, label: '전세' };
      case 'B2':
      case '월세':
        return { variant: 'monthly' as BadgeVariant, label: '월세' };
      default:
        return { variant: 'default' as BadgeVariant, label: type };
    }
  };

  const { variant, label } = getTradeInfo(tradeType);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
