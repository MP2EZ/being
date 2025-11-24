/**
 * QRCodePlaceholder - Placeholder for app store QR codes
 * Provides structured placeholder that can be easily updated when app URLs available
 * Specifications: 300x300px, 8px midnight blue border, 16px white padding
 */

interface QRCodePlaceholderProps {
  platform: 'ios' | 'android';
  className?: string;
}

// Generate stable random pattern outside component (executed once at module load)
const GRID_OPACITIES = Array.from({ length: 64 }, () => Math.random() > 0.5 ? 1 : 0.3);

export default function QRCodePlaceholder({ platform, className = '' }: QRCodePlaceholderProps) {
  const platformText = platform === 'ios' ? 'iOS App Store' : 'Google Play Store';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* QR Code Container */}
      <div
        className="relative bg-white p-4 rounded-lg"
        style={{
          width: '300px',
          height: '300px',
          border: '8px solid #1B2951', // brand-midnight
        }}
      >
        {/* Placeholder grid pattern */}
        <div className="absolute inset-4 grid grid-cols-8 grid-rows-8 gap-2">
          {GRID_OPACITIES.map((opacity, i) => (
            <div
              key={i}
              className="bg-gray-300 rounded-sm"
              style={{ opacity }}
            />
          ))}
        </div>

        {/* Center logo placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-3 rounded-lg shadow-lg">
            <div className="text-4xl">🧠</div>
          </div>
        </div>

        {/* Update instructions overlay (visible in development) */}
        <div className="absolute inset-0 flex items-center justify-center bg-brand-midnight bg-opacity-90 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="text-white text-center p-4 text-sm">
            <p className="font-semibold mb-2">Placeholder QR Code</p>
            <p className="text-xs">
              Update with actual {platformText} URL when app is published
            </p>
          </div>
        </div>
      </div>

      {/* Platform label */}
      <p className="mt-4 text-sm text-gray-600 font-medium">
        Scan for {platformText}
      </p>

      {/*
        DEVELOPER NOTE:
        To update with real QR code:
        1. Generate QR code from app store URL using qrcode library or online generator
        2. Replace this component with:
           <Image src="/qr-codes/{platform}-qr.png" alt="..." width={300} height={300} />
        3. Or use dynamic generation:
           import QRCode from 'qrcode.react';
           <QRCode value={appStoreUrl} size={268} /> // 300px - 16px padding - 16px border
      */}
    </div>
  );
}
