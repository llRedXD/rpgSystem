import { Check } from "lucide-react";

export function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button className={checked ? "toggle active" : "toggle"} disabled={disabled} onClick={() => onChange(!checked)} type="button">
      {checked && <Check size={15} />}
      {label}
    </button>
  );
}

export function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function renderSectionContent(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.length > 0 || lines.some((item) => item.trim().length > 0))
    .map((line, index) => {
      if (line.startsWith(">")) {
        const text = line.replace(/^>\s?/, "").replace(/^\[!([^\]]+)\]-?\s*/i, "");
        return (
          <blockquote key={`${index}-${line}`} className="markdown-callout">
            {renderInlineText(text)}
          </blockquote>
        );
      }

      return <p key={`${index}-${line}`}>{renderInlineText(line)}</p>;
    });
}

function renderInlineText(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
