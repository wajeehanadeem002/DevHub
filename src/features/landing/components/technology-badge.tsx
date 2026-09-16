type TechnologyBadgeProps = {
  children: string;
};

export function TechnologyBadge({ children }: TechnologyBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#ded3c7] bg-[#e9ded0] px-2.5 py-1 text-[11px] font-medium text-[#8a6a52]">
      {children}
    </span>
  );
}
