/**
 * Hash router (SPEC §6). Hash-based URLs are mandatory: the document path never changes,
 * which is what keeps `base: './'` asset URLs working under the Tauri custom protocol.
 * Screens are registered here and nowhere else (AGENTS §5).
 */

import { createHashRouter } from 'react-router-dom';
import App from './App';
import { Welcome } from './screens/Welcome';
import { Destinations } from './screens/Destinations';
import { Country } from './screens/Country';
import { University } from './screens/University';
import { Course } from './screens/Course';
import { CourseFinder } from './screens/CourseFinder';
import { Services } from './screens/Services';
import { Journey } from './screens/Journey';
import { Shortlist } from './screens/Shortlist';
import { RouteError } from './screens/RouteError';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        // Pathless boundary: a failing screen shows RouteError inside the app shell, so the
        // top bar (and the way out) stays on screen.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Welcome /> },
          // SPEC §6 names the route `#/welcome`; the index route covers `#/` (idle reset target).
          { path: 'welcome', element: <Welcome /> },
          { path: 'destinations', element: <Destinations /> },
          { path: 'c/:countryId', element: <Country /> },
          { path: 'u/:universityId', element: <University /> },
          { path: 'k/:courseKey', element: <Course /> },
          { path: 'finder', element: <CourseFinder /> },
          { path: 'services', element: <Services /> },
          { path: 'journey', element: <Journey /> },
          { path: 'shortlist', element: <Shortlist /> },
          { path: '*', element: <Destinations /> },
        ],
      },
    ],
  },
]);
