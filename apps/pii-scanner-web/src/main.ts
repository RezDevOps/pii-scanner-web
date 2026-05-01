import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  // Pas de remontée distante : la CSP interdit tout `connect-src`. On affiche
  // l'erreur dans la console pour qu'un utilisateur ouvrant DevTools la voie.
  // eslint-disable-next-line no-console
  console.error("[pii-scanner-web] échec du bootstrap", err);
});
