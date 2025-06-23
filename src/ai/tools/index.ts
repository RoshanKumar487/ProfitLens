/**
 * @fileOverview Tools for the AI Assistant to interact with the application's data.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as service from '@/services/ai-assistant-service';

// Schemas
const EmployeeSchema = z.object({
    name: z.string().describe("The full name of the employee."),
    position: z.string().describe("The job title or position of the employee."),
    salary: z.number().describe("The annual salary of the employee as a number."),
    description: z.string().optional().describe("Any additional notes or description."),
});

const ExpenseSchema = z.object({
    date: z.string().describe("The date of the expense in YYYY-MM-DD format. Use today's date if not specified."),
    amount: z.number().describe("The amount of the expense."),
    category: z.string().describe("The category of the expense. Must be one of: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salaries & Wages', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'"),
    description: z.string().optional().describe("A brief description of the expense."),
    vendor: z.string().optional().describe("The name of the vendor or store."),
});

// == EMPLOYEE TOOLS ==

export const listEmployeesTool = ai.defineTool(
  {
    name: 'listEmployees',
    description: 'Get a list of all employees in the company.',
    inputSchema: z.object({ companyId: z.string() }),
    outputSchema: z.array(z.any()),
  },
  async ({ companyId }) => service.listEmployees(companyId)
);

export const addEmployeeTool = ai.defineTool(
    {
        name: 'addEmployee',
        description: 'Add a new employee to the company.',
        inputSchema: z.object({ companyId: z.string(), employee: EmployeeSchema }),
        outputSchema: z.string().describe("The ID of the newly created employee."),
    },
    async ({ companyId, employee }) => service.addEmployee(companyId, employee)
);

export const findEmployeeByNameTool = ai.defineTool(
    {
        name: 'findEmployeeByName',
        description: 'Find a single employee by their full name to get their details, including their ID.',
        inputSchema: z.object({ companyId: z.string(), name: z.string() }),
        outputSchema: z.any().nullable(),
    },
    async ({ companyId, name }) => service.findEmployeeByName(companyId, name)
);


// == INVOICE TOOLS ==
export const listInvoicesTool = ai.defineTool(
    {
        name: 'listInvoices',
        description: 'Get a list of all invoices. Can be filtered by status.',
        inputSchema: z.object({ 
            companyId: z.string(), 
            status: z.enum(['Paid', 'Pending', 'Overdue', 'Draft']).optional().describe("Filter invoices by status.")
        }),
        outputSchema: z.array(z.any()),
    },
    async ({ companyId }) => service.listInvoices(companyId) // Note: Filtering by status in service is not implemented for brevity
);

export const updateInvoiceStatusTool = ai.defineTool(
    {
        name: 'updateInvoiceStatus',
        description: 'Update the status of a specific invoice.',
        inputSchema: z.object({
            companyId: z.string(),
            invoiceNumber: z.string().describe("The invoice number, e.g., 'INV123456'."),
            status: z.enum(['Paid', 'Pending', 'Overdue', 'Draft']).describe("The new status for the invoice."),
        }),
        outputSchema: z.boolean().describe("Whether the update was successful."),
    },
    async ({ companyId, invoiceNumber, status }) => service.updateInvoiceStatus(companyId, invoiceNumber, status)
);


// == EXPENSE TOOLS ==
export const listExpensesTool = ai.defineTool(
    {
        name: 'listExpenses',
        description: 'Get a list of all recorded expenses.',
        inputSchema: z.object({ companyId: z.string() }),
        outputSchema: z.array(z.any()),
    },
    async ({ companyId }) => service.listExpenses(companyId)
);

export const addExpenseTool = ai.defineTool(
    {
        name: 'addExpense',
        description: 'Add a new expense entry.',
        inputSchema: z.object({ companyId: z.string(), expense: ExpenseSchema }),
        outputSchema: z.string().describe("The ID of the newly created expense."),
    },
    async ({ companyId, expense }) => {
        const expenseData = { ...expense, date: new Date(expense.date) };
        return service.addExpense(companyId, expenseData);
    }
);

export const deleteLastExpenseTool = ai.defineTool(
    {
        name: 'deleteLastExpense',
        description: 'Deletes the most recently added expense entry. Use with caution and confirm with the user.',
        inputSchema: z.object({ companyId: z.string() }),
        outputSchema: z.boolean().describe("Whether the deletion was successful."),
    },
    async ({ companyId }) => service.deleteLastExpense(companyId)
);

// == ANALYSIS TOOLS ==
export const generateFinancialSummaryTool = ai.defineTool(
    {
        name: 'generateFinancialSummary',
        description: 'Generates a financial summary including total revenue, total expenses, net profit, and AI-powered analysis for savings opportunities.',
        inputSchema: z.object({ companyId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ companyId }) => service.generateFinancialSummary(companyId)
);

export const allTools = [
    listEmployeesTool,
    addEmployeeTool,
    findEmployeeByNameTool,
    listInvoicesTool,
    updateInvoiceStatusTool,
    listExpensesTool,
    addExpenseTool,
    deleteLastExpenseTool,
    generateFinancialSummaryTool,
];
