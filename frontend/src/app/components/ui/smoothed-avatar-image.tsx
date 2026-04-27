import { CSSProperties, ImgHTMLAttributes, useEffect, useState } from 'react';

type SmoothedAvatarImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

const OUTPUT_SIZE = 512;

async function createSmoothedAvatarUrl(src: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Canvas is not available.'));
        return;
      }

      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const sourceSize = Math.min(image.width, image.height);
      const sourceX = (image.width - sourceSize) / 2;
      const sourceY = (image.height - sourceSize) / 2;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    image.onerror = () => reject(new Error('Unable to load avatar image.'));
    image.src = src;
  });
}

export function SmoothedAvatarImage({
  src,
  alt,
  className,
  style,
  ...props
}: SmoothedAvatarImageProps) {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let active = true;

    setDisplaySrc(src);

    createSmoothedAvatarUrl(src)
      .then((nextSrc) => {
        if (active) {
          setDisplaySrc(nextSrc);
        }
      })
      .catch(() => {
        if (active) {
          setDisplaySrc(src);
        }
      });

    return () => {
      active = false;
    };
  }, [src]);

  return (
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      className={className}
      style={{ imageRendering: 'auto', ...style } as CSSProperties}
    />
  );
}
