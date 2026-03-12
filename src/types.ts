export interface Nominee {
  name: string;
}

export interface Category {
  id: string;
  name: string;
  nominees: string[];
}

export interface OscarsData {
  year: number;
  ceremony: string;
  categories: Category[];
}

export interface Room {
  code: string;
  adminName: string;
  adminSecret: string;
  locked: boolean;
  selectedCategories: string[]; // category IDs
  winners: Record<string, string>; // categoryId -> winning nominee
  createdAt: number;
}

export interface Participant {
  name: string;
  picks: Record<string, string>; // categoryId -> nominee name
  joinedAt: number;
}
