import type { Routes } from "@angular/router";

/**
 * Routes de l'application. En sprint S0, une seule route racine vers la page
 * d'accueil. La page de scan, le rapport et la page « Comment vérifier » sont
 * ajoutées en S3.
 */
export const APP_ROUTES: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () => import("./app.component").then((m) => m.AppComponent),
  },
];
