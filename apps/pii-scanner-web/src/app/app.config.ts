import {
  type ApplicationConfig,
  provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

import { APP_ROUTES } from "./app.routes";
import { provideMaterialIcons } from "./icons/icon-registry";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES),
    provideAnimationsAsync(),
    // Enregistre les SVG Material Symbols inline (cf. icons/icon-registry.ts).
    // Inline plutôt que fetch pour préserver `connect-src 'none'` de la CSP.
    provideMaterialIcons(),
  ],
};
