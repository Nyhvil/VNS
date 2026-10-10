import Image from "next/image";

export default function LoginShieldArt() {
  return (
    <div className="mx-auto w-full max-w-60">
      <Image
        src="/img/Logo.png"
        alt=""
        aria-hidden="true"
        width={456}
        height={503}
        quality={100}
        priority
        className="mx-auto h-auto w-full object-contain [image-rendering:-webkit-optimize-contrast]"
      />
    </div>
  );
}
