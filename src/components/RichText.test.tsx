/** RichText allowlist tests (FR-26): XSS payloads must never reach the DOM. */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText';

describe('RichText', () => {
  it('renders allowed markup', () => {
    render(<RichText html={'<p>Hello <strong>world</strong></p><ul><li>one</li></ul>'} />);
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
  });

  it('drops script contents entirely', () => {
    const { container } = render(
      <RichText html={'<p>before</p><script>alert("xss")</script><p>after</p>'} />,
    );
    expect(container.textContent).toContain('before');
    expect(container.textContent).toContain('after');
    expect(container.textContent).not.toContain('alert');
    expect(container.querySelector('script')).toBeNull();
  });

  it('strips event handlers and hrefs from allowed-looking tags', () => {
    const { container } = render(
      <RichText html={'<p onclick="steal()">text</p><a href="javascript:evil()">link</a>'} />,
    );
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
    expect(container.textContent).toContain('text');
    // <a> is not on the allowlist: unwrapped, its text kept, its href gone
    expect(container.textContent).toContain('link');
  });

  it('removes iframe, image and style payloads with their contents', () => {
    const { container } = render(
      <RichText
        html={
          '<iframe src="https://evil"></iframe><img src=x onerror=alert(1)><style>body{display:none}</style><p>kept</p>'
        }
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
    expect(container.textContent).not.toContain('display:none');
    expect(container.textContent).toContain('kept');
  });

  it('keeps only class from attributes', () => {
    const { container } = render(<RichText html={'<p class="note" style="color:red">x</p>'} />);
    const p = container.querySelector('p');
    expect(p).toHaveClass('note');
    expect(p).not.toHaveAttribute('style');
  });

  it('unwraps unknown containers but keeps their text', () => {
    const { container } = render(<RichText html={'<div><span>nested</span> tail</div>'} />);
    // only the prose wrapper itself is a div; the unknown container and span are gone
    expect(container.querySelectorAll('div')).toHaveLength(1);
    expect(container.querySelector('span')).toBeNull();
    expect(container.textContent).toContain('nested');
    expect(container.textContent).toContain('tail');
  });

  it('collapses headings to h4', () => {
    const { container } = render(<RichText html={'<h1>Big</h1><h2>Bigger</h2>'} />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelectorAll('h4')).toHaveLength(2);
  });
});
