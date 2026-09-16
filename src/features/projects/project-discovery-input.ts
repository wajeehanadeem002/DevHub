export const PROJECT_DISCOVERY_PAGE_SIZE = 12;

export type ProjectDiscoverySort = "newest" | "popular";

export type ProjectDiscoverySearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ProjectDiscoveryFilters = {
  category: string | null;
  page: number;
  q: string;
  sort: ProjectDiscoverySort;
  technology: string | null;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseSlug(value: string | string[] | undefined) {
  const normalizedValue = firstValue(value)?.trim() ?? "";
  return slugPattern.test(normalizedValue) ? normalizedValue : null;
}

function parsePage(value: string | string[] | undefined) {
  const normalizedValue = firstValue(value)?.trim() ?? "";
  if (!/^\d+$/.test(normalizedValue)) {
    return 1;
  }

  const page = Number(normalizedValue);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseProjectDiscoveryFilters(
  searchParams: ProjectDiscoverySearchParams,
): ProjectDiscoveryFilters {
  const search = firstValue(searchParams.q)?.trim().slice(0, 100) ?? "";
  const sort =
    firstValue(searchParams.sort) === "popular" ? "popular" : "newest";

  return {
    category: parseSlug(searchParams.category),
    page: parsePage(searchParams.page),
    q: search,
    sort,
    technology: parseSlug(searchParams.technology),
  };
}

export function buildProjectDiscoveryHref(
  filters: ProjectDiscoveryFilters,
  changes: Partial<ProjectDiscoveryFilters> = {},
) {
  const nextFilters = { ...filters, ...changes };
  const searchParams = new URLSearchParams();

  if (nextFilters.q) {
    searchParams.set("q", nextFilters.q);
  }
  if (nextFilters.category) {
    searchParams.set("category", nextFilters.category);
  }
  if (nextFilters.technology) {
    searchParams.set("technology", nextFilters.technology);
  }
  if (nextFilters.sort === "popular") {
    searchParams.set("sort", nextFilters.sort);
  }
  if (nextFilters.page > 1) {
    searchParams.set("page", String(nextFilters.page));
  }

  const query = searchParams.toString();
  return query ? `/projects?${query}` : "/projects";
}
