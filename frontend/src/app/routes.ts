import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { LandingPage } from './components/LandingPage';
import { DashboardApp } from './components/DashboardApp';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { TermsOfService } from './components/TermsOfService';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { AdminDashboard } from './components/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      { path: 'terms', Component: TermsOfService },
      { path: 'privacy', Component: PrivacyPolicy },
      { path: 'app', Component: DashboardApp },
      { path: 'admin', Component: AdminDashboard },
      { path: '*', Component: LandingPage },
    ],
  },
]);