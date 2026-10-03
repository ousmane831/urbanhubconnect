import { createBrowserRouter, type RouteObject } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import { Forbidden, NotFound, ServerError } from "./pages/ErrorPage";
import { PageStub } from "./pages/PageStub";

type Loader = () => Promise<{ default: React.ComponentType }>;
const lazyPage = (load: Loader): Pick<RouteObject, "lazy"> => ({ lazy: async () => ({ Component: (await load()).default }) });
const lazyNamed = (load: () => Promise<Record<string, React.ComponentType>>, name: string): Pick<RouteObject, "lazy"> =>
  ({ lazy: async () => ({ Component: (await load())[name] }) });
const stub = (title: string) => ({ element: <PageStub title={title} /> });

/**
 * Pages restant à construire (lots suivants) : remplacer chaque stub() par lazyPage(() => import("./pages/…")).
 * L'ordre compte : les routes statiques sont déclarées avant les routes à paramètre (:slug).
 */
export const router = createBrowserRouter([
  { path: "coordination", ...lazyPage(() => import("./pages/Coordination")), errorElement: <ServerError /> },
  {
    
    element: <MainLayout />,
    errorElement: <ServerError />,
    children: [
      { index: true, ...lazyPage(() => import("./pages/Home")) },
      { path: "espace-membres", ...lazyPage(() => import("./pages/MembersSoon")) },
      { path: "le-reseau", ...lazyPage(() => import("./pages/Network")) },
      { path: "nos-actions", ...stub("Nos actions") },
      { path: "annuaire", ...lazyPage(() => import("./pages/Directory")) },
      { path: "annuaire/referencer", ...lazyPage(() => import("./pages/Referencer")) },
      { path: "annuaire/:slug", ...lazyPage(() => import("./pages/OrganizationDetail")) },
      { path: "cartographie", ...lazyPage(() => import("./pages/MapPage")) },
      { path: "evenements", ...lazyPage(() => import("./pages/Events")) },
      { path: "evenements/grand-week-end-du-pole-2026", ...lazyPage(() => import("./pages/GrandWeekEnd")) },
      { path: "evenements/:slug", ...lazyPage(() => import("./pages/EventDetail")) },
      { path: "adherer", ...lazyPage(() => import("./pages/Membership")) },
      { path: "partenaires", ...lazyPage(() => import("./pages/Partners")) },
      { path: "actualites", ...lazyPage(() => import("./pages/News")) },
      { path: "actualites/:slug", ...lazyPage(() => import("./pages/NewsDetail")) },
      { path: "presse", ...lazyPage(() => import("./pages/Press")) },
      { path: "contact", ...lazyPage(() => import("./pages/Contact")) },
      { path: "mentions-legales", ...lazyNamed(() => import("./pages/Legal"), "LegalNotice") },
      { path: "confidentialite", ...lazyNamed(() => import("./pages/Legal"), "PrivacyPolicy") },
      { path: "403", element: <Forbidden /> },
      { path: "500", element: <ServerError /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
