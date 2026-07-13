import { cn, colorIndex, initials } from '@/lib/utils';

const PALETTE = [
  'bg-indigo-500/20 text-indigo-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300',
  'bg-sky-500/20 text-sky-300',
  'bg-violet-500/20 text-violet-300',
];

interface AvatarProps {
  name: string;
  id?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizes = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
};

export function Avatar({ name, id, src, size = 'sm', className }: AvatarProps) {
  const color = PALETTE[colorIndex(id ?? name)];
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase',
        sizes[size],
        !src && color,
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
