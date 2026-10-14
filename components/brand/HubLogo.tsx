export const HUB_LOGO_SRC = '/images/hub-logo.png';

interface HubLogoProps {
  className?: string;
  height?: number;
  alt?: string;
}

export default function HubLogo({ className = '', height = 28, alt = 'HUB' }: HubLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={HUB_LOGO_SRC}
      alt={alt}
      className={`block w-auto max-w-none object-contain object-left select-none ${className}`.trim()}
      style={{ height, width: 'auto' }}
    />
  );
}
