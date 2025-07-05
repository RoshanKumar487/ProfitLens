
'use client';

import React from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { HelpCircle, LayoutDashboard, Receipt, Banknote, Users, Sparkles, FileBarChart, Building, Shield } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <PageTitle title="User Guide" subtitle="Your complete guide to mastering ProfitLens." icon={HelpCircle} />

      <Card>
        <CardHeader>
          <CardTitle>Welcome to ProfitLens!</CardTitle>
          <CardDescription>This guide provides detailed instructions on how to use each feature of the application to manage your business finances effectively.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Click on any section below to expand it and view the detailed instructions and visuals.</p>
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Dashboard</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>The Dashboard gives you a high-level overview of your business's financial health.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Data Cards:</strong> At the top, you'll find key metrics like Total Revenue, Total Expenses, and Net Profit, with trend indicators showing performance compared to the last period.</li>
              <li><strong>Revenue vs Expenses Chart:</strong> This bar chart visualizes your monthly income against your spending, helping you spot trends over time.</li>
              <li><strong>Expense Breakdown Chart:</strong> This pie chart shows how your expenses are distributed across different categories, based on transactions from your linked bank accounts.</li>
              <li><strong>Recent Activity:</strong> A feed of the latest actions taken in the app, such as paid invoices or new expenses.</li>
            </ul>
            <Image src="https://placehold.co/800x450.png" width={800} height={450} alt="Dashboard Screenshot" className="rounded-lg border" data-ai-hint="dashboard analytics" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Invoicing</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>The Invoicing section allows you to create, manage, and send professional invoices to your clients.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Creating an Invoice:</strong> Click "Create New Invoice". If you start typing an existing client's name, you can select them from a list to auto-fill their details and items from their last invoice.</li>
              <li><strong>Invoice Items:</strong> Add multiple line items, each with a description, quantity, and unit price. The subtotal, tax, and total are calculated automatically.</li>
              <li><strong>Tax & Discount:</strong> You can apply a tax rate (in %) and a discount (as a fixed amount or percentage) to the entire invoice. Your last-used settings are saved as a default for next time.</li>
              <li><strong>Actions:</strong> From the invoice list, you can View, Print, Download as PDF, Edit, or Email the invoice directly to your client.</li>
               <li><strong>Payment Details:</strong> Add your company's bank account details on the "Company Details" page, and they will automatically appear on your invoices for easy payment.</li>
            </ul>
             <Image src="https://placehold.co/800x500.png" width={800} height={500} alt="Invoicing Page Screenshot" className="rounded-lg border" data-ai-hint="invoice form" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Bank Accounts & Transactions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>Manually track your bank accounts and transactions to get a clear picture of your cash flow. This page is accessed via the "Manage Accounts" link on the dashboard's Expense Breakdown chart.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Adding an Account:</strong> Click "Add Account" to enter your bank's name, account type, and current balance. The balance you set is the starting point.</li>
              <li><strong>Logging Transactions:</strong> Select an account, then click "Add Transaction". You can log deposits or withdrawals, assign a category, and add a description. The account balance updates automatically.</li>
              <li><strong>Analytics:</strong> All "withdrawal" transactions are categorized and visualized in the "Expense Breakdown" pie chart on your dashboard.</li>
            </ul>
            <Image src="https://placehold.co/800x400.png" width={800} height={400} alt="Bank Accounts Page Screenshot" className="rounded-lg border" data-ai-hint="financial transactions" />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-4">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Employees</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>Manage your team's information, salaries, and associated files in one place.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Adding an Employee:</strong> Click "Add Employee" and fill in their details, including name, position, salary, and an optional description.</li>
              <li><strong>File Uploads:</strong> You can upload a profile picture and an associated file (like a resume or contract) for each employee. You can either click to upload or drag-and-drop files into the designated areas.</li>
              <li><strong>Webcam Capture:</strong> Use the "Webcam" button to capture a profile picture directly from your device's camera.</li>
            </ul>
             <Image src="https://placehold.co/800x450.png" width={800} height={450} alt="Employees Page Screenshot" className="rounded-lg border" data-ai-hint="team management" />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-5">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Expense Analyzer</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>Leverage AI to get actionable insights on reducing your business costs.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Input Data:</strong> Enter your total revenue and total expenses for a given period.</li>
              <li><strong>Add Context:</strong> For better results, provide additional context in the text box. For example, you can itemize your expenses (e.g., "Software: $500, Marketing: $1200, Rent: $2000").</li>
              <li><strong>Analyze:</strong> The AI will provide a summary, identify potential cost-saving opportunities, and give specific recommendations.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-6">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <FileBarChart className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Reports</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>Export your application data to CSV files for offline analysis, accounting, or record-keeping.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Select a Report Type:</strong> Choose from Employees, Expenses, Invoices, Revenue, or Bank Transactions.</li>
              <li><strong>Choose a Date Range:</strong> Use the date pickers to select the 'from' and 'to' dates for the data you want to export.</li>
              <li><strong>Export:</strong> Click "Export CSV" to download the file to your computer.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-7">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Company Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>Manage your business's core information from your user profile dropdown.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong>Accessing:</strong> Click on your avatar/name in the bottom-left of the sidebar, then select "Company Details".</li>
                <li><strong>Updating Information:</strong> You can update your company's name, address, tax ID, and contact information.</li>
                <li><strong>Invoice Integration:</strong> The address, name, tax ID, and optional bank details you enter here will automatically appear on all generated invoices.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

         <AccordionItem value="item-8">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Administration</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pl-4 border-l-2 border-primary/20 ml-4">
            <p>This page is only visible to users with the 'admin' role.</p>
             <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong>User Access Requests:</strong> When a new user signs up and requests to join your company, their request will appear here.</li>
                <li><strong>Approve or Reject:</strong> As an admin, you can approve or reject these requests. Approving a user grants them access to your company's data. Rejecting denies access. The user is notified of the status change implicitly (they can or cannot log in).</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
