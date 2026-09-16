type SectionHeadingProps = {
  align?: "center" | "left";
  id: string;
  subtitle: string;
  title: string;
};

export function SectionHeading({
  align = "left",
  id,
  subtitle,
  title,
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#3b2f27] sm:text-4xl" id={id}>
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-[#75685d] sm:text-lg">{subtitle}</p>
    </div>
  );
}
