/** Bundled destination photography (copied from reference/img by `npm run data:import`). */

import destAustralia from '../assets/img/dest-australia.webp';
import destCanada from '../assets/img/dest-canada.webp';
import destNewZealand from '../assets/img/dest-new-zealand.webp';
import destUk from '../assets/img/dest-uk.webp';
import destUsa from '../assets/img/dest-usa.webp';
import type { CountryId } from './types';

export const DEST_IMAGES: Record<CountryId, string> = {
  australia: destAustralia,
  canada: destCanada,
  'new-zealand': destNewZealand,
  uk: destUk,
  usa: destUsa,
};
