import { lazy } from "@loadable/component";

// Layouts
import AuthLayout from "./layouts/Auth";
import DashboardLayout from "./layouts/Dashboard";

// Guards
import AuthGuard from "./components/guards/AuthGuard";
import GuestGuard from "./components/guards/GuestGuard";
import RootRedirect from "./components/guards/RootRedirect";

const Default = lazy(() => import("./pages/dashboard/index.tsx"));
const Cards = lazy(() => import("./pages/cards/index.tsx"));
const Expenses = lazy(() => import("./pages/expenses/index.tsx"));
const Incomes = lazy(() => import("./pages/incomes/index.tsx"));
const Investments = lazy(() => import("./pages/investments/index.tsx"));
const Taxes = lazy(() => import("./pages/taxes/index.tsx"));
const Imports = lazy(() => import("./pages/imports/index.tsx"));
const MonthlyTracking = lazy(() => import("./pages/monthly-tracking/index.tsx"));
const Settings = lazy(() => import("./pages/settings/index.tsx"));

// Auth
const Page404 = lazy(() => import("./pages/auth/Page404.tsx"));
const SignIn = lazy(() => import("./pages/auth/SignIn.tsx"));
const SignUp = lazy(() => import("./pages/auth/SignUp.tsx"));

const routes = [
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "dashboard",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Default />,
      },
    ],
  },
  {
    path: "auth",
    element: (
      <GuestGuard>
        <AuthLayout />
      </GuestGuard>
    ),
    children: [
      { path: "sign-in", element: <SignIn /> },
      { path: "sign-up", element: <SignUp /> },
    ],
  },
  {
    path: "cards",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Cards />,
      },
    ],
  },
  {
    path: "expenses",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Expenses />,
      },
    ],
  },
  {
    path: "incomes",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Incomes />,
      },
    ],
  },
  {
    path: "investments",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Investments />,
      },
    ],
  },
  {
    path: "taxes",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Taxes />,
      },
    ],
  },
  {
    path: "imports",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Imports />,
      },
    ],
  },
  {
    path: "monthly-tracking",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <MonthlyTracking />,
      },
    ],
  },
  {
    path: "settings",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "",
        element: <Settings />,
      },
    ],
  },
  {
    path: "*",
    element: <AuthLayout />,
    children: [
      {
        path: "*",
        element: <Page404 />,
      },
    ],
  },
];

export default routes;
