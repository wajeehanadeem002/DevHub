import { Container } from "@/components/ui/container";
import { NewProjectComposer } from "@/features/projects/new-project-composer";
import { getProjectTaxonomy } from "@/features/projects/project-data";
import { requireProfile } from "@/lib/auth/require-profile";

export default async function NewProjectPage() {
  const [, taxonomy] = await Promise.all([
    requireProfile(),
    getProjectTaxonomy(),
  ]);

  return (
    <main className="min-w-0 flex-1 overflow-x-clip" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <header className="mx-auto max-w-4xl border-b border-[#ded3c7] pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
            Guided project composer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
            Create a project
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#75685d]">
            Shape the essentials first. DevHub creates a private draft before you add optional images and publish.
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-4xl min-w-0">
          <NewProjectComposer
            categories={taxonomy.categories}
            technologies={taxonomy.technologies}
          />
        </div>
      </Container>
    </main>
  );
}
