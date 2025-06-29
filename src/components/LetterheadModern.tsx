'use client';

import React from 'react';
import { stringToHslColor } from '@/lib/utils';
import { Phone, Mail } from 'lucide-react';

interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface LetterheadModernProps {
  companyDetails: CompanyDetails;
}

const LetterheadModern: React.FC<LetterheadModernProps> = ({ companyDetails }) => {
  const primaryColor = stringToHslColor(companyDetails.name, 60, 40); // e.g., Teal/Green shade
  const accentColor = stringToHslColor(companyDetails.name, 70, 55);  // Brighter accent for borders

  const fullAddress = [
    companyDetails.address,
    companyDetails.city,
    companyDetails.state,
    companyDetails.country,
  ].filter(Boolean).join(', ');

  return (
    <header className="relative w-full text-black font-sans" style={{ borderTop: `4px solid ${accentColor}` }}>
      <div className="flex justify-between items-center p-4">
        <div className="relative w-2/3">
           <h1 className="text-3xl font-bold uppercase tracking-wider relative z-10" style={{ color: primaryColor }}>
            {companyDetails.name}
          </h1>
          <div 
              className="absolute -bottom-1 -left-2 h-8 w-56 opacity-20 z-0"
              style={{
                  background: `linear-gradient(45deg, ${primaryColor}, transparent)`
              }}
          />
        </div>
        <div className="text-right text-xs w-1/3 space-y-0.5">
           <p className="font-bold" style={{color: primaryColor}}>Address:</p>
           <p>{fullAddress}</p>
           <div className="flex items-center justify-end gap-1.5 mt-1">
              <Phone size={10} style={{ color: primaryColor }} />
              <span>{companyDetails.phone || 'N/A'}</span>
           </div>
           <div className="flex items-center justify-end gap-1.5">
              <Mail size={10} style={{ color: primaryColor }} />
              <span>{companyDetails.email || 'N/A'}</span>
           </div>
        </div>
      </div>
    </header>
  );
};

export default LetterheadModern;
