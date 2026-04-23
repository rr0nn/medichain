/**
 * @fileoverview Renders provider logos for model-related UI.
 * Adapted from the original AI Elements model selector and reduced to the
 * logo helper still used by MediChain.
 * @contributors Johnson Zhang
 */

import Image from "next/image";

import type { ModelProviderId } from "@/lib/chat/model-catalog";
import { cn } from "@/lib/utils/cn";
import type { ComponentProps } from "react";

export type ModelProviderLogoProps = Omit<
  ComponentProps<typeof Image>,
  "src" | "alt" | "width" | "height"
> & {
  provider: ModelProviderId;
};

export function ModelProviderLogo({
  provider,
  className,
  ...props
}: ModelProviderLogoProps) {
  return (
    <Image
      {...props}
      alt={`${provider} logo`}
      className={cn("size-3 dark:invert", className)}
      height={12}
      unoptimized
      src={`https://models.dev/logos/${provider}.svg`}
      width={12}
    />
  );
}
