export interface Note {
  id: number;
  user_id: number;
  lesson_id: number;
  content: string;
  updated_at: string;
}

export interface NoteCreate {
  lesson_id: number;
  content: string;
}

export interface NoteUpdate {
  id: number;
  content: string;
}
