// Name pools for the deterministic seed: South-Asian / Gulf / European blend
// matching a Dubai HQ + Karachi branch, with AED/PKR/SAR currency usage.

export const MALE_FIRST = [
  'Ahmed', 'Bilal', 'Usama', 'Hamza', 'Faizan', 'Ahsan', 'Zain', 'Omar', 'Yousuf', 'Ibrahim',
  'Kashif', 'Naveed', 'Tariq', 'Faisal', 'Saad', 'Adnan', 'Waleed', 'Rizwan', 'Salman', 'Danish',
  'Arjun', 'Rohan', 'Vikram', 'Ayaan', 'Musa', 'Ethan', 'Noah', 'Liam', 'Lucas', 'Karim',
];

export const FEMALE_FIRST = [
  'Ayesha', 'Fatima', 'Zara', 'Maryam', 'Hira', 'Sana', 'Nimra', 'Iqra', 'Alina', 'Sadia',
  'Rabia', 'Mahnoor', 'Laiba', 'Hania', 'Priya', 'Ananya', 'Sophia', 'Emma', 'Olivia', 'Khadija',
];

export const LAST = [
  'Khan', 'Malik', 'Sheikh', 'Butt', 'Chaudhry', 'Raza', 'Hussain', 'Ali', 'Iqbal', 'Farooq',
  'Siddiqui', 'Ansari', 'Baig', 'Mirza', 'Qureshi', 'Sharma', 'Verma', 'Patel', 'Nair', 'Gupta',
  'Fernando', 'Haddad', 'Nakamura', 'Okafor', 'Novak', 'Silva', 'Kaur', 'Rehman', 'Mehmood', 'Aslam',
];

export const COMPANY_NAMES = [
  'Desert Falcon Logistics', 'Emirates Star Trading', 'Pearl Gulf Enterprises', 'Zamindar Farms',
  'Indus Textile Mills', 'Falcon Freight', 'Al Barakah General Trading', 'Crescent Foods',
  'Horizon IT Services', 'Gulf Star Construction', 'Sultan Group', 'Ravi Exports',
];

export const CITIES = {
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  PAK: ['Karachi', 'Lahore', 'Islamabad', 'Hyderabad'],
  SAU: ['Riyadh', 'Jeddah', 'Dammam'],
  GBR: ['London', 'Manchester'],
  DEU: ['Berlin', 'Munich', 'Frankfurt'],
  FRA: ['Paris', 'Lyon'],
  ITA: ['Rome', 'Milan'],
  NLD: ['Amsterdam', 'Rotterdam'],
  CAN: ['Toronto', 'Vancouver'],
  AUS: ['Sydney', 'Melbourne'],
  USA: ['New York', 'Chicago', 'Houston'],
  TUR: ['Istanbul', 'Ankara'],
  MYS: ['Kuala Lumpur', 'Penang'],
  IND: ['Mumbai', 'Delhi', 'Bengaluru'],
} as Record<string, string[]>;

export const OCCUPATIONS = [
  'Businessman', 'Engineer', 'Doctor', 'Teacher', 'Shop Owner', 'Bank Officer', 'IT Professional',
  'Driver', 'Chef', 'Pharmacist', 'Architect', 'Accountant', 'Farmer', 'Textile Dealer',
];

