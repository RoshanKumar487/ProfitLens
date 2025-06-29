'use client';

import React from 'react';
import { format } from 'date-fns';
import type { EmployeeDisplay } from './page';
import Letterhead from '@/components/Letterhead';
import { stringToHslColor } from '@/lib/utils';

interface BioDataTemplateProps {
  employee: EmployeeDisplay;
  companyDetails?: any;
  profilePictureDataUri?: string;
  leftThumbImpressionDataUri?: string;
  signatureDataUri?: string;
  letterheadTemplate: 'none' | 'simple';
}

const DataRow: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="grid grid-cols-[140px_1fr] items-baseline py-1 text-sm">
    <span className="text-gray-600 font-medium">{label}:</span>
    <span className="font-semibold text-gray-900 break-words">{value || 'N/A'}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h3 className="text-base font-bold text-gray-800 border-b-2 border-gray-300 pb-1 mb-2">{title}</h3>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);


const BioDataTemplate = React.forwardRef<HTMLDivElement, BioDataTemplateProps>(
  ({ employee, companyDetails, profilePictureDataUri, leftThumbImpressionDataUri, signatureDataUri, letterheadTemplate }, ref) => {
    
    const fullPermanentAddress = [
        employee.permanentAddressHNo,
        employee.permanentAddressPS,
        employee.permanentAddressPost,
        employee.permanentAddressDist,
        employee.permanentAddressState,
        employee.permanentAddressPin
    ].filter(Boolean).join(', ');
    
    return (
      <div ref={ref} className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto flex flex-col">
        <div className="flex-grow p-8 flex flex-col">
            {letterheadTemplate === 'simple' && companyDetails && <Letterhead companyDetails={companyDetails} />}

            {letterheadTemplate === 'none' && (
            <header className="text-center mb-6">
                <div className="w-full h-24">{/* Blank space for letterhead */}</div>
                <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">{companyDetails?.name || 'Company Name'}</h1>
            </header>
            )}

            <h2 className="text-2xl font-semibold text-gray-700 mt-4 pb-2 border-b-2 border-gray-300 text-center">Employee Bio-Data</h2>
            
            {/* Main Content */}
            <div className="flex-grow grid grid-cols-3 gap-8 pt-6">
                <div className="col-span-2 space-y-6">
                    <Section title="Personal Details">
                        <DataRow label="Full Name" value={employee.name} />
                        <DataRow label="Father's Name" value={employee.fatherName} />
                        <DataRow label="Mother's Name" value={employee.motherName} />
                        <DataRow label="Date of Birth" value={employee.dateOfBirth ? format(employee.dateOfBirth, 'dd MMM, yyyy') : 'N/A'} />
                        <DataRow label="Phone Number" value={employee.selfPhoneNo} />
                        <DataRow label="Qualification" value={employee.qualification} />
                    </Section>
                    
                    <Section title="Permanent Address">
                        <p className="text-sm text-gray-800 font-semibold">{fullPermanentAddress || 'N/A'}</p>
                    </Section>

                    <Section title="Guarantor Information">
                        <DataRow label="Guarantor Name" value={employee.guarantorName} />
                        <DataRow label="Guarantor Phone" value={employee.guarantorPhone} />
                    </Section>
                </div>

                <div className="col-span-1 space-y-6">
                    <div className="flex justify-center">
                        <div className="w-40 h-48 border-2 border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 p-1">
                            {profilePictureDataUri ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profilePictureDataUri} alt="Profile Photo" width={160} height={192} className="object-cover w-full h-full" crossOrigin="anonymous"/>
                            ) : (
                                <span>Passport Photo</span>
                            )}
                        </div>
                    </div>
                    <Section title="Professional Details">
                        <DataRow label="Position" value={employee.position} />
                        <DataRow label="Joining Date" value={employee.joiningDate ? format(employee.joiningDate, 'dd MMM, yyyy') : 'N/A'} />
                        <DataRow label="Experience" value={employee.experience} />
                    </Section>
                    <Section title="Physical Attributes">
                        <DataRow label="Height" value={employee.height} />
                        <DataRow label="Weight" value={employee.weight} />
                        <DataRow label="Identification Marks" value={employee.identificationMarks} />
                    </Section>
                </div>
            </div>
            
            {/* Signature Footer */}
            <footer className="mt-auto pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
                <div>
                    <p className="font-semibold text-gray-700">Left Thumb Impression</p>
                    <div className="w-24 h-24 mt-2 border border-gray-300 bg-gray-50 flex items-center justify-center">
                        {leftThumbImpressionDataUri ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={leftThumbImpressionDataUri} alt="Thumb Impression" width={96} height={96} className="object-contain" crossOrigin="anonymous"/>
                        ) : (
                            <span className="text-xs text-gray-400">Thumb</span>
                        )}
                    </div>
                </div>
                <div className="text-left">
                    <p className="font-semibold text-gray-700">Employee Signature</p>
                    <div className="w-48 h-24 mt-2 border border-gray-300 bg-gray-50 flex items-center justify-center p-2">
                        {signatureDataUri ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={signatureDataUri} alt="Signature" width={192} height={96} className="object-contain h-full w-full" crossOrigin="anonymous"/>
                        ) : (
                            <span className="text-xs text-gray-400">Signature</span>
                        )}
                    </div>
                </div>
            </footer>
        </div>
      </div>
    );
  }
);

BioDataTemplate.displayName = 'BioDataTemplate';
export default BioDataTemplate;
