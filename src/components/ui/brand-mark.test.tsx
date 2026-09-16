import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("renders the generated DevHub logo asset as decorative imagery", () => {
    const { container } = render(<BrandMark />);
    const mark = container.querySelector("img");

    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark).toHaveAttribute("alt", "");
    expect(mark?.getAttribute("src")).toContain(
      encodeURIComponent("/brand/devhub-logo-mark.png"),
    );
  });
});
