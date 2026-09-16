"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="m-0 bg-[#f6f1e8] text-[#3b2f27]">
        <main className="flex min-h-screen items-center justify-center px-5 py-20">
          <section className="max-w-lg text-center" role="alert">
            <h1 className="text-3xl font-semibold">DevHub could not start.</h1>
            <p className="mt-4 text-[#75685d]">
              Try loading the application again.
            </p>
            <button
              className="mt-7 rounded-lg bg-[#3b2f27] px-4 py-2 text-sm font-semibold text-[#fcfaf5]"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
