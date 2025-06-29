'use client';

import React from 'react';
import { stringToHslColor } from '@/lib/utils';
import { Phone, Mail, Globe } from 'lucide-react';

interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface LetterheadModernProps {
  companyDetails: CompanyDetails;
}

const LetterheadModern: React.FC<LetterheadModernProps> = ({ companyDetails }) => {
  // A dark, saturated color for the background
  const primaryBgColor = stringToHslColor(companyDetails.name, 40, 25);
  // A slightly lighter, vibrant color for the company name text, to pop against the dark BG
  const companyNameColor = stringToHslColor(companyDetails.name, 70, 75);

  const fullAddress = [
    companyDetails.address,
    companyDetails.city,
    companyDetails.state,
    companyDetails.country,
  ].filter(Boolean).join(', ');

  return (
    <header className="w-full text-white p-6 font-sans" style={{ backgroundColor: primaryBgColor }}>
      <div className="flex justify-between items-start">
        {/* Left side: Company Name */}
        <div className="w-1/2">
           <h1 className="text-3xl font-headline font-bold uppercase tracking-wider" style={{ color: companyNameColor }}>
            {companyDetails.name}
          </h1>
        </div>

        {/* Right side: Contact Info */}
        <div className="text-right text-xs w-1/2 space-y-1">
           <p className="font-bold text-sm" style={{ color: companyNameColor }}>Address:</p>
           <p>{fullAddress}</p>
           <div className="flex items-center justify-end gap-1.5 mt-2">
              <Phone size={10} />
              <span>{companyDetails.phone || 'N/A'}</span>
           </div>
           <div className="flex items-center justify-end gap-1.5">
              <Mail size={10} />
              <span>{companyDetails.email || 'N/A'}</span>
           </div>
           {companyDetails.website && (
            <div className="flex items-center justify-end gap-1.5">
                <Globe size={10} />
                <span>{companyDetails.website}</span>
            </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default LetterheadModern;
