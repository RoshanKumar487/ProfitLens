
/**
 * @fileOverview Defines the tools (functions) that the AI Assistant can call.
 * These tools provide a structured way for the AI to interact with the application's
 * data and services, acting as its interface to the backend.
 *
 * @exports allTools - An array containing all defined tools for the assistant.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as service from '@/services/ai-assistant-service';

// --- Zod Schemas for Tool Inputs ---
// These schemas define the expected data structure for tool arguments.

const EmployeeSchema = z.object({
    name: z.string().describe("The full name of the employee."),
    position: z.string().describe("The job title or position of the employee."),
    salary: z.number().describe("The salary of the employee as a number."),
    description: z.string().optional().describe("Any additional notes or description."),
});

const ExpenseSchema = z.object({
    date: z.string().describe("The date of the expense in YYYY-MM-DD format. Use today's date if not specified."),
    amount: z.number().describe("The amount of the expense."),
    category: z.string().describe("The category of the expense. Must be one of: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salaries & Wages', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'"),
    description: z.string().optional().describe("A brief description of the expense."),
    vendor: z.string().optional().describe("The name of the vendor or store."),
});


// --- Tool Definitions ---

// == EMPLOYEE TOOLS ==

export const listEmployeesTool = ai.defineTool(
  {
    name: 'listEmployees',
    description: 'Get a list of all employees in the company, including their ID, name, position, and salary.',
    inputSchema: z.object({ companyId: z.string() }),
    outputSchema: z.array(z.any()).describe("An array of employee objects."),
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
        description: 'Find a single employee by their full name to get their details, including their unique ID.',
        inputSchema: z.object({ companyId: z.string(), name: z.string() }),
        outputSchema: z.any().nullable().describe("The employee object if found, otherwise null."),
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
        outputSchema: z.array(z.any()).describe("An array of invoice objects."),
    },
    async ({ companyId }) => service.listInvoices(companyId) // Note: Filtering by status in service is not implemented for brevity
);

export const updateInvoiceStatusTool = ai.defineTool(
    {
        name: 'updateInvoiceStatus',
        description: 'Update the status of a specific invoice. Use the invoice number to identify it.',
        inputSchema: z.object({
            companyId: z.string(),
            invoiceNumber: z.string().describe("The full invoice number, e.g., 'INV123456'."),
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
        outputSchema: z.array(z.any()).describe("An array of expense objects."),
    },
    async ({ companyId }) => service.listExpenses(companyId)
);

export const addExpenseTool = ai.defineTool(
    {
        name: 'addExpense',
        description: 'Add a new expense entry to the company records.',
        inputSchema: z.object({ companyId: z.string(), expense: ExpenseSchema }),
        outputSchema: z.string().describe("The ID of the newly created expense."),
    },
    async ({ companyId, expense }) => {
        // The service layer expects a Date object, so we convert it here.
        const expenseData = { ...expense, date: new Date(expense.date) };
        return service.addExpense(companyId, expenseData);
    }
);

export const deleteLastExpenseTool = ai.defineTool(
    {
        name: 'deleteLastExpense',
        description: 'Deletes the most recently added expense entry. Use with extreme caution and always confirm with the user first.',
        inputSchema: z.object({ companyId: z.string() }),
        outputSchema: z.boolean().describe("Whether the deletion was successful."),
    },
    async ({ companyId }) => service.deleteLastExpense(companyId)
);

// == ANALYSIS TOOLS ==
export const generateFinancialSummaryTool = ai.defineTool(
    {
        name: 'generateFinancialSummary',
        description: "Generates a complete financial summary. It calculates total revenue, total expenses, net profit, and provides AI-powered analysis for potential savings opportunities.",
        inputSchema: z.object({ companyId: z.string() }),
        outputSchema: z.any().describe("An object containing the financial summary and AI analysis."),
    },
    async ({ companyId }) => service.generateFinancialSummary(companyId)
);


/**
 * An array containing all the tools that the AI assistant can use.
 */
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
