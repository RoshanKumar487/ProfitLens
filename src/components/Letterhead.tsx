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

interface LetterheadProps {
  companyDetails: CompanyDetails;
}

const getInitials = (name: string = "") => {
  const words = name.split(' ').filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length > 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Letterhead: React.FC<LetterheadProps> = ({ companyDetails }) => {
  const primaryColor = stringToHslColor(companyDetails.name, 70, 35); // Darker shade for main elements
  const accentColor = stringToHslColor(companyDetails.name, 55, 55); // Mid-tone for accents
  const watermarkColor = stringToHslColor(companyDetails.name, 20, 94); // Very light for watermark

  const fullAddress = [
    companyDetails.address,
    companyDetails.city,
    companyDetails.state,
    companyDetails.country,
  ].filter(Boolean).join(', ');

  const initials = getInitials(companyDetails.name);

  return (
    <div className="relative w-full text-black font-sans isolate">
      {/* Watermark in the center */}
      <div 
        className="absolute inset-0 flex items-center justify-center -z-10"
        style={{ color: watermarkColor }}
      >
        <span className="text-[200px] font-black opacity-60 select-none break-all">
          {initials}
        </span>
      </div>

      <div className="p-4 pt-2">
        {/* Top Content */}
        <div className="flex justify-between items-center pb-2 border-b-2" style={{borderColor: primaryColor}}>
            <div className="flex-1">
                <h1 className="text-3xl font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                {companyDetails.name}
                </h1>
            </div>
            <div className="text-right text-xs w-2/5">
                <p className="font-semibold" style={{color: accentColor}}>Address:</p>
                <p>{fullAddress}</p>
                 <div className="flex items-center justify-end gap-1 mt-1">
                    <Phone size={10} style={{ color: primaryColor }} /> {companyDetails.phone}
                </div>
                 <div className="flex items-center justify-end gap-1">
                    <Mail size={10} style={{ color: primaryColor }} /> {companyDetails.email}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Letterhead;
