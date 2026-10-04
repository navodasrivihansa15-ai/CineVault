"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { getValidAvatarUrl } from "@/lib/utils";

interface UserAvatarProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackSize?: number;
  fallbackClassName?: string;
}

export default function UserAvatar({
  src,
  alt = "Avatar",
  className = "",
  fallbackSize = 20,
  fallbackClassName = "text-silver-dark",
}: UserAvatarProps) {
  const [error, setError] = useState(false);
  const [validSrc, setValidSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src) {
      setValidSrc(getValidAvatarUrl(src));
      setError(false);
    } else {
      setValidSrc(null);
    }
  }, [src]);

  if (!validSrc || error) {
    return <User size={fallbackSize} className={fallbackClassName} />;
  }

  return (
    <img
      src={validSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
