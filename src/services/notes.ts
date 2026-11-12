import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note, NoteCreate, NoteUpdate } from "../types/notes";
import { getCurrentUser } from "./auth";

// Notes are a frontend-only feature — the backend has no notes endpoint
// (confirmed with the project owner). Everything here is local to the
// device via IndexedDB; nothing is ever sent to the API.

const DB_NAME = "edulift-notes-db";
const DB_VERSION = 1;

interface NotesDB extends DBSchema {
  notes: {
    key: number;
    value: Note;
    indexes: { lesson_id: number };
  };
}

let dbPromise: Promise<IDBPDatabase<NotesDB>> | null = null;

const getDB = (): Promise<IDBPDatabase<NotesDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<NotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("lesson_id", "lesson_id");
        }
      },
    });
  }
  return dbPromise;
};

const currentUserId = (): number => {
  const user = getCurrentUser();
  const id = user?.id;
  return typeof id === "number" ? id : 0;
};

// Get the note for a lesson (there is at most one per lesson)
export const getNote = async (lessonId: number): Promise<Note | null> => {
  const db = await getDB();
  const notes = await db.getAllFromIndex("notes", "lesson_id", lessonId);
  return notes[0] ?? null;
};

// Create a new note for a lesson
export const saveNote = async (noteData: NoteCreate): Promise<Note> => {
  const db = await getDB();
  const note: Note = {
    id: Date.now(),
    user_id: currentUserId(),
    lesson_id: noteData.lesson_id,
    content: noteData.content,
    updated_at: new Date().toISOString(),
  };
  await db.put("notes", note);
  return note;
};

// Update an existing note
export const updateNote = async (noteData: NoteUpdate): Promise<Note> => {
  const db = await getDB();
  const existing = await db.get("notes", noteData.id);

  const note: Note = {
    id: noteData.id,
    user_id: existing?.user_id ?? currentUserId(),
    lesson_id: existing?.lesson_id ?? 0,
    content: noteData.content,
    updated_at: new Date().toISOString(),
  };
  await db.put("notes", note);
  return note;
};

// Delete a note
export const deleteNote = async (id: number): Promise<void> => {
  const db = await getDB();
  await db.delete("notes", id);
};

// Download note as text
export const downloadNoteAsText = (
  content: string,
  filename: string = "notes.txt"
) => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Download note as PDF (simplified - basic implementation)
export const downloadNoteAsPDF = (
  content: string,
  filename: string = "notes.pdf"
) => {
  // For now, just download as text
  // In production, you would use a library like jsPDF or pdf.js
  downloadNoteAsText(content, filename.replace(".pdf", ".txt"));
};
