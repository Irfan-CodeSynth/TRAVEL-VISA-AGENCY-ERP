import React from 'react';
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/app-shell';
import { AuthProvider } from './features/auth/hooks/use-auth';
import { LoginPage } from './features/auth/components/login-page';
import { ForgotPasswordPage } from './features/auth/components/forgot-password-page';
import { CommandPalette } from './components/shared/command-palette';

// Lazy loaded feature pages
const DashboardPage = React.lazy(() => import('./features/dashboard/components/dashboard-page').then(m => ({ default: m.DashboardPage })));
const EmployeesPage = React.lazy(() => import('./features/team/employees/components/employees-page').then(m => ({ default: m.EmployeesPage })));
const RolesPage = React.lazy(() => import('./features/team/roles/components/roles-page').then(m => ({ default: m.RolesPage })));
const SettingsPage = React.lazy(() => import('./features/settings/components/settings-page').then(m => ({ default: m.SettingsPage })));

// Lazy loaded placeholders
const LeadsPage = React.lazy(() => import('./features/crm/leads/components/leads-page'));
const CustomersPage = React.lazy(() => import('./features/crm/customers/components/customers-page'));
const CustomerDetailPage = React.lazy(() => import('./features/crm/customers/components/customer-detail-page'));
const FollowUpsPage = React.lazy(() => import('./features/crm/follow-ups/components/follow-ups-page'));
const ApplicationsPage = React.lazy(() => import('./features/visa/applications/components/applications-page'));
const ApplicationDetailPage = React.lazy(() => import('./features/visa/applications/components/application-detail-page'));
const CountriesPage = React.lazy(() => import('./features/visa/countries/components/countries-page'));
const VisaTypesPage = React.lazy(() => import('./features/visa/visa-types/components/visa-types-page'));
const AppointmentsPage = React.lazy(() => import('./features/visa/appointments/components/appointments-page'));
const DocumentsPage = React.lazy(() => import('./features/documents/components/documents-page'));
const FlightsPage = React.lazy(() => import('./features/travel/flights/components/flights-page'));
const FaresPage = React.lazy(() => import('./features/travel/fares/components/fares-page'));
const TicketsPage = React.lazy(() => import('./features/travel/tickets/components/tickets-page'));
const HotelsPage = React.lazy(() => import('./features/travel/hotels/components/hotels-page'));
const PackagesPage = React.lazy(() => import('./features/travel/packages/components/packages-page'));
const BookingsPage = React.lazy(() => import('./features/travel/bookings/components/bookings-page'));
const BookingDetailPage = React.lazy(() => import('./features/travel/bookings/components/booking-detail-page'));
const QuotationsPage = React.lazy(() => import('./features/finance/quotations/components/quotations-page'));
const QuotationDetailPage = React.lazy(() => import('./features/finance/quotations/components/quotation-detail-page'));
const InvoicesPage = React.lazy(() => import('./features/finance/invoices/components/invoices-page'));
const InvoiceDetailPage = React.lazy(() => import('./features/finance/invoices/components/invoice-detail-page'));
const PaymentsPage = React.lazy(() => import('./features/finance/payments/components/payments-page'));
const ExpensesPage = React.lazy(() => import('./features/finance/expenses/components/expenses-page'));
const CommissionsPage = React.lazy(() => import('./features/finance/commissions/components/commissions-page'));
const SuppliersPage = React.lazy(() => import('./features/partners/suppliers/components/suppliers-page'));
const AgentsPage = React.lazy(() => import('./features/partners/agents/components/agents-page'));
const CommunicationsPage = React.lazy(() => import('./features/communications/components/communications-page'));
const ReportsPage = React.lazy(() => import('./features/reports/components/reports-page'));
const AIPage = React.lazy(() => import('./features/ai/components/ai-page'));
const NotFoundPage = React.lazy(() => import('./features/common/components/not-found-page'));

const RootLayout = () => (
  <AuthProvider>
    <Outlet />
    <CommandPalette />
  </AuthProvider>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          { path: 'dashboard', element: <DashboardPage /> },
          // CRM
          { path: 'crm/leads', element: <LeadsPage /> },
          { path: 'crm/customers', element: <CustomersPage /> },
          { path: 'crm/customers/:id', element: <CustomerDetailPage /> },
          { path: 'crm/follow-ups', element: <FollowUpsPage /> },
          // Visa
          { path: 'visa/applications', element: <ApplicationsPage /> },
          { path: 'visa/applications/:id', element: <ApplicationDetailPage /> },
          { path: 'visa/countries', element: <CountriesPage /> },
          { path: 'visa/types', element: <VisaTypesPage /> },
          { path: 'visa/appointments', element: <AppointmentsPage /> },
          // Travel
          { path: 'travel/flights', element: <FlightsPage /> },
          { path: 'travel/fares', element: <FaresPage /> },
          { path: 'travel/tickets', element: <TicketsPage /> },
          { path: 'travel/hotels', element: <HotelsPage /> },
          { path: 'travel/packages', element: <PackagesPage /> },
          { path: 'travel/bookings', element: <BookingsPage /> },
          { path: 'travel/bookings/:id', element: <BookingDetailPage /> },
          // Finance
          { path: 'finance/quotations', element: <QuotationsPage /> },
          { path: 'finance/quotations/:id', element: <QuotationDetailPage /> },
          { path: 'finance/invoices', element: <InvoicesPage /> },
          { path: 'finance/invoices/:id', element: <InvoiceDetailPage /> },
          { path: 'finance/payments', element: <PaymentsPage /> },
          { path: 'finance/expenses', element: <ExpensesPage /> },
          { path: 'finance/commissions', element: <CommissionsPage /> },
          // Partners
          { path: 'partners/suppliers', element: <SuppliersPage /> },
          { path: 'partners/agents', element: <AgentsPage /> },
          // Team
          { path: 'team/employees', element: <EmployeesPage /> },
          { path: 'team/roles', element: <RolesPage /> },
          // Misc
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'communications', element: <CommunicationsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'ai', element: <AIPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
