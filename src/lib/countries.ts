// In a real-world app, this might come from an API or a more extensive list.
export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: '$' },
  { code: 'CA', name: 'Canada', currency: 'C$' },
  { code: 'GB', name: 'United Kingdom', currency: '£' },
  { code: 'AU', name: 'Australia', currency: 'A$' },
  { code: 'IN', name: 'India', currency: '₹' },
  { code: 'DE', name: 'Germany', currency: '€' },
  { code: 'FR', name: 'France', currency: '€' },
  { code: 'JP', name: 'Japan', currency: '¥' },
  { code: 'PH', name: 'Philippines', currency: '₱' },
  // Add more countries as needed
];

export const getCurrencySymbol = (countryCode?: string): string => {
    if (!countryCode) return '$';
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.currency || '$';
}
