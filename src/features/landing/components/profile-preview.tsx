import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";

import { DeveloperAvatar } from "./developer-avatar";
import { ProjectThumbnail } from "./project-thumbnail";
import { TechnologyBadge } from "./technology-badge";

const featuredProjects = [
  { description: "Productivity for focused teams", name: "TaskFlow", thumbnail: "taskflow" as const },
  { description: "AI-powered code insights", name: "CodeLens", thumbnail: "codelens" as const },
  { description: "Projects, goals, and momentum", name: "DevBoard", thumbnail: "devboard" as const },
] as const;

export function ProfilePreview() {
  return (
    <section
      aria-labelledby="profile-preview-heading"
      className="border-y border-[#ded3c7] bg-[#e9ded0]/45 py-24 sm:py-28"
      id="profile-preview"
    >
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">Inside DevHub</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#3b2f27] sm:text-4xl" id="profile-preview-heading">
            Developer Profile Preview
          </h2>
          <p className="mt-3 text-base leading-7 text-[#75685d] sm:text-lg">
            A focused home for your skills, experience, and the projects that define your work.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] shadow-[0_30px_100px_rgba(59,47,39,0.1),0_0_80px_rgba(216,195,168,0.14)]">
          <div className="flex h-11 items-center gap-2 border-b border-[#ded3c7] bg-[#f6f1e8] px-5">
            <span className="h-2 w-2 rounded-full bg-[#8a6a52]" />
            <span className="h-2 w-2 rounded-full bg-[#d8c3a8]" />
            <span className="h-2 w-2 rounded-full bg-[#ded3c7]" />
            <span className="ml-3 rounded border border-[#ded3c7] bg-[#fcfaf5] px-3 py-1 font-mono text-[9px] text-[#75685d]">devhub.dev/alexmorgan</span>
          </div>

          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <div className="border-b border-[#ded3c7] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div className="flex items-center gap-4">
                <DeveloperAvatar name="Alex Morgan" size={82} src="/avatars/alex-morgan.svg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#3b2f27]">Alex Morgan</h3>
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#8a6a52] text-[#fcfaf5]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#75685d]">@alexmorgan</p>
                  <p className="mt-2 text-sm font-medium text-[#8a6a52]">Full Stack Developer</p>
                </div>
              </div>
              <p className="mt-6 max-w-md text-sm leading-6 text-[#75685d]">
                Product-minded developer building fast, useful software with a strong eye for interface detail.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {(["React", "Next.js", "TypeScript", "Node.js"] as const).map((technology) => (
                  <TechnologyBadge key={technology}>{technology}</TechnologyBadge>
                ))}
              </div>
              <dl className="mt-8 grid grid-cols-3 border-y border-[#ded3c7] py-5">
                {[
                  ["12", "Projects"],
                  ["1.8K", "Followers"],
                  ["36", "Following"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dd className="text-base font-semibold text-[#3b2f27]">{value}</dd>
                    <dt className="mt-1 text-[11px] text-[#75685d]">{label}</dt>
                  </div>
                ))}
              </dl>
              <button className="mt-6 w-full rounded-lg bg-[#8a6a52] px-4 py-2.5 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52]" type="button">
                Follow Alex
              </button>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#3b2f27]">Featured Projects</h3>
                <span className="hidden items-center gap-1.5 text-xs font-medium text-[#8a6a52] sm:inline-flex">
                  View all
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {featuredProjects.map((project) => (
                  <article className="group rounded-xl border border-[#ded3c7] bg-[#f6f1e8] p-3 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[#d8c3a8] motion-reduce:transform-none" key={project.name}>
                    <ProjectThumbnail variant={project.thumbnail} />
                    <h4 className="mt-4 text-sm font-semibold text-[#3b2f27]">{project.name}</h4>
                    <p className="mt-1 text-[11px] leading-4 text-[#75685d]">{project.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
