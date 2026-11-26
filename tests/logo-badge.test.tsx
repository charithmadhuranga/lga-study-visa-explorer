/** LogoBadge (FR-22): remote logo, then the crest when the image fails or is missing. */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogoBadge } from '../src/components/LogoBadge';

describe('LogoBadge', () => {
  it('shows the logo, and the initials crest if it cannot load (offline)', async () => {
    const { container } = render(
      <LogoBadge name="University of Toronto" src="https://photos.applyboard.com/t.png" />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://photos.applyboard.com/t.png');
    fireEvent.error(img as HTMLImageElement);
    expect(await screen.findByText('UT')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows the crest straight away when there is no logo URL', () => {
    render(<LogoBadge name="King's College London" src="" />);
    expect(screen.getByText('KCL')).toBeInTheDocument();
  });
});
