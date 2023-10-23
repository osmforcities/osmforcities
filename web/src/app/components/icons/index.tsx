import React from "react";
import Image from "next/image";
import MagnifierRightSvg from "./magnifier-right.svg";

interface IconProps {
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

export const MagnifierRight: React.FC<Omit<IconProps, "src" | "alt">> = (
  props
) => {
  return <Icon src={MagnifierRightSvg} alt="Magnifier right" {...props} />;
};
