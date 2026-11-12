import { useMemo, useRef, useState, type ReactElement } from "react";
import katex from "katex";
import type {
  MiniLesson,
  MiniLessonBlock,
  MiniLessonBlockContentType,
  MiniLessonTextType,
} from "../../types/lesson";
import {
  FileText,
  // Image as ImageIcon,
  // Video,
  Download,
  Sparkles,
  Info,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface MiniLessonRendererProps {
  miniLesson: MiniLesson;
}

const sortBlocks = (blocks: MiniLessonBlock[]): MiniLessonBlock[] =>
  [...blocks].sort((a, b) => a.order_index - b.order_index);

const fallbackBlockFromLegacy = (lesson: MiniLesson): MiniLessonBlock => ({
  id: lesson.id,
  mini_lesson_id: lesson.id,
  content_type: (lesson.content_type as MiniLessonBlockContentType) || "text",
  text_type: lesson.text_type ?? "plain",
  content: lesson.content || lesson.content_html || "",
  media_url: lesson.media_url || null,
  media_metadata: lesson.media_metadata || null,
  order_index: lesson.order_index ?? 0,
});

const renderTextContent = (content: string) => {
  if (!content || !content.trim()) {
    return null;
  }

  // Check if content contains HTML tags
  const hasHtmlTags = /<[^>]+>/.test(content);

  if (hasHtmlTags) {
    // Render as HTML - HTML tags will be parsed and displayed properly
    return (
      <div
        className="leading-relaxed prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Render as plain text with paragraph splitting
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  return paragraphs.map((paragraph, idx) => (
    <p key={idx} className="whitespace-pre-wrap leading-relaxed">
      {paragraph}
    </p>
  ));
};

const KNOWN_TEXT_TYPES: readonly MiniLessonTextType[] = [
  "plain",
  "remember",
  "simply_put",
  "important",
  "formula",
  "link",
  "prompt",
];

// Be forgiving: a `text_type` this portal doesn't recognise (yet) renders as
// plain text rather than an empty block (see docs/STUDENT_FRONTEND_API_CHANGES.md Round 11).
const normalizeTextType = (
  textType: MiniLessonTextType | null | undefined
): MiniLessonTextType =>
  textType && (KNOWN_TEXT_TYPES as string[]).includes(textType)
    ? textType
    : "plain";

const TextBlock = ({
  block,
}: {
  block: MiniLessonBlock;
}): ReactElement | null => {
  const content = block.content || "";
  const textType = normalizeTextType(block.text_type);

  if (!content.trim()) {
    return null;
  }

  if (textType === "plain") {
    return (
      <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-200">
        {renderTextContent(content)}
      </div>
    );
  }

  if (textType === "formula") {
    try {
      const renderedFormula = katex.renderToString(content, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#cc0000",
      });

      return (
        <div
          className="overflow-x-auto rounded bg-gray-50 dark:bg-gray-800/60 px-4 py-3"
          role="math"
          aria-label="Formula"
          dangerouslySetInnerHTML={{ __html: renderedFormula }}
        />
      );
    } catch {
      return (
        <div className="text-sm text-red-700 dark:text-red-300">
          Unable to display formula.
        </div>
      );
    }
  }

  if (textType === "link") {
    return <LinkBlock content={content} mediaMetadata={block.media_metadata} />;
  }

  if (textType === "prompt") {
    return <PromptBlock content={content} />;
  }

  // Flattened per the design spec: a colored left rule + label, a restrained
  // background tint, and dark/readable body text — no rounded card, shadow,
  // or colored body text (which would hurt contrast, especially for "important").
  const accents: Record<string, { rule: string; label: string; tint: string }> = {
    remember: {
      rule: "border-emerald-400 dark:border-emerald-500",
      label: "text-emerald-700 dark:text-emerald-300",
      tint: "bg-emerald-50/60 dark:bg-emerald-900/10",
    },
    simply_put: {
      rule: "border-sky-400 dark:border-sky-500",
      label: "text-sky-700 dark:text-sky-300",
      tint: "bg-sky-50/60 dark:bg-sky-900/10",
    },
    important: {
      rule: "border-rose-400 dark:border-rose-500",
      label: "text-rose-700 dark:text-rose-300",
      tint: "bg-rose-50/60 dark:bg-rose-900/10",
    },
  };

  const iconMap: Record<MiniLessonTextType, ReactElement> = {
    remember: <Sparkles className="w-4 h-4" />,
    simply_put: <Info className="w-4 h-4" />,
    important: <AlertTriangle className="w-4 h-4" />,
    formula: <FileText className="w-4 h-4 hidden" />,
    plain: <FileText className="w-4 h-4 hidden" />,
    link: <FileText className="w-4 h-4 hidden" />,
    prompt: <FileText className="w-4 h-4 hidden" />,
  } as const;

  const titles: Record<MiniLessonTextType, string> = {
    remember: "Remember",
    simply_put: "Simply Put",
    important: "Important",
    formula: "Formula",
    plain: " ",
    link: " ",
    prompt: " ",
  } as const;

  const accent = accents[textType] ?? accents.simply_put;

  return (
    <div
      className={`border-l-4 ${accent.rule} ${accent.tint} pl-4 py-2 flex items-start gap-3`}
    >
      <span className={`mt-1 ${accent.label}`}>{iconMap[textType]}</span>
      <div className="space-y-1 text-sm">
        <p className={`font-semibold uppercase tracking-wide text-xs ${accent.label}`}>
          {titles[textType]}
        </p>
        <div className="space-y-3 text-gray-900 dark:text-gray-100">
          {renderTextContent(content)}
        </div>
      </div>
    </div>
  );
};

const getLinkLabel = (
  mediaMetadata: Record<string, unknown> | null | undefined
): string | null => {
  const label = mediaMetadata?.label;
  return typeof label === "string" && label.trim() ? label : null;
};

const LinkBlock = ({
  content,
  mediaMetadata,
}: {
  content: string;
  mediaMetadata?: Record<string, unknown> | null;
}): ReactElement => {
  const label = getLinkLabel(mediaMetadata);
  let host = content;
  try {
    host = new URL(content).host || content;
  } catch {
    // Not a parseable URL — fall back to showing the raw content as-is.
  }

  return (
    <div className="own-links">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-semibold text-azure-500 hover:text-azure-600 break-all dark:text-azure-700 dark:hover:text-azure-800"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          {label || content}
        </a>
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 break-all">
            {host}
          </span>
        )}
      </div>
    </div>
  );
};

