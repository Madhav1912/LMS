import React from 'react';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function HighlightText({ text, query, className }) {
  const content = text ?? '';
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    return className ? <span className={className}>{content}</span> : content;
  }

  const parts = content.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi'));
  const queryLower = trimmedQuery.toLowerCase();

  const nodes = parts.map((part, index) => {
    if (part.toLowerCase() === queryLower) {
      return (
        <mark key={index} className="search-highlight">
          {part}
        </mark>
      );
    }
    return part;
  });

  return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
}
