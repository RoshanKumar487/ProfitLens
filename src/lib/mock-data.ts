
import type { UserProfile } from '@/contexts/AuthContext';
import type { InvoiceSettings } from '@/app/settings/actions';

// Interface definitions
export interface EmployeeDisplay {
  id: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  profilePictureUrl?: string;
}

export interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
}

export interface FullInvoiceDisplay extends InvoiceDisplay {
    clientEmail?: string;
    clientAddress?: string;
    clientGstin?: string;
    subtotal: number;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    items: InvoiceItem[];
    notes?: string;
    isRcmApplicable?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnNo?: string;
  quantity: number;
  unitPrice: number;
  customFields?: { [key: string]: string };
}

export interface CompanyDetailsFirestore {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  gstin: string;
  pan?: string;
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

export interface RecentActivity {
  id: string;
  type: 'invoice' | 'expense';
  description: string;
  amount: number;
  date: Date;
  status?: string;
}

export interface Expense {
  id?: string;
  date: string; // Stored as YYYY-MM-DD string
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

export interface RevenueEntryDisplay {
    id: string;
    date: string;
    amount: number;
    source: string;
    description?: string;
}


// Mock Data
export const MOCK_USER: UserProfile = {
  uid: 'mock-user-123',
  email: 'user@example.com',
  displayName: 'Demo User',
  companyId: 'mock-company-123',
  companyName: 'Demo Company Inc.',
  role: 'admin',
  isSuperAdmin: true,
  country: 'US',
  publicCompanyId: 'pub-mock-abc-789',
};


export const MOCK_REQUESTS = [
    { id: 'req1', userId: 'user1', userName: 'Alice Johnson', userEmail: 'alice@example.com', createdAt: new Date(), status: 'pending' as const },
    { id: 'req2', userId: 'user2', userName: 'Bob Williams', userEmail: 'bob@example.com', createdAt: new Date(Date.now() - 86400000), status: 'approved' as const },
];

export const MOCK_USERS = [
    { id: 'user1', displayName: 'Alice Johnson', email: 'alice@example.com', role: 'pending' as const },
    { id: 'user2', displayName: 'Bob Williams', email: 'bob@example.com', role: 'member' as const },
    { id: 'user3', displayName: 'Demo User', email: 'user@example.com', role: 'admin' as const },
];

export const MOCK_ACCOUNTS = [
    { id: 'acc1', bankName: 'Global Bank', accountNumberLast4: '1234', balance: 50250.75, accountType: 'checking' as const },
    { id: 'acc2', bankName: 'National Savings', accountNumberLast4: '5678', balance: 125000.00, accountType: 'savings' as const },
];

export const MOCK_TRANSACTIONS = [
    { id: 'tx1', date: 'Jul 20, 2024', description: 'Monthly Server Costs', category: 'Software', amount: 150.00, type: 'withdrawal' as const },
    { id: 'tx2', date: 'Jul 19, 2024', description: 'Client Payment', category: 'Sales', amount: 5000.00, type: 'deposit' as const },
];

export const MOCK_RECENT_ACTIVITY: RecentActivity[] = [
    { id: '1', type: 'invoice', description: 'Invoice #INV001 to Acme Corp', amount: 5000, date: new Date(), status: 'Paid'},
    { id: '2', type: 'expense', description: 'Office Supplies', amount: 150, date: new Date(), status: 'Expense'},
];

export const MOCK_EMPLOYEES: EmployeeDisplay[] = [
    { id: '1', name: 'Alice Johnson', position: 'Software Engineer', salary: 95000, description: 'Frontend specialist' },
    { id: '2', name: 'Bob Williams', position: 'Project Manager', salary: 110000, description: 'Leads the core product team' },
    { id: '3', name: 'Charlie Brown', position: 'UX/UI Designer', salary: 85000, description: 'Focuses on mobile application design' },
];

export const MOCK_INVOICES: InvoiceDisplay[] = [
    { id: '1', invoiceNumber: 'INV001', clientName: 'Acme Corp', amount: 2500, dueDate: new Date(), status: 'Paid', issuedDate: new Date(Date.now() - 10 * 86400000) },
    { id: '2', invoiceNumber: 'INV002', clientName: 'Stark Industries', amount: 8000, dueDate: new Date(Date.now() + 15 * 86400000), status: 'Pending', issuedDate: new Date(Date.now() - 5 * 86400000) },
    { id: '3', invoiceNumber: 'INV003', clientName: 'Wayne Enterprises', amount: 12000, dueDate: new Date(Date.now() - 5 * 86400000), status: 'Overdue', issuedDate: new Date(Date.now() - 35 * 86400000) },
];

export const MOCK_FULL_INVOICE: FullInvoiceDisplay = {
    id: '1',
    invoiceNumber: 'INV001',
    clientName: 'Acme Corp',
    clientAddress: '123 Main St\nAnytown, USA 12345',
    clientEmail: 'contact@acme.com',
    status: 'Paid',
    issuedDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    items: [
        { id: 'item1', description: 'Premium Web Development', quantity: 1, unitPrice: 2000, hsnNo: '998314' },
        { id: 'item2', description: 'Logo Design & Branding', quantity: 1, unitPrice: 500, hsnNo: '998313' },
    ],
    subtotal: 2500,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    taxRate: 10,
    taxAmount: 250,
    amount: 2750,
    notes: 'Thank you for your business!',
    isRcmApplicable: false,
};

export const MOCK_COMPANY_PROFILE: CompanyDetailsFirestore = {
    name: 'Demo Company Inc.',
    address: '456 Business Ave',
    city: 'Metropolis',
    state: 'CA',
    country: 'USA',
    gstin: '1234567890ABC',
    phone: '555-123-4567',
    email: 'billing@demo.com',
    website: 'demo.com',
    accountNumber: '1234567890',
    ifscCode: 'DEMO0001234',
    bankName: 'Global Bank',
    branch: 'Main Branch'
};

export const MOCK_INVOICE_SETTINGS: InvoiceSettings = {
    customItemColumns: [{id: 'col1', label: 'S/N'}],
    defaultHsnCode: '',
    defaultNotes: 'Thank you for your business.',
    defaultPaymentTermsDays: 30
};

export const MOCK_EXPENSES: Expense[] = [
    { id: '1', date: '2024-07-28', amount: 55.00, category: 'Office Supplies', vendor: 'Staples', description: 'Printer paper and pens' },
    { id: '2', date: '2024-07-27', amount: 1500.00, category: 'Salary / Advance', employeeName: 'Alice Johnson', description: 'Salary advance for July' },
    { id: '3', date: '2024-07-25', amount: 250.00, category: 'Software & Subscriptions', vendor: 'Figma', description: 'Monthly subscription' },
];

export const MOCK_REVENUE: RevenueEntryDisplay[] = [
    { id: '1', date: '2024-07-28', amount: 5000, source: 'Client Payment', description: 'Milestone 2 for Project X' },
    { id: '2', date: '2024-07-26', amount: 1200, source: 'Product Sales', description: 'Online store sales' },
];

export const MOCK_COMPANIES = [
    { id: 'comp1', name: 'Demo Company Inc.', email: 'user@example.com', createdAt: new Date() },
    { id: 'comp2', name: 'Innovate LLC', email: 'innovate@example.com', createdAt: new Date(Date.now() - 86400000 * 5) },
];

export const MOCK_SUPER_ADMIN_EMPLOYEES = [
    { id: 'emp1', name: 'Alice Johnson', position: 'Developer', companyName: 'Demo Company Inc.', createdAt: new Date() },
    { id: 'emp2', name: 'Bob Williams', position: 'Designer', companyName: 'Innovate LLC', createdAt: new Date(Date.now() - 86400000 * 2) },
];
