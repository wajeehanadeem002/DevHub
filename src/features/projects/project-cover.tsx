import Image from "next/image";

import { CodeIcon } from "@/components/ui/icons";

import type { ProjectImage } from "./project-data";

export type ProjectCoverImage = Pick<
  ProjectImage,
  "alt_text" | "height" | "id" | "sort_order" | "width"
>;

type ProjectCoverProps = {
  image: ProjectCoverImage | ProjectImage | null;
  imageUrl: string | null;
  title: string;
};

export function ProjectCover({ image, imageUrl, title }: ProjectCoverProps) {
  if (image && imageUrl) {
    return (
      <div className="aspect-[16/9] overflow-hidden bg-[#e9ded0]">
        <Image
          alt={image.alt_text}
          className="h-full w-full object-cover"
          height={image.height}
          sizes="(min-width: 1024px) 35vw, (min-width: 640px) 50vw, 100vw"
          src={imageUrl}
          width={image.width}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`${title} project cover`}
      className="flex aspect-[16/9] items-center justify-center bg-[#e9ded0] px-6 text-[#3b2f27]"
      role="img"
    >
      <div className="flex items-center gap-3 rounded-xl border border-[#d8c3a8] bg-[#f9f5ee]/80 px-4 py-3 shadow-[0_12px_30px_rgba(59,47,39,0.08)]">
        <span className="grid size-9 place-items-center rounded-lg bg-[#3b2f27] text-[#fcfaf5]">
          <CodeIcon className="size-4" />
        </span>
        <span className="text-sm font-bold tracking-[-0.025em]">DevHub</span>
      </div>
    </div>
  );
}
