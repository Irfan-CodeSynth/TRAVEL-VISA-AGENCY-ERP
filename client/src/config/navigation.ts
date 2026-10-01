import { LucideIcon, Home, Users, Briefcase, FileText, Globe, Plane, PlaneTakeoff, Ticket, Building, Box, Calendar, DollarSign, FileSignature, CreditCard, Receipt, HandCoins, Users2, Shield, MessageSquare, PieChart, Bot, Settings, ListTodo, Luggage, FolderOpen, Truck, UserCog } from 'lucide-react';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  permission?: string;
  children?: NavItem[];
}

export const navigationData: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', icon: Home, path: '/dashboard' },
    ],
  },
  {
    section: 'CRM',
    items: [
      { label: 'Leads', icon: Users, path: '/crm/leads', permission: 'leads.view' },
      { label: 'Customers', icon: Briefcase, path: '/crm/customers', permission: 'customers.view' },
      { label: 'Follow-ups', icon: ListTodo, path: '/crm/follow-ups', permission: 'follow_ups.view' },
    ],
  },
  {
    section: 'Visa',
    items: [
      { label: 'Applications', icon: FileText, path: '/visa/applications', permission: 'applications.view' },
      { label: 'Countries', icon: Globe, path: '/visa/countries', permission: 'visa.view' },
      { label: 'Visa Types', icon: FileSignature, path: '/visa/types', permission: 'visa.view' },
      { label: 'Appointments', icon: Calendar, path: '/visa/appointments', permission: 'appointments.view' },
    ],
  },
  {
    section: 'Travel',
    items: [
      { label: 'Bookings', icon: Luggage, path: '/travel/bookings', permission: 'bookings.view' },
      { label: 'Ticket Counter', icon: PlaneTakeoff, path: '/travel/tickets', permission: 'flights.view' },
      { label: 'Agency Fares', icon: Ticket, path: '/travel/fares', permission: 'flights.view' },
      { label: 'Flights', icon: Plane, path: '/travel/flights', permission: 'flights.view' },
      { label: 'Hotels', icon: Building, path: '/travel/hotels', permission: 'hotels.view' },
      { label: 'Packages', icon: Box, path: '/travel/packages', permission: 'packages.view' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Quotations', icon: FileText, path: '/finance/quotations', permission: 'quotations.view' },
      { label: 'Invoices', icon: Receipt, path: '/finance/invoices', permission: 'invoices.view' },
      { label: 'Payments', icon: CreditCard, path: '/finance/payments', permission: 'payments.view' },
      { label: 'Expenses', icon: DollarSign, path: '/finance/expenses', permission: 'expenses.view' },
      { label: 'Commissions', icon: HandCoins, path: '/finance/commissions', permission: 'commissions.view' },
    ],
  },
  {
    section: 'Partners',
    items: [
      { label: 'Suppliers', icon: Truck, path: '/partners/suppliers', permission: 'suppliers.view' },
      { label: 'Agents', icon: UserCog, path: '/partners/agents', permission: 'agents.view' },
    ],
  },
  {
    section: 'Documents & Comms',
    items: [
      { label: 'Documents', icon: FolderOpen, path: '/documents', permission: 'documents.view' },
      { label: 'Communications', icon: MessageSquare, path: '/communications', permission: 'communications.view' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { label: 'Reports', icon: PieChart, path: '/reports', permission: 'reports.view' },
      { label: 'AI Insights', icon: Bot, path: '/ai', permission: 'ai.use' },
    ],
  },
  {
    section: 'Team',
    items: [
      { label: 'Employees', icon: Users2, path: '/team/employees', permission: 'users.view' },
      { label: 'Roles', icon: Shield, path: '/team/roles', permission: 'roles.view' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'Settings', icon: Settings, path: '/settings', permission: 'settings.view' },
    ],
  }
];
