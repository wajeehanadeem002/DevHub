import { DeveloperAvatar } from "./developer-avatar";
import { TechnologyBadge } from "./technology-badge";
import { CodeIcon, VerifiedIcon } from "@/components/ui/icons";

function FloatingProjectCard({
  className,
  description,
  name,
  technologies,
}: {
  className: string;
  description: string;
  name: string;
  technologies: readonly string[];
}) {
  return (
    <article className={`absolute z-20 w-[220px] rounded-xl border border-[#ded3c7] bg-[#fcfaf5]/95 p-4 shadow-[0_24px_70px_rgba(59,47,39,0.12)] backdrop-blur ${className}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#ded3c7] bg-[#e9ded0] text-[#8a6a52]">
          <CodeIcon className="h-4 w-4" />
        </span>
        <span className="h-1.5 w-8 rounded-full bg-[#d8c3a8]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[#3b2f27]">{name}</h3>
      <p className="mt-1 text-[11px] leading-4 text-[#75685d]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {technologies.map((technology) => (
          <span className="rounded border border-[#ded3c7] bg-[#e9ded0] px-1.5 py-0.5 text-[8px] text-[#8a6a52]" key={technology}>
            {technology}
          </span>
        ))}
      </div>
    </article>
  );
}

export function HeroProfilePreview() {
  return (
    <div className="relative mx-auto min-h-[560px] w-full max-w-[610px]" aria-label="DevHub product preview">
      <div className="absolute inset-x-8 top-4 h-[300px] overflow-hidden rounded-xl border border-[#ded3c7] bg-[#e9ded0] opacity-90 shadow-[0_22px_60px_rgba(59,47,39,0.08)] sm:inset-x-12">
        <div className="flex h-9 items-center gap-1.5 border-b border-[#ded3c7] px-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8a6a52]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#d8c3a8]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#ded3c7]" />
          <span className="ml-3 font-mono text-[9px] text-[#75685d]">profile.tsx</span>
        </div>
        <div className="space-y-3 px-5 py-5 font-mono text-[10px] leading-none sm:px-7">
          <p><span className="text-[#8a6a52]">const</span> <span className="text-[#3b2f27]">developer</span> <span className="text-[#75685d]">=</span> <span className="text-[#75685d]">&#123;</span></p>
          <p className="pl-5"><span className="text-[#8a6a52]">craft</span><span className="text-[#75685d]">:</span> <span className="text-[#8a6a52]">&quot;intentional&quot;</span><span className="text-[#75685d]">,</span></p>
          <p className="pl-5"><span className="text-[#8a6a52]">shipping</span><span className="text-[#75685d]">:</span> <span className="text-[#3b2f27]">true</span><span className="text-[#75685d]">,</span></p>
          <p className="pl-5"><span className="text-[#8a6a52]">community</span><span className="text-[#75685d]">:</span> <span className="text-[#8a6a52]">&quot;DevHub&quot;</span></p>
          <p className="text-[#75685d]">&#125;</p>
        </div>
      </div>

      <div className="absolute left-1/2 top-[88px] z-10 w-[min(390px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-5 shadow-[0_30px_100px_rgba(59,47,39,0.12),0_0_70px_rgba(216,195,168,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <DeveloperAvatar name="Alex Morgan" size={64} src="/avatars/alex-morgan.svg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold text-[#3b2f27]">Alex Morgan</h2>
                <VerifiedIcon className="h-[17px] w-[17px] shrink-0 text-[#8a6a52]" />
              </div>
              <p className="mt-0.5 text-xs text-[#75685d]">@alexmorgan</p>
              <p className="mt-1.5 text-xs font-medium text-[#8a6a52]">Full Stack Developer</p>
            </div>
          </div>
          <button className="shrink-0 rounded-lg bg-[#8a6a52] px-3 py-1.5 text-xs font-semibold text-[#fcfaf5] transition-colors hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]" type="button">
            Follow
          </button>
        </div>

        <p className="mt-5 text-xs leading-5 text-[#75685d]">
          Building useful products with strong interfaces, reliable systems, and thoughtful details.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["React", "Next.js", "TypeScript", "Node.js"] as const).map((technology) => (
            <TechnologyBadge key={technology}>{technology}</TechnologyBadge>
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 divide-x divide-[#ded3c7] rounded-lg border border-[#ded3c7] bg-[#f6f1e8]/65 py-3 text-center">
          <div>
            <dd className="text-sm font-semibold text-[#3b2f27]">12</dd>
            <dt className="mt-0.5 text-[10px] text-[#75685d]">Projects</dt>
          </div>
          <div>
            <dd className="text-sm font-semibold text-[#3b2f27]">1.8K</dd>
            <dt className="mt-0.5 text-[10px] text-[#75685d]">Followers</dt>
          </div>
        </dl>
      </div>

      <FloatingProjectCard
        className="bottom-5 left-0 rotate-[-2deg] sm:left-1"
        description="Modern productivity dashboard"
        name="TaskFlow"
        technologies={["Next.js", "TypeScript"]}
      />
      <FloatingProjectCard
        className="bottom-14 right-0 hidden rotate-[2deg] sm:block"
        description="AI-powered code insights"
        name="CodeLens"
        technologies={["React", "Python"]}
      />

      <div className="absolute bottom-0 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-[#d8c3a8]/20 blur-3xl" />
    </div>
  );
}
