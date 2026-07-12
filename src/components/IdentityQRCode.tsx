import { QRCodeSVG } from "qrcode.react";
import { buildIdentityPayload } from "../lib/qr";
import type { Profile } from "../types/firestore";

export default function IdentityQRCode({ profile, size = 160 }: {
  profile: Pick<Profile, "uid" | "verificationCode">; size?: number;
}) {
  return (
    <div className="p-3 bg-white border-4 border-stone-800 rounded-2xl inline-block">
      <QRCodeSVG value={buildIdentityPayload(profile)} size={size} level="M" />
    </div>
  );
}
