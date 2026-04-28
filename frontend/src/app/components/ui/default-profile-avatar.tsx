import { Camera, UserRound } from 'lucide-react';

import { cn } from './utils';

type DefaultProfileAvatarProps = {
  className?: string;
  iconClassName?: string;
  showCameraBadge?: boolean;
  badgeClassName?: string;
};

export function DefaultProfileAvatar({
  className,
  iconClassName,
  showCameraBadge = false,
  badgeClassName,
}: DefaultProfileAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white',
        className,
      )}
    >
      <UserRound className={cn('h-[46%] w-[46%] stroke-[2.2]', iconClassName)} />
      {showCameraBadge ? (
        <div
          className={cn(
            'absolute bottom-[6%] right-[6%] flex h-[26%] w-[26%] items-center justify-center rounded-full border-2 border-white bg-green-600 shadow-sm',
            badgeClassName,
          )}
        >
          <Camera className="h-[52%] w-[52%] stroke-[2.1]" />
        </div>
      ) : null}
    </div>
  );
}