const PromptBlock = ({ content }: { content: string }): ReactElement => {
  const [copied, setCopied] = useState(false);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        showCopied();
        return;
      }
    } catch {
      // Fall through to the select-all fallback below.
    }

    // Clipboard API unavailable (e.g. a non-HTTPS page) — select the hidden
    // textarea's text so the student can copy it with Ctrl/Cmd+C.
    const textarea = fallbackTextareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        showCopied();
      } catch {
        // Nothing more we can do — the text is at least selected for the student to copy manually.
      }
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Prompt
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-azure-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-azure-600"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800 dark:bg-gray-900/40 dark:text-gray-100">
        {content}
      </pre>
      <textarea
        ref={fallbackTextareaRef}
        value={content}
        readOnly
        aria-hidden
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
};

const ImageBlock = ({
  block,
  onPreview,
}: {
  block: MiniLessonBlock;
  onPreview: (url: string) => void;
}): ReactElement => {
  const description = block.content;

  return (
    <div>
      {block.media_url && (
        <div className="flex items-center justify-end gap-3 mb-2">
          <button
            type="button"
            onClick={() => onPreview(block.media_url as string)}
            aria-label="View larger"
            className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <a
            href={block.media_url}
            download
            aria-label="Download image"
            className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}

      {block.media_url ? (
        <div className="space-y-2">
          <img
            src={block.media_url}
            alt={description || miniLessonFallbackAlt(block)}
            className="w-full rounded-lg cursor-pointer"
            onClick={() => onPreview(block.media_url as string)}
            loading="lazy"
          />
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Image unavailable.
        </p>
      )}
    </div>
  );
};

const VideoBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => (
  <div>
    {block.media_url ? (
      <div className="space-y-2">
        <video
          controls
          className="w-full rounded-lg"
          src={block.media_url}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
        {block.content && (
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {block.content}
          </p>
        )}
      </div>
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Video unavailable.
      </p>
    )}
  </div>
);

const EmbedBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => {
  const url = block.media_url || "";
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div>
      {embedUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden">
          <iframe
            src={embedUrl}
            title="Embedded content"
            className="w-full! h-full!"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Unable to load embedded content.
        </p>
      )}
      {block.content && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {block.content}
        </p>
      )}
    </div>
  );
};

const DocumentBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => (
  <div>
    {block.media_url && (
      <div className="flex justify-end mb-2">
        <a
          href={block.media_url}
          download
          className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      </div>
    )}
    {block.media_url ? (
      <iframe
        src={block.media_url}
        title="Document viewer"
        className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700"
      />
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Document unavailable.
      </p>
    )}
    {block.content && (
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
        {block.content}
      </p>
    )}
  </div>
);

const miniLessonFallbackAlt = (block: MiniLessonBlock): string =>
  block.content?.slice(0, 120) || "Mini lesson image";

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }
  } catch {
    return null;
  }

  return url;
};

export const MiniLessonRenderer = ({ miniLesson }: MiniLessonRendererProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const blocks = useMemo(() => {
    if (miniLesson.blocks && miniLesson.blocks.length > 0) {
      return sortBlocks(miniLesson.blocks);
    }

    return [fallbackBlockFromLegacy(miniLesson)];
  }, [miniLesson]);

  const renderBlock = (block: MiniLessonBlock) => {
    switch (block.content_type) {
      case "text":
        return <TextBlock block={block} />;
      case "image":
        return (
          <ImageBlock block={block} onPreview={(url) => setPreviewImage(url)} />
        );
      case "video":
        return <VideoBlock block={block} />;
      case "embed":
        return <EmbedBlock block={block} />;
      case "document":
        return <DocumentBlock block={block} />;
      default:
        return (
          <TextBlock
            block={{ ...block, text_type: block.text_type || "plain" }}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={`${block.id}-${block.order_index}`}>{renderBlock(block)}</div>
      ))}

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="self-end mb-4 text-white/80 hover:text-white"
          >
            Close
          </button>
          <div className="w-full max-w-4xl">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="flex justify-end gap-3 mt-4">
              <a
                href={previewImage}
                download
                className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                type="button"
                onClick={() => window.open(previewImage, "_blank")}
                className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
              >
                <ExternalLink className="w-4 h-4" /> Open in new tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
