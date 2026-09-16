import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import {
  EditProjectComposer,
  type EditorProject,
} from "@/features/projects/edit-project-composer";
import {
  getOwnedProject,
  getProjectTaxonomy,
} from "@/features/projects/project-data";
import { getProjectImagePublicUrl } from "@/features/projects/project-image-storage";
import { parseProjectId } from "@/features/projects/project-input";
import type { ProjectStep } from "@/features/projects/project-stepper";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
};

const validSteps = new Set<ProjectStep>([
  "details",
  "technologies",
  "images",
  "review",
]);

function normalizeStep(value: string | string[] | undefined): ProjectStep {
  return typeof value === "string" && validSteps.has(value as ProjectStep)
    ? (value as ProjectStep)
    : "details";
}

export default async function EditProjectPage({
  params,
  searchParams,
}: EditProjectPageProps) {
  const [{ id: untrustedProjectId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const parsedProjectId = parseProjectId(untrustedProjectId);
  if (!parsedProjectId.success) {
    notFound();
  }

  const [project, taxonomy] = await Promise.all([
    getOwnedProject(parsedProjectId.data),
    getProjectTaxonomy(),
  ]);
  if (!project) {
    notFound();
  }

  const resolvedImages = await Promise.all(
    project.images.map(async ({ storage_path, ...image }) => ({
      ...image,
      publicUrl: await getProjectImagePublicUrl(storage_path),
    })),
  );
  const editorProject: EditorProject = { ...project, images: resolvedImages };
  const currentStep = normalizeStep(query.step);

  return (
    <main className="min-w-0 flex-1 overflow-x-clip" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <header className="border-b border-[#ded3c7] pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
            Guided project composer
          </p>
          <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
            Edit {project.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#75685d]">
            Move through the four focused steps, save your work, and publish when it is ready.
          </p>
        </header>

        <div className="mt-8 min-w-0">
          <EditProjectComposer
            categories={taxonomy.categories}
            currentStep={currentStep}
            project={editorProject}
            technologies={taxonomy.technologies}
          />
        </div>
      </Container>
    </main>
  );
}
