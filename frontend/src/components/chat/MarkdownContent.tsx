import React, { useState } from "react";
import { Check, Copy, Terminal, Code2 } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Split content by code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let blockKey = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(
        <TextSection key={`text-${blockKey++}`} text={textBefore} />
      );
    }

    const language = match[1] || "code";
    const code = match[2];
    parts.push(
      <CodeSnippet key={`code-${blockKey++}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(
      <TextSection key={`text-${blockKey++}`} text={remainingText} />
    );
  }

  return (
    <div className={`space-y-3 leading-relaxed text-text-main text-xs sm:text-sm font-sans ${className}`}>
      {parts}
    </div>
  );
};

interface CodeSnippetProps {
  language: string;
  code: string;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-surface-border bg-surface-card/90 overflow-hidden shadow-md font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-subtle/80 border-b border-surface-border text-text-muted">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-brand-orange">
          <Terminal className="w-3.5 h-3.5" />
          <span>{language || "code"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-surface-main text-text-muted hover:text-text-main transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-status-positive" />
              <span className="text-status-positive font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-text-main bg-black/30 font-mono text-xs leading-relaxed scrollbar-thin">
        <pre>
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
};

interface TextSectionProps {
  text: string;
}

const TextSection: React.FC<TextSectionProps> = ({ text }) => {
  // Split by line to format headings, bullet points, numbered lists, tables, and paragraphs
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let isNumberedList = false;
  let tableRows: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={key} className="list-decimal list-inside space-y-1 my-1.5 pl-1.5">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-text-main">
                <InlineFormatted text={item} />
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={key} className="space-y-1.5 my-1.5 pl-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-brand-orange text-xs mt-0.5 leading-none">•</span>
                <span className="flex-1 text-text-main">
                  <InlineFormatted text={item} />
                </span>
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
    }
  };

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-surface-border">
          <table className="min-w-full text-left text-xs divide-y divide-surface-border">
            {tableRows.map((row, rIdx) => {
              const cells = row.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
              if (row.includes("---")) return null; // Separator row
              const isHeader = rIdx === 0;
              return (
                <tr key={rIdx} className={isHeader ? "bg-surface-subtle font-semibold" : "even:bg-surface-subtle/30"}>
                  {cells.map((cell, cIdx) => {
                    const CellTag = isHeader ? "th" : "td";
                    return (
                      <CellTag key={cIdx} className="px-3 py-2 text-text-main whitespace-nowrap">
                        <InlineFormatted text={cell.trim()} />
                      </CellTag>
                    );
                  })}
                </tr>
              );
            })}
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check table row: | col1 | col2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList(`list-before-table-${index}`);
      tableRows.push(trimmed);
      return;
    } else if (tableRows.length > 0) {
      flushTable(`table-${index}`);
    }

    // Check headings
    if (trimmed.startsWith("### ")) {
      flushList(`list-before-h3-${index}`);
      elements.push(
        <h4 key={`h3-${index}`} className="text-sm sm:text-base font-bold text-text-main mt-3 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 rounded-full bg-brand-orange inline-block" />
          <InlineFormatted text={trimmed.substring(4)} />
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(`list-before-h2-${index}`);
      elements.push(
        <h3 key={`h2-${index}`} className="text-base sm:text-lg font-bold text-text-main mt-4 mb-1.5 pb-1 border-b border-surface-border/60">
          <InlineFormatted text={trimmed.substring(3)} />
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushList(`list-before-h1-${index}`);
      elements.push(
        <h2 key={`h1-${index}`} className="text-lg sm:text-xl font-extrabold text-text-main mt-4 mb-2">
          <InlineFormatted text={trimmed.substring(2)} />
        </h2>
      );
      return;
    }

    // Check Bullet items: "- ", "* ", "• "
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (isNumberedList && listItems.length > 0) {
        flushList(`num-before-bullet-${index}`);
      }
      isNumberedList = false;
      listItems.push(bulletMatch[1]);
      return;
    }

    // Check Numbered items: "1. ", "2. "
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberMatch) {
      if (!isNumberedList && listItems.length > 0) {
        flushList(`bullet-before-num-${index}`);
      }
      isNumberedList = true;
      listItems.push(numberMatch[2]);
      return;
    }

    // Regular line / empty line
    if (!trimmed) {
      flushList(`list-end-${index}`);
      elements.push(<div key={`empty-${index}`} className="h-1.5" />);
      return;
    }

    flushList(`list-before-p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-text-main leading-relaxed">
        <InlineFormatted text={trimmed} />
      </p>
    );
  });

  flushList(`list-final`);
  flushTable(`table-final`);

  return <>{elements}</>;
};

/**
 * Parses inline formatting:
 * - Bold: `**text**`
 * - Math: `$$...$$` or `$...$`
 * - Inline code: `` `code` ``
 * - Italic: `*text*`
 */
const InlineFormatted: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Regex to split by inline code, bold, math
  const tokens = text.split(/(\*\*.*?\*\*|\$.*?\$|`.*?`)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith("**") && token.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-text-main">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith("`") && token.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-surface-subtle text-brand-orange font-mono text-[11px] border border-surface-border/80"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        if (token.startsWith("$") && token.endsWith("$")) {
          const formula = token.startsWith("$$") ? token.slice(2, -2) : token.slice(1, -1);
          return (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-brand-orange/10 text-brand-orange font-mono text-[11px] border border-brand-orange/20"
              title="Mathematical Formula"
            >
              {formula}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
};
