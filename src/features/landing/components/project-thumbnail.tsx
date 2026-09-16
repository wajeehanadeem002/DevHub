import type { ProjectPreview } from "../types";

type ProjectThumbnailProps = {
  variant: ProjectPreview["thumbnail"];
};

function WindowChrome({ label }: { label: string }) {
  return (
    <div className="flex h-7 items-center justify-between border-b border-[#ded3c7] px-3">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8a6a52]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#d8c3a8]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#ded3c7]" />
      </div>
      <span className="text-[7px] font-medium tracking-wide text-[#75685d]">{label}</span>
      <span className="w-4" />
    </div>
  );
}

function TaskFlowPreview() {
  return (
    <div className="h-full bg-[#f6f1e8]">
      <WindowChrome label="TASKFLOW" />
      <div className="grid h-[calc(100%-1.75rem)] grid-cols-[36px_1fr]">
        <div className="border-r border-[#ded3c7] px-2 py-3">
          <span className="block h-3 w-3 rounded bg-[#8a6a52]" />
          <span className="mt-3 block h-1 w-4 rounded bg-[#3b2f27]/20" />
          <span className="mt-2 block h-1 w-4 rounded bg-[#3b2f27]/15" />
          <span className="mt-2 block h-1 w-3 rounded bg-[#3b2f27]/15" />
        </div>
        <div className="p-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="block h-1.5 w-14 rounded bg-[#3b2f27]/70" />
              <span className="mt-1.5 block h-1 w-20 rounded bg-[#3b2f27]/12" />
            </div>
            <span className="h-4 w-9 rounded bg-[#8a6a52]/85" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["bg-[#8a6a52]", "bg-[#d8c3a8]", "bg-[#e9ded0]"].map((color, column) => (
              <div className="rounded border border-[#ded3c7] bg-[#fcfaf5] p-1.5" key={color}>
                <span className={`block h-0.5 w-3 rounded ${color}`} />
                {[0, 1].map((item) => (
                  <div className="mt-1.5 rounded bg-[#e9ded0] p-1" key={item}>
                    <span className="block h-0.5 w-full rounded bg-[#3b2f27]/18" />
                    <span className="mt-1 block h-0.5 w-2/3 rounded bg-[#3b2f27]/12" />
                  </div>
                ))}
                {column === 0 ? <span className="mt-1.5 block h-0.5 w-3/4 rounded bg-[#3b2f27]/[0.07]" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DevBoardPreview() {
  return (
    <div className="h-full bg-[#f6f1e8]">
      <WindowChrome label="DEVBOARD" />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="h-1.5 w-16 rounded bg-[#3b2f27]/60" />
          <span className="h-4 w-4 rounded-full bg-[#8a6a52]/75" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["12", "84", "07"].map((value, index) => (
            <div className="rounded border border-[#ded3c7] bg-[#fcfaf5] p-2" key={value}>
              <span className="block text-[8px] font-semibold text-[#3b2f27]/75">{value}</span>
              <span className={`mt-1 block h-0.5 rounded ${index === 1 ? "w-5 bg-[#8a6a52]/75" : "w-7 bg-[#3b2f27]/12"}`} />
            </div>
          ))}
        </div>
        <div className="relative mt-2.5 h-11 overflow-hidden rounded border border-[#ded3c7] bg-[#fcfaf5]">
          <span className="absolute inset-x-2 top-1/3 border-t border-dashed border-[#ded3c7]" />
          <span className="absolute inset-x-2 top-2/3 border-t border-dashed border-[#ded3c7]" />
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 200 44">
            <path d="M0 34 28 27l28 5 28-18 29 7 28-13 30 9 29-12" fill="none" stroke="#8a6a52" strokeWidth="2" />
            <path d="M0 34 28 27l28 5 28-18 29 7 28-13 30 9 29-12V44H0Z" fill="url(#chart-fill)" opacity=".2" />
            <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d8c3a8"/><stop offset="1" stopColor="#d8c3a8" stopOpacity="0"/></linearGradient></defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

function CodeLensPreview() {
  return (
    <div className="h-full bg-[#e9ded0]/45">
      <WindowChrome label="CODELENS" />
      <div className="grid h-[calc(100%-1.75rem)] grid-cols-[1fr_58px]">
        <div className="space-y-2 border-r border-[#ded3c7] p-3 font-mono text-[6px] leading-none">
          <p><span className="text-[#8a6a52]">const</span> <span className="text-[#3b2f27]">insights</span> <span className="text-[#75685d]">=</span> <span className="text-[#8a6a52]">analyze</span><span className="text-[#75685d]">(repo)</span></p>
          <p className="pl-2"><span className="text-[#3b2f27]">quality</span><span className="text-[#75685d]">:</span> <span className="text-[#8a6a52]">&quot;strong&quot;</span></p>
          <p className="pl-2"><span className="text-[#3b2f27]">coverage</span><span className="text-[#75685d]">:</span> <span className="text-[#8a6a52]">84</span></p>
          <p className="text-[#75685d]/55">{`// 3 improvements found`}</p>
          <span className="block h-0.5 w-4/5 rounded bg-[#3b2f27]/[0.08]" />
          <span className="block h-0.5 w-3/5 rounded bg-[#3b2f27]/[0.08]" />
        </div>
        <div className="p-2">
          <div className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-[#8a6a52]/70 text-[9px] font-semibold text-[#3b2f27]">
            92
          </div>
          <span className="mt-3 block h-1 w-9 rounded bg-[#3b2f27]/15" />
          <span className="mt-1.5 block h-1 w-7 rounded bg-[#3b2f27]/10" />
          <span className="mt-1.5 block h-1 w-8 rounded bg-[#3b2f27]/10" />
        </div>
      </div>
    </div>
  );
}

function FinTrackPreview() {
  return (
    <div className="h-full bg-[#f6f1e8]">
      <WindowChrome label="FINTRACK" />
      <div className="grid grid-cols-[1.05fr_.95fr] gap-2 p-3">
        <div>
          <span className="text-[6px] uppercase tracking-widest text-[#75685d]">Balance</span>
          <p className="mt-1 text-[13px] font-semibold text-[#3b2f27]">$24,860.40</p>
          <span className="mt-1 inline-block rounded bg-[#e9ded0] px-1 py-0.5 text-[6px] text-[#8a6a52]">+8.4%</span>
          <div className="mt-4 flex h-10 items-end gap-1">
            {[45, 66, 52, 83, 70, 96, 78, 100].map((height, index) => (
              <span className={`w-full rounded-sm ${index === 7 ? "bg-[#8a6a52]" : "bg-[#d8c3a8]/70"}`} key={height} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {["Housing", "Food", "Tools"].map((label, index) => (
            <div className="rounded border border-[#ded3c7] bg-[#fcfaf5] p-2" key={label}>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded ${index === 0 ? "bg-[#8a6a52]" : index === 1 ? "bg-[#d8c3a8]" : "bg-[#e9ded0]"}`} />
                <span className="text-[6px] text-[#75685d]">{label}</span>
              </div>
              <span className="mt-1.5 block h-1 w-9 rounded bg-[#3b2f27]/15" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectThumbnail({ variant }: ProjectThumbnailProps) {
  const preview = {
    codelens: <CodeLensPreview />,
    devboard: <DevBoardPreview />,
    fintrack: <FinTrackPreview />,
    taskflow: <TaskFlowPreview />,
  }[variant];

  return (
    <div aria-hidden="true" className="aspect-[16/10] overflow-hidden rounded-lg border border-[#ded3c7] bg-[#f6f1e8] shadow-[0_20px_50px_rgba(59,47,39,0.07)]">
      {preview}
    </div>
  );
}
