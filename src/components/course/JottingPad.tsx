import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Save, FileText } from "lucide-react";
import {
  saveNote,
  getNote,
  updateNote,
  downloadNoteAsText,
  downloadNoteAsPDF,
} from "../../services/notes";

interface JottingPadProps {
  lessonId: number;
  initialContent?: string;
}

export const JottingPad = ({ lessonId, initialContent }: JottingPadProps) => {
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing note
  useEffect(() => {
    const loadNote = async () => {
      try {
        const note = await getNote(lessonId);
        if (note) {
          setContent(note.content);
          setNoteId(note.id);
        }
      } catch (error) {
        console.error("Failed to load note:", error);
      }
    };

    loadNote();
  }, [lessonId]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (noteId) {
        await updateNote({ id: noteId, content });
      } else {
        const note = await saveNote({ lesson_id: lessonId, content });
        setNoteId(note.id);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, lessonId, content]);

  // Auto-save with debounce
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      if (content.trim()) {
        handleSave();
      }
    }, 2000); // 2 second debounce

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [content, handleSave]);

  const handleDownload = (format: "txt" | "pdf") => {
    if (format === "txt") {
      downloadNoteAsText(content, `lesson-${lessonId}-notes.txt`);
    } else {
      downloadNoteAsPDF(content, `lesson-${lessonId}-notes.pdf`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-azure-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notes
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Saving...
            </span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Save notes"
          >
            <Save className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your notes here...&#10;&#10;Tip: Your notes are automatically saved every 2 seconds."
          className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
          style={{ minHeight: "200px" }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {content.length} characters
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => handleDownload("txt")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            TXT
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
};
