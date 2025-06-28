
'use client';

import React from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import type { EmployeeDisplay } from './page';

interface BioDataTemplateProps {
  employee: EmployeeDisplay;
  companyName?: string;
  companyAddress?: string;
}

const DottedLine: React.FC = () => <span className="flex-grow border-b border-dotted border-black mx-1"></span>;

const DataField: React.FC<{ label: string; value?: string | number | null, className?: string }> = ({ label, value, className }) => (
  <div className={cn("flex items-end text-sm", className)}>
    <span className="font-semibold whitespace-nowrap">{label}</span>
    <DottedLine />
    <span className="font-mono text-xs">{value || ''}</span>
  </div>
);

const BioDataTemplate = React.forwardRef<HTMLDivElement, BioDataTemplateProps>(
  ({ employee, companyName, companyAddress }, ref) => {
    return (
      <div ref={ref} className="bg-white text-black p-6 font-serif w-[210mm] min-h-[297mm] mx-auto flex flex-col">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold tracking-widest underline">BIO-DATA</h1>
        </div>
        
        <div className="flex justify-between items-start mb-2">
            <div className="text-sm space-y-1 w-1/3">
                <DataField label="T.No:" value={employee.tNo} />
                <DataField label="UF Size:" value={employee.ufSize} />
                <DataField label="Shoes No.:" value={employee.shoesNo} />
            </div>
            <div className="w-32 h-40 border-2 border-black flex items-center justify-center text-gray-400 p-1">
                {employee.profilePictureUrl ? (
                    <Image src={employee.profilePictureUrl} alt="Profile Photo" width={128} height={160} className="object-cover w-full h-full" />
                ) : (
                    <span>Passport Photo</span>
                )}
            </div>
        </div>
        
        <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{companyName || 'CENTRAL SECURITY FORCE, SECURITY & INVESTIGATION BUREAU'}</h2>
            <p className="text-xs">{companyAddress || '#: 6-2-194/44, SHIVARAMPALLY, RAJENDERNAGAR, CIRCLE, HYD (T.S.)'}</p>
        </div>
        
        <div className="space-y-2 text-sm">
            <DataField label="NAME" value={employee.name} />
            <DataField label="FATHER'S NAME" value={employee.fatherName} />
            <DataField label="WIFE NAME OR MOTHER NAME" value={employee.wifeOrMotherName} />

            <div className="font-semibold mt-3">PRESENT ADDRESS:</div>
            <DataField label="H.No." value={employee.presentAddressHNo} />
            <div className="grid grid-cols-3 gap-x-6">
                <DataField label="P.S." value={employee.presentAddressPS} />
                <DataField label="POST" value={employee.presentAddressPost} />
                <DataField label="DIST" value={employee.presentAddressDist} />
            </div>
             <div className="grid grid-cols-3 gap-x-6">
                <DataField label="STATE" value={employee.presentAddressState} />
                <DataField label="PIN NO" value={employee.presentAddressPin} />
                <DataField label="Phone No." value={employee.phoneNo} />
            </div>

            <div className="font-semibold mt-3">PERMANENT ADDRESS:</div>
             <DataField label="H.No." value={employee.permanentAddressHNo} />
            <div className="grid grid-cols-2 gap-x-6">
                <DataField label="P.S." value={employee.permanentAddressPS} />
                <DataField label="POST" value={employee.permanentAddressPost} />
            </div>
            <div className="grid grid-cols-2 gap-x-6">
                <DataField label="DIST" value={employee.permanentAddressDist} />
                <DataField label="STATE" value={employee.permanentAddressState} />
            </div>
            <DataField label="PIN NO" value={employee.permanentAddressPin} />


            <div className="grid grid-cols-2 gap-x-6 pt-2">
                <DataField label="QUALIFICATION:" value={employee.qualification} />
                <DataField label="PHONE NO. SELF:" value={employee.selfPhoneNo} />
            </div>
            <div className="grid grid-cols-3 gap-x-6">
                <DataField label="DATE OF BIRTH" value={employee.dateOfBirth ? format(employee.dateOfBirth, 'dd/MM/yyyy') : ''} />
                <DataField label="HEIGHT" value={employee.height} />
                <DataField label="WEIGHT" value={employee.weight} />
            </div>
            <DataField label="IDENTIFICATION MARKS" value={employee.identificationMarks} />
            <DataField label="JOINING DATE" value={employee.joiningDate ? format(employee.joiningDate, 'dd/MM/yyyy') : ''} />
            <div className="grid grid-cols-2 gap-x-6">
                <DataField label="GUARANTOR NAME" value={employee.guarantorName} />
                <DataField label="Ph. No. & T. No." value={employee.guarantorPhone} />
            </div>
            <DataField label="EXPERIENCE" value={employee.experience} />
            <DataField label="VILLAGE PRESIDENT NAME" value={employee.villagePresidentName} />
            <p className="text-xs ml-4">(M.L.A. Corp., M.P. Present)</p>
        </div>

        <div className="flex-grow"></div>
        
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div>
                <p>THUMB IMPRESSION (LEFT)</p>
                <div className="w-24 h-12 mt-2 border border-black flex items-center justify-center">
                    {employee.leftThumbImpressionUrl ? (
                         <Image src={employee.leftThumbImpressionUrl} alt="Thumb Impression" width={96} height={48} className="object-contain" />
                    ) : (
                        <span className="text-xs text-gray-400">Thumb</span>
                    )}
                </div>
            </div>
             <div className="text-right">
                <p>SIGNATURE OF THE EMPLOYEE</p>
                 <div className="w-48 h-12 mt-2 border border-black inline-block flex items-center justify-center">
                     {employee.signatureUrl ? (
                         <Image src={employee.signatureUrl} alt="Signature" width={192} height={48} className="object-contain h-full w-full" />
                    ) : (
                        <span className="text-xs text-gray-400 p-2">Signature</span>
                    )}
                 </div>
            </div>
        </div>
      </div>
    );
  }
);

BioDataTemplate.displayName = 'BioDataTemplate';
export default BioDataTemplate;
