import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={className}>
      <Image
        src="/logo.png"
        alt="ONNRIDES"
        width={36}
        height={36}
        className="h-full w-auto"
      />
    </div>
  );
} 