export const AIRLINES = [
  { name: 'Emirates', code: 'EK' },
  { name: 'Qatar Airways', code: 'QR' },
  { name: 'Saudi Arabian Airlines', code: 'SV' },
  { name: 'Pakistan International', code: 'PK' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Turkish Airlines', code: 'TK' },
  { name: 'Airblue', code: 'ED' },
  { name: 'flydubai', code: 'FZ' },
  { name: 'Saudia', code: 'SV' },
];

export const ROUTES: [string, string, string, string][] = [
  ['Dubai', 'DXB', 'London', 'LHR'],
  ['Dubai', 'DXB', 'Karachi', 'KHI'],
  ['Karachi', 'KHI', 'Jeddah', 'JED'],
  ['Dubai', 'DXB', 'Riyadh', 'RUH'],
  ['Dubai', 'DXB', 'Istanbul', 'IST'],
  ['Karachi', 'KHI', 'Dubai', 'DXB'],
  ['Dubai', 'DXB', 'Toronto', 'YYZ'],
  ['Dubai', 'DXB', 'Kuala Lumpur', 'KUL'],
  ['Dubai', 'DXB', 'Frankfurt', 'FRA'],
  ['Abu Dhabi', 'AUH', 'Paris', 'CDG'],
  ['Dubai', 'DXB', 'New York', 'JFK'],
  ['Karachi', 'KHI', 'Makkah', 'MEK'],
  ['Dubai', 'DXB', 'Sydney', 'SYD'],
  ['Dubai', 'DXB', 'Mumbai', 'BOM'],
  ['Sharjah', 'SHJ', 'Lahore', 'LHE'],
];

export const HOTELS: { name: string; city: string; country: string; stars: number }[] = [
  { name: 'Al Manzel Royal Suites', city: 'Dubai', country: 'UAE', stars: 5 },
  { name: 'Mövenpick City Centre', city: 'Dubai', country: 'UAE', stars: 4 },
  { name: 'Pearl-Occupations Grand', city: 'Karachi', country: 'PAK', stars: 5 },
  { name: 'Ramada Inn Clifton', city: 'Karachi', country: 'PAK', stars: 4 },
  { name: 'Hilton Makkah Towers', city: 'Makkah', country: 'SAU', stars: 5 },
  { name: 'Nariman Hotel', city: 'Lahore', country: 'PAK', stars: 4 },
  { name: 'Marriott Executive', city: 'Riyadh', country: 'SAU', stars: 5 },
  { name: 'Premier Inn Heathrow', city: 'London', country: 'GBR', stars: 3 },
  { name: 'Hotel Rosewood', city: 'Istanbul', country: 'TUR', stars: 4 },
  { name: 'Novotel Airport', city: 'Kuala Lumpur', country: 'MYS', stars: 4 },
  { name: 'Comfort Suites AI', city: 'Dubai', country: 'UAE', stars: 3 },
  { name: 'The Leela Palace', city: 'Mumbai', country: 'IND', stars: 5 },
];

export const PACKAGE_DEFS: { name: string; dest: string; days: number; price: number; includes: string; type: string }[] = [
  { name: 'Umrah Economy 14 Days', dest: 'Makkah/Madinah, Saudi Arabia', days: 14, price: 1850, includes: 'Visa, hotel near Haram, transport, Ziyarat', type: 'RELIGIOUS' },
  { name: 'Umrah VIP 10 Days', dest: 'Makkah/Madinah, Saudi Arabia', days: 10, price: 3400, includes: '5-star Haram view, business class, private transfer', type: 'RELIGIOUS' },
  { name: 'Turkey Escape 7 Nights', dest: 'Istanbul & Bursa, Türkiye', days: 7, price: 1290, includes: 'Schengen? no — Turkey e-visa, boutique hotels, Bosphorus cruise', type: 'LEISURE' },
  { name: 'Malaysia Honeymoon 6N', dest: 'Kuala Lumpur & Langkawi', days: 6, price: 1550, includes: 'Resort stay, island hopping, city tour', type: 'LEISURE' },
  { name: 'Schengen Business Tour', dest: 'Dubai based biz visas', days: 5, price: 980, includes: 'Appointment booking, documents check, travel insurance', type: 'VISA_SERVICE' },
  { name: 'Azerbaijan Study Visa Package', dest: 'Baku', days: 30, price: 2100, includes: 'University admission support, visa file, accommodation', type: 'EDUCATION' },
  { name: 'Georgia Work Permit Bundle', dest: 'Tbilisi', days: 21, price: 1750, includes: 'Company registration support, work visa file, SIM & pickup', type: 'WORK' },
  { name: 'Family Summer UK Visit', dest: 'London & Manchester', days: 12, price: 4200, includes: 'Family visa filing, hotels, rail pass, attraction tickets', type: 'FAMILY' },
];

export const EXPENSE_CATEGORIES = [
  'OFFICE_RENT', 'SALARIES', 'ELECTRICITY', 'INTERNET', 'STATIONERY', 'TRAVEL', 'MARKETING',
  'EMBASSY_FEES', 'COURIER', 'RENT', 'FOOD', 'MAINTENANCE', 'SOFTWARE', 'FUEL',
];

export const DOC_TITLES: Record<string, string[]> = {
  PASSPORT: ['Passport scan', 'Passport copy (front)', 'Passport bio page'],
  CNIC: ['CNIC front', 'CNIC back', 'Family registration card'],
  PHOTO: ['Digital photo white background', 'Visa photo 4x6'],
  APPLICATION_FORM: ['Signed application form', 'Embassy form page 1-2'],
  BANK_STATEMENT: ['6-month bank statement', 'Solvency certificate'],
  AIR_TICKET: ['Return e-ticket', 'Itinerary confirmation'],
  HOTEL_VOUCHER: ['Hotel booking voucher', 'A accommodation proof'],
  INSURANCE: ['Travel insurance policy', 'Medical insurance card'],
  NOC: ['NOC from employer', 'NOC for minors'],
  COVER_LETTER: ['Visa cover letter'],
  POLICE_CERTIFICATE: ['Police character certificate'],
};
