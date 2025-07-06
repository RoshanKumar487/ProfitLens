
'use client';

import React from 'react';
import { format } from 'date-fns';
import { type PayrollSettings } from '../settings/actions';
import Letterhead from '@/components/Letterhead';

// This is a simplified version for the template.
interface EmployeeWithPayroll {
    id: string;
    name: string;
    position?: string;
    uan?: string;
    joiningDate?: Date;
    baseSalary: number;
    proratedSalary?: number;
    overtimePay?: number;
    grossEarnings?: number;
    advances: number;
    otherDeductions: number;
    pfContribution?: number;
    esiContribution?: number;
    totalDeductions?: number;
    netPayment?: number;
    customFields: { [key: string]: number | string | Date };
}

interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

interface PayslipTemplateProps {
  employee: EmployeeWithPayroll;
  payPeriod: string; // YYYY-MM
  companyDetails: CompanyDetails;
  payrollSettings: PayrollSettings | null;
  currencySymbol: string;
  signatureDataUri?: string;
  stampDataUri?: string;
}

const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';
    let word = '';
    const generateWords = (n: number) => {
        let str = '';
        if (n > 19) {
            str += tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
        } else {
            str += ones[n];
        }
        return str.trim();
    };

    let n = Math.floor(num);
    let i = 0;
    while (n > 0) {
        let remainder = (i === 0) ? n % 1000 : n % 100;
        if (remainder !== 0) {
            word = generateWords(remainder) + ' ' + thousands[i] + ' ' + word;
        }
        n = (i === 0) ? Math.floor(n / 1000) : Math.floor(n / 100);
        i++;
    }
    return word.trim() + ' Only';
};

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <tr className="border-b">
    <td className="p-2 font-semibold text-gray-600 w-1/3">{label}</td>
    <td className="p-2 text-gray-800">{value}</td>
  </tr>
);

const SalaryRow: React.FC<{ label: string; value?: number; currencySymbol: string }> = ({ label, value, currencySymbol }) => (
  <tr>
    <td className="p-2">{label}</td>
    <td className="p-2 text-right">{value ? `${currencySymbol}${value.toFixed(2)}` : '-'}</td>
  </tr>
);


const PayslipTemplate = React.forwardRef<HTMLDivElement, PayslipTemplateProps>(
  ({ employee, payPeriod, companyDetails, payrollSettings, currencySymbol, signatureDataUri, stampDataUri }, ref) => {
    
    const grossEarnings = employee.grossEarnings || 0;
    const totalDeductions = employee.totalDeductions || 0;
    const netSalary = employee.netPayment || 0;

    return (
      <div ref={ref} className="bg-white text-black font-sans text-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col p-6">
        <Letterhead companyDetails={companyDetails as any} />
        
        <h2 className="text-xl font-bold border-y-2 border-black py-2 my-4 text-center">PAYSLIP FOR THE MONTH OF {format(new Date(payPeriod), 'MMMM yyyy')}</h2>
        
        <table className="w-full border-collapse border text-sm mb-4">
            <tbody>
                <DataRow label="Employee Name" value={employee.name} />
                <DataRow label="Designation" value={employee.position || 'N/A'} />
                <DataRow label="Date of Joining" value={employee.joiningDate ? format(employee.joiningDate, 'dd-MM-yyyy') : 'N/A'} />
                <DataRow label="UAN" value={employee.uan || 'N/A'} />
                 {(payrollSettings?.customFields || []).map(field => {
                    if (field.type === 'number') return null;
                    const value = employee.customFields?.[field.id];
                    let displayValue: string = 'N/A';
                    if (value) {
                        if (field.type === 'date') {
                            displayValue = format(new Date(value as string | Date), 'dd-MM-yyyy');
                        } else {
                            displayValue = value as string;
                        }
                    }
                    return <DataRow key={field.id} label={field.label} value={displayValue} />
                })}
            </tbody>
        </table>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border">
                <h3 className="font-bold text-center bg-gray-200 p-2 border-b">Earnings</h3>
                <table className="w-full">
                    <tbody>
                        <SalaryRow label="Basic Salary" value={employee.baseSalary} currencySymbol={currencySymbol} />
                        <SalaryRow label="Overtime Pay" value={employee.overtimePay} currencySymbol={currencySymbol} />
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-100">
                            <td className="p-2 border-t">Total Earnings</td>
                            <td className="p-2 text-right border-t">{currencySymbol}{grossEarnings.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="border">
                <h3 className="font-bold text-center bg-gray-200 p-2 border-b">Deductions</h3>
                 <table className="w-full">
                    <tbody>
                        <SalaryRow label="Provident Fund (PF)" value={employee.pfContribution} currencySymbol={currencySymbol} />
                        <SalaryRow label="ESI" value={employee.esiContribution} currencySymbol={currencySymbol} />
                        <SalaryRow label="Advances" value={employee.advances} currencySymbol={currencySymbol} />
                        <SalaryRow label="Other Deductions" value={employee.otherDeductions} currencySymbol={currencySymbol} />
                        {payrollSettings?.customFields.map(field => {
                           if (field.type !== 'number') return null;
                           return <SalaryRow key={field.id} label={field.label} value={Number(employee.customFields?.[field.id]) || 0} currencySymbol={currencySymbol} />
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-100">
                            <td className="p-2 border-t">Total Deductions</td>
                            <td className="p-2 text-right border-t">{currencySymbol}{totalDeductions.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div className="border p-2 bg-gray-100 font-bold mb-4 flex justify-between items-center text-lg">
            <span>Net Salary</span>
            <span>{currencySymbol}{netSalary.toFixed(2)}</span>
        </div>
        
        <div className="border p-2">
            <span className="font-bold">Amount in Words:</span> {numberToWords(netSalary)}
        </div>
        
        <footer className="mt-auto pt-16 flex justify-between items-end">
            <div className="text-center">
                <p className="border-t pt-1">Employee Signature</p>
            </div>
            <div className="text-center">
                 <div className="relative h-20 w-40 mx-auto flex flex-col items-center justify-end">
                    {signatureDataUri && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signatureDataUri} alt="Signature" className="max-h-16 max-w-full object-contain" crossOrigin="anonymous" />
                    )}
                 </div>
                <p className="border-t pt-1 font-semibold">Authorised Signatory</p>
                <p className="font-bold">For {companyDetails.name}</p>
            </div>
        </footer>
        <div className="text-center text-xs text-gray-500 mt-4">
            This is a computer-generated payslip.
        </div>
      </div>
    );
  }
);

PayslipTemplate.displayName = 'PayslipTemplate';
export default PayslipTemplate;
