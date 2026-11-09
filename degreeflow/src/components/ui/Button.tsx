import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-fg text-canvas hover:bg-fg/90 shadow-[0_1px_0_0_rgb(var(--highlight)/0.15)_inset] disabled:bg-fg/40',
  secondary: 'border border-line bg-surface text-fg hover:border-line-strong hover:bg-raised',
  ghost: 'text-muted hover:bg-raised hover:text-fg',
  subtle: 'bg-raised text-fg hover:bg-line/70',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={cn(size === 'sm' || size === 'icon-sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />}
      {children}
      {IconRight && <IconRight className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
});
