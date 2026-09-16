import type { ComponentPropsWithoutRef } from "react";

export function Container({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-[1280px] px-5 sm:px-7 lg:px-10 ${className}`}
      {...props}
    />
  );
}
