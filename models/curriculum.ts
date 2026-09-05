export interface Subject {
  id: string;
  committeeId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface CurriculumListOptions {
  limit?: number;
  offset?: number;
}
