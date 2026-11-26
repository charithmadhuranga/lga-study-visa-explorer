/**
 * Sanitised-HTML renderer (FR-26). Content reaching this component was already passed
 * through the Rust allowlist at transform time; this is the second line of defence and
 * the only place in the app that turns markup into nodes — there is no innerHTML anywhere.
 *
 * html-react-parser's `replace` hook only overrides the default render when it returns a
 * valid React element, so: allowed tags are re-created with createElement, unknown tags are
 * unwrapped (children re-processed through the same allowlist), and dangerous elements are
 * replaced with an empty Fragment (their contents dropped).
 */

import { createElement, Fragment, useMemo, type JSX } from 'react';
import parse, {
  domToReact,
  type DOMNode,
  type Element,
  type HTMLReactParserOptions,
} from 'html-react-parser';

/** The same allowlist as `sanitize.rs` — keep the two lists in step (SPEC FR-26). */
const ALLOWED: Record<string, string> = {
  p: 'p',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  h4: 'h4',
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  br: 'br',
};

/** Headings collapse to h4, exactly like the Rust transform. */
const HEADINGS: Record<string, string> = { h1: 'h4', h2: 'h4', h3: 'h4', h5: 'h4', h6: 'h4' };

/** Elements whose entire content is dropped, not unwrapped. */
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'video', 'audio']);

const EMPTY_OK = new Set(['br']);

function isElement(node: DOMNode): node is Element {
  return 'name' in node && 'attribs' in node;
}

function isBlank(node: DOMNode): boolean {
  if (!('data' in node)) return false;
  return !String(node.data).trim();
}

function build(node: DOMNode, options: HTMLReactParserOptions): JSX.Element | null {
  // Text and comments fall through to the default renderer (text only — no attributes).
  if (!isElement(node)) return null;

  if (DROPPED.has(node.name)) return createElement(Fragment, null);

  const children = (node.children ?? []) as unknown as DOMNode[];
  const hasVisibleContent = children.some((child) =>
    isElement(child) ? !isBlank(child) || (child.children?.length ?? 0) > 0 : !isBlank(child),
  );
  if (!EMPTY_OK.has(node.name) && !hasVisibleContent) return createElement(Fragment, null);

  // Attributes are rebuilt from scratch: only `class` survives, never style/href/onclick.
  const attrs: { className?: string } = {};
  if (node.attribs?.class) attrs.className = node.attribs.class;

  const tag = ALLOWED[node.name] ?? HEADINGS[node.name];
  if (!tag) {
    // Unknown tag: unwrap, but process the children through this same allowlist.
    return createElement(Fragment, null, domToReact(children, options));
  }
  return createElement(tag, attrs, domToReact(children, options));
}

export function RichText({
  html,
  className,
}: {
  html: string;
  className?: string;
}): React.JSX.Element {
  const nodes = useMemo(() => {
    const options: HTMLReactParserOptions = {
      replace: (node) => build(node, options),
    };
    return parse(html, options);
  }, [html]);

  return <div className={className ? `prose ${className}` : 'prose'}>{nodes}</div>;
}
