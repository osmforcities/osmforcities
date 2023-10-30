import React from "react";
import Image from "next/image";

export interface IconProps {
  width?: number;
  height?: number;
  src: string;
  alt: string;
}

export const Icon: React.FC<IconProps> = ({
  width = 20,
  height = 20,
  src,
  alt,
}) => {
  return <Image src={src} alt={alt} width={width} height={height} />;
};
