export type ProjectPreview = {
  description: string;
  likes: number;
  name: string;
  saves: number;
  technologies: readonly string[];
  thumbnail: "taskflow" | "devboard" | "codelens" | "fintrack";
};

export type DeveloperPreview = {
  avatar: string;
  description: string;
  followers: string;
  name: string;
  projects: number;
  role: string;
  technologies: readonly string[];
  username: string;
};
