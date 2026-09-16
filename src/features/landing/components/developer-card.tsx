import { DeveloperAvatar } from "./developer-avatar";
import { TechnologyBadge } from "./technology-badge";
import type { DeveloperPreview } from "../types";

type DeveloperCardProps = {
  developer: DeveloperPreview;
};

export function DeveloperCard({ developer }: DeveloperCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-[#ded3c7] bg-[#fcfaf5] p-5 shadow-[0_16px_48px_rgba(59,47,39,0.06)] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#d8c3a8] hover:shadow-[0_22px_60px_rgba(59,47,39,0.1)] motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-4">
        <DeveloperAvatar name={developer.name} size={58} src={developer.avatar} />
        <button
          className="rounded-lg border border-[#d8c3a8] bg-[#f6f1e8] px-3 py-1.5 text-xs font-semibold text-[#8a6a52] transition-[border-color,background-color,color] hover:border-[#8a6a52] hover:bg-[#8a6a52] hover:text-[#fcfaf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
          type="button"
        >
          Follow
        </button>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold tracking-[-0.015em] text-[#3b2f27]">{developer.name}</h3>
        <p className="mt-0.5 text-xs text-[#75685d]">{developer.username}</p>
        <p className="mt-3 text-sm font-medium text-[#8a6a52]">{developer.role}</p>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[#75685d]">{developer.description}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {developer.technologies.map((technology) => (
          <TechnologyBadge key={technology}>{technology}</TechnologyBadge>
        ))}
      </div>
      <div className="mt-5 flex gap-5 border-t border-[#ded3c7] pt-4 text-xs text-[#75685d]">
        <p><span className="font-semibold text-[#3b2f27]">{developer.projects}</span> Projects</p>
        <p><span className="font-semibold text-[#3b2f27]">{developer.followers}</span> Followers</p>
      </div>
    </article>
  );
}
