import { CopyOutlined } from "@ant-design/icons";
import { App as AntApp, Button, Typography } from "antd";
import { useI18n } from "../i18n";

export type CodeLanguage = "javascript" | "json" | "html" | "shell" | "text";

type CodeBlockProps = {
  value: string;
  title?: string;
  language?: CodeLanguage;
  copyText?: string;
  maxHeight?: number;
};

export function CodeBlock({ value, title, language = "text", copyText, maxHeight = 520 }: CodeBlockProps) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {title ? <Typography.Text type="secondary">{title}</Typography.Text> : <span />}
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={async () => {
            await navigator.clipboard.writeText(copyText ?? value);
            message.success(t("common.copied"));
          }}
        >
          {t("common.copy")}
        </Button>
      </div>
      <div
        className="overflow-auto rounded-md border border-slate-700 bg-slate-950 text-[13px] leading-6 shadow-inner"
        style={{ maxHeight }}
      >
        <pre className="m-0 min-w-max p-4 font-mono text-slate-100">
          <code>{highlightCode(value, language)}</code>
        </pre>
      </div>
    </div>
  );
}

function highlightCode(code: string, language: CodeLanguage) {
  const lines = code.split("\n");

  return lines.map((line, lineIndex) => (
    <span key={lineIndex}>
      {tokenizeLine(line, language).map((token, tokenIndex) => (
        <span key={tokenIndex} className={token.className}>
          {token.text}
        </span>
      ))}
      {lineIndex < lines.length - 1 ? "\n" : null}
    </span>
  ));
}

function tokenizeLine(line: string, language: CodeLanguage) {
  switch (language) {
    case "javascript":
      return tokenizeWithPattern(
        line,
        /(\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:async|await|const|let|var|export|import|from|function|if|else|return|throw|new|try|catch|finally|class|extends)\b|\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*(?=\s*\())/g,
        getJavaScriptTokenClassName
      );
    case "json":
      return tokenizeWithPattern(
        line,
        /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,
        (token, match) => {
          if (match[2]) {
            return "text-sky-300";
          }
          return getLiteralTokenClassName(token);
        }
      );
    case "html":
      return tokenizeWithPattern(
        line,
        /(<!--.*?-->|<\/?[A-Za-z][\w:-]*|\/?>|[A-Za-z_:][\w:.-]*(?==)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
        getHtmlTokenClassName
      );
    case "shell":
      return tokenizeWithPattern(
        line,
        /(#.*|\b(?:curl|pnpm|npm|node|npx|git)\b|-[A-Za-z-]+|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\\$|https?:\/\/[^\s']+)/g,
        getShellTokenClassName
      );
    default:
      return [{ text: line }];
  }
}

function tokenizeWithPattern(
  line: string,
  tokenPattern: RegExp,
  getClassName: (token: string, match: RegExpExecArray) => string | undefined
) {
  const tokens: Array<{ text: string; className?: string }> = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(line))) {
    if (match.index > cursor) {
      tokens.push({ text: line.slice(cursor, match.index) });
    }
    tokens.push({ text: match[0], className: getClassName(match[0], match) });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    tokens.push({ text: line.slice(cursor) });
  }

  return tokens;
}

function getJavaScriptTokenClassName(token: string) {
  if (token.startsWith("//")) {
    return "text-slate-500";
  }
  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
    return "text-emerald-300";
  }
  if (/^\d/.test(token)) {
    return "text-amber-300";
  }
  if (/^(true|false|null|undefined)$/.test(token)) {
    return "text-violet-300";
  }
  if (/^(async|await|const|let|var|export|import|from|function|if|else|return|throw|new|try|catch|finally|class|extends)$/.test(token)) {
    return "text-sky-300";
  }
  return "text-yellow-200";
}

function getLiteralTokenClassName(token: string) {
  if (token.startsWith('"') || token.startsWith("'")) {
    return "text-emerald-300";
  }
  if (/^-?\d/.test(token)) {
    return "text-amber-300";
  }
  if (/^(true|false|null)$/.test(token)) {
    return "text-violet-300";
  }
  return undefined;
}

function getHtmlTokenClassName(token: string) {
  if (token.startsWith("<!--")) {
    return "text-slate-500";
  }
  if (token.startsWith("<")) {
    return "text-sky-300";
  }
  if (token === ">" || token === "/>") {
    return "text-slate-300";
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    return "text-emerald-300";
  }
  return "text-yellow-200";
}

function getShellTokenClassName(token: string) {
  if (token.startsWith("#")) {
    return "text-slate-500";
  }
  if (token.startsWith("'") || token.startsWith('"')) {
    return "text-emerald-300";
  }
  if (token.startsWith("-")) {
    return "text-sky-300";
  }
  if (token === "\\") {
    return "text-slate-400";
  }
  if (token.startsWith("http")) {
    return "text-amber-300";
  }
  return "text-yellow-200";
}
