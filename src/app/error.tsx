"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main
      className="flex flex-1 items-center justify-center px-5 py-20"
      id="main-content"
    >
      <section className="max-w-lg text-center" role="alert">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#3b2f27]">
          We could not load this page.
        </h1>
        <p className="mt-4 text-[#75685d]">
          Try the request again. If the problem continues, return later.
        </p>
        <button
          className="mt-7 rounded-lg bg-[#3b2f27] px-4 py-2 text-sm font-semibold text-[#fcfaf5] hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
