import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogIn, FileText, Settings, Download, Upload, Plus, Search, Calendar, DollarSign, Users, Trash2, Edit, Save, User, Layout, ChevronDown, ImageIcon, User2, Menu, X } from 'lucide-react';

// 1. IMPORT FIREBASE FUNCTIONS
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- 1. FIREBASE & AUTH CONFIGURATION (Client-side) ---
// Note: In a real environment, __firebase_config and __initial_auth_token are provided globally.
const firebaseConfig = {

  apiKey: "AIzaSyCeSoePIKZLQgXSErE2vyjdmpzd2blhUhY",
  authDomain: "leger-app-228f2.firebaseapp.com",
  projectId: "leger-app-228f2",
  storageBucket: "leger-app-228f2.firebasestorage.app",
  messagingSenderId: "23840369680",
  appId: "1:23840369680:web:0ec69e2f99f2be288b6e95"
};

// 2. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --- 2. DUMMY DATA STRUCTURES ---

// UPDATED default branding configuration, including new company info
const defaultBrandingSettings = {
    primaryColor: '#039dbf', // Revolit Blue
    accentColor: '#e9b318',  // Revolit Yellow
    companyName: 'REVOLIT SOLUTIONS',
    // RENAMED from StyleA
    defaultTemplateStyle: 'ModernStyle', 
    // Using a default Base64 or external URL for initial state
    logoUrl: "https://", 
    // NEW: Editable Company Info
    companyInfo: {
        address: 'Address',
        phone: '064 546 8642',
        email: 'info@rs.co.za',
        vatNo: '91976412451',
    },
    // NEW: Editable Footer Details - UPDATED STRUCTURE for Payment Details
    paymentDetails: {
        accountHolder: 'REVOLIT SOLUTIONS', // Updated key
        bankName: 'FNB', // New key
        accountNumber: '0000000', // Updated key
        paymentNote: 'Payment must be made in full before the due date.',
    },
    contactDetails: {
        contactName: 'Mr Mphela',
        contactPhone: '+27 64 546 8642',
        contactEmail: 'info@revolitsolutions.co.za',
        thankYouNote: 'Thank you for choosing us!',
    },
    // Simple template B thank you note (kept separate for template B simplicity)
    templateBThankYou: 'Thank you for your business!',
};

// NEW: Template Options for Selector (defines 6 templates with unique names)
const TemplateOptions = [
    // Map existing components to new names
    { id: 'ModernStyle', name: 'Modern Style (Default)', description: 'The structured Revolit invoice layout.' },
    { id: 'SimpleStyle', name: 'Simple Style (Minimal)', description: 'A clean, modern layout with minimal borders.' },
    // Placeholder names for future templates (C, D, E, F)
    { id: 'StyleC', name: 'Professional (Monochrome)', description: 'A simple, black-and-white professional look.' },
    { id: 'StyleD', name: 'Vibrant (Modern)', description: 'A bold, modern design with full-width color sections.' },
    { id: 'StyleE', name: 'Formal (Detailed)', description: 'Focus on clear data presentation and legal details.' },
    { id: 'StyleF', name: 'Compact (Quick View)', description: 'A condensed view for quick, smaller transactions.' },
];

// MODIFIED: Accepts the sequential number as an argument and pads it.
const generateDateBasedID = (prefix, sequenceNum) => {
    const date = new Date();
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    // Format the sequence number to be at least 3 digits (e.g., 1 -> 001)
    const num = String(sequenceNum).padStart(3, '0');
    // Prefix will be 'RS' for both documents and new customers, as requested
    return `${prefix}-${YYYY}-${MM}-${DD}-${num}`;
};

// NEW UTILITY: Determines the ID cycle year based on a February reset.
const getIDCycleYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 (Jan) to 11 (Dec)
    // If the month is January (0), the document belongs to the previous year's ID cycle 
    // (which started last February).
    if (month === 0) {
        return year - 1;
    }
    // For Feb (1) through Dec (11), the document belongs to the current year's ID cycle.
    return year;
};


const initialClient = {
    id: 'NEW-CLIENT', // Identifier used for lookups
    company: 'Client Company (Optional)',
    name: 'New Client Name',
    address: 'Street address',
    cityStateZip: 'State / City, Zip code',
    phone: 'Client Phone',
    email: 'Client Email',
};

// MODIFIED: Accepts defaultTemplate parameter and uses it
const initialData = (docType = 'Invoice', id = null, defaultTemplate = 'ModernStyle') => ({ // RENAMED default template to 'ModernStyle'
  // Use the generated ID for new documents, or a temporary ID for the current editor state
  id: id || `TEMP-${Date.now()}`, 
  documentType: docType, // 'Invoice', 'Quotation', 'Receipt'
  // NEW: Add a 'status' for ledger filtering
  status: docType === 'Receipt' ? 'Paid' : 'Draft', 
  templateStyle: defaultTemplate, // Use the passed default template style
  documentDetails: {
    // Placeholder 999 is used for the sequential number in the initial state
    docNo: generateDateBasedID('RS', 999), 
    date: new Date().toISOString().split('T')[0],
    terms: 'Due Upon Receipt',
    isPaid: docType === 'Receipt',
    stampText: docType === 'Receipt' ? 'RECEIPT - PAID' : '',
  },
  clientDetails: initialClient,
  lineItems: [
    { description: 'Service/Product Description', qty: 1, unitPrice: 100.00, amount: 100.00 },
  ],
  totals: {
    subtotal: 100.00,
    taxRate: 15,
    tax: 15.00,
    totalDue: 115.00,
  },
});

// Create sample customer data for initial ledger state
const tempSampleCustomers = [
    { id: 'CUST-001', company: 'Acme Corp', name: 'Wile E. Coyote', address: '123 Desert Rd', cityStateZip: 'Phoenix, AZ, 85001', phone: '555-1234', email: 'wile@acme.com' },
    { id: 'CUST-002', company: 'Stark Industries', name: 'Tony Stark', address: '10880 Malibu Point', cityStateZip: 'Malibu, CA, 90265', phone: '555-4321', email: 'tony@stark.com' },
    { id: 'CUST-003', company: 'Wayne Enterprises', name: 'Bruce Wayne', address: '1007 Mountain Drive', cityStateZip: 'Gotham, NJ, 07099', phone: '555-9876', email: 'bruce@wayne.com' },
];

// UPDATED: Sample Ledger for Initial State uses sequential numbering (001, 002, 003)
const sampleLedger = [
    {
        ...initialData('Invoice', 'RS-2025-12-09-001'),
        status: 'Outstanding',
        templateStyle: 'ModernStyle', // Set default template style
        // Date is used for cycle counting: December 2025 is in the 2025 cycle
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-001', date: '2025-12-05', isPaid: false, stampText: '' },
        clientDetails: tempSampleCustomers[0],
        totals: { subtotal: 500.00, taxRate: 15, tax: 75.00, totalDue: 575.00 },
        lineItems: [{ description: 'Annual Subscription', qty: 1, unitPrice: 500.00, amount: 500.00 }],
    },
    {
        ...initialData('Quotation', 'RS-2025-12-09-002'),
        status: 'Pending',
        templateStyle: 'ModernStyle', // Set default template style
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-002', date: '2025-12-08', isPaid: false, stampText: '' },
        clientDetails: tempSampleCustomers[1],
        totals: { subtotal: 1200.00, taxRate: 15, tax: 180.00, totalDue: 1380.00 },
        lineItems: [{ description: 'Consulting Services', qty: 10, unitPrice: 120.00, amount: 1200.00 }],
    },
    {
        ...initialData('Receipt', 'RS-2025-12-09-003'),
        status: 'Paid',
        templateStyle: 'ModernStyle', // Set default template style
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-003', date: '2025-12-01', isPaid: true, stampText: 'PAID' },
        clientDetails: tempSampleCustomers[2],
        totals: { subtotal: 300.00, taxRate: 15, tax: 45.00, totalDue: 345.00 },
        lineItems: [{ description: 'Website Maintenance', qty: 3, unitPrice: 100.00, amount: 300.00 }],
    },
];

// NEW UTILITY FUNCTION: Read from local storage
const getInitialState = (key, fallbackValue) => {
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // NEW: Merge with fallback value to ensure new fields (like companyInfo, footer details) are present on load
            if (key === 'brandingSettings' && typeof parsed === 'object') {
                // Perform a deep merge for safety with nested objects
                return {
                    ...fallbackValue, // Default structure
                    ...parsed, // Overwritten top-level props (colors, name, logo, defaultTemplateStyle, templateBThankYou)
                    // NEW: Company Info Merge
                    companyInfo: { 
                        ...fallbackValue.companyInfo,
                        ...parsed.companyInfo
                    },
                    paymentDetails: {
                        ...fallbackValue.paymentDetails,
                        ...parsed.paymentDetails
                    },
                    contactDetails: {
                        ...fallbackValue.contactDetails,
                        ...parsed.contactDetails
                    },
                };
            }
            return parsed;
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            return fallbackValue;
        }
    }
    return fallbackValue;
};


// --- 3. CUSTOM COMPONENTS & UTILITIES ---

const formatCurrency = (amount) => `R ${parseFloat(amount).toFixed(2)}`;

// Custom Modal Component for messages
const ModalMessage = ({ message, isVisible, onClose, primaryColor }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-80 text-center">
                {/* REPLACED hardcoded text color with inline style */}
                <h3 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>Action Successful</h3>
                <p className="text-gray-700 mb-6">{message}</p>
                <button 
                    onClick={onClose} 
                    // REPLACED hardcoded background color with inline style
                    className="text-white py-2 px-4 rounded-lg hover:opacity-80 transition font-semibold"
                    style={{ backgroundColor: primaryColor }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};


// Component for the Client Info
// MODIFIED: Accepts brandingSettings (which contains colors)
const ClientDetailsBlock = ({ details, isEditable, onDetailChange, customers, onSelectCustomer, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    // Determine if the current customer is one of the pre-loaded ones
    const isPreloadedCustomer = customers.some(c => c.id === details.id && details.id !== 'NEW-CLIENT');
    
    return (
        // REPLACED hardcoded border color with inline style
        <div className="mb-4 p-4 border-l-4 bg-gray-50/50 rounded-r-lg" style={{ borderLeftColor: primaryColor }}>
            {/* REPLACED hardcoded text color with inline style */}
            <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Bill To</h3>

            {/* Customer Selection Dropdown - HIDDEN ON PRINT */}
            <div className="mb-4 print:hidden">
                <label className="fex text-xs font-semibold text-gray-700 mb-1 flex items-center">
                    <User size={14} className="mr-1" /> Select Existing Customer:
                </label>
                <select 
                    onChange={(e) => onSelectCustomer(e.target.value)}
                    value={isPreloadedCustomer ? details.id : 'NEW-CLIENT'}
                    // REPLACED hardcoded focus border color with inline style
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 transition"
                    style={{ focusBorderColor: primaryColor, focusRingColor: primaryColor }}
                >
                    <option value="NEW-CLIENT" disabled={isPreloadedCustomer && isEditable}>
                        -- Select or Enter New Customer Details --
                    </option>
                    {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                            {customer.name} ({customer.company})
                        </option>
                    ))}
                </select>
            </div>
            {/* End Customer Selection Dropdown */}

            {/* Client Details Inputs */}
            {Object.entries(details).map(([key, value]) => (
                // Exclude 'id' since it's now displayed in the header
                (key !== 'id') && (
                    <div 
                        key={key} 
                        // CHANGED: Reduced margin from mb-1 to mb-0.5 to reduce line height/spacing
                        className="text-xs flex mb-0.5"
                    >
                        <label className="capitalize font-semibold mr-2 min-w-[100px]">{key.replace(/([A-Z])/g, ' $1').replace('id', 'ID')}:</label>
                        <input 
                            type="text" 
                            value={value} 
                            // Pass the change up
                            onChange={(e) => isEditable && onDetailChange('clientDetails', key, e.target.value)}
                            // REPLACED hardcoded focus border color with inline style
                            className={`flex-1 text-gray-700 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                            style={isEditable ? { borderBottomColor: primaryColor } : {}}
                            readOnly={!isEditable} // Now read-only only if not in edit mode
                        />
                    </div>
                )
            ))}
        </div>
    );
};

// Component for Line Items Table
// MODIFIED: Accepts brandingSettings (which contains colors)
const LineItemsTable = ({ items, isEditable, onItemChange, onDeleteItem, onAddItem, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    return (
      // REDUCED MARGIN: mb-8 -> mb-4
      <div className="mb-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden">
          {/* REPLACED hardcoded background color with inline style */}
          <thead className="text-white" style={{ backgroundColor: primaryColor }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-1/2">DESCRIPTION</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">QTY</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider w-24">UNIT PRICE (R)</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider w-28">AMOUNT (R)</th>
              {isEditable && <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-12 print:hidden"></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2">
                  <input 
                    type="text" 
                    value={item.description}
                    onChange={(e) => onItemChange(index, 'description', e.target.value)}
                    // REPLACED hardcoded focus border color with inline style
                    className={`w-full text-xs text-gray-700 p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                    style={isEditable ? { borderBottomColor: primaryColor } : {}}
                    readOnly={!isEditable}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input 
                    type="number" 
                    value={item.qty}
                    onChange={(e) => onItemChange(index, 'qty', e.target.value)}
                    // REPLACED hardcoded focus border color with inline style
                    className={`w-16 text-xs text-gray-700 text-center p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                    style={isEditable ? { borderBottomColor: primaryColor } : {}}
                    readOnly={!isEditable}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input 
                    type="number" 
                    value={item.unitPrice.toFixed(2)}
                    onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                    // REPLACED hardcoded focus border color with inline style
                    className={`w-24 text-xs text-gray-700 text-right p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                    style={isEditable ? { borderBottomColor: primaryColor } : {}}
                    readOnly={!isEditable}
                  />
                </td>
                {/* REPLACED hardcoded text color with inline style */}
                <td className="px-4 py-2 text-right text-xs font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(item.qty * item.unitPrice)}
                </td>
                {isEditable && (
                  <td className="px-4 py-2 text-center print:hidden">
                    <button onClick={() => onDeleteItem(index)} className="text-red-500 hover:text-red-700 transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {/* HIDDEN ON PRINT */}
        {isEditable && (
          <button 
            onClick={onAddItem} 
            // REPLACED hardcoded text color with inline style
            className="mt-4 hover:opacity-80 text-sm flex items-center font-bold p-2 transition duration-200 bg-gray-100 rounded-lg print:hidden"
            style={{ color: primaryColor }}
          >
            <Plus size={16} className="mr-1" /> Add Line Item
          </button>
        )}
      </div>
    );
};

// Component for Totals Summary
// MODIFIED: Accepts brandingSettings (which contains colors)
const TotalsSummary = ({ totals, isEditable, onTotalChange, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    return (
        <div className="flex justify-end">
            <table className="w-80 border-2 border-gray-300 rounded-lg overflow-hidden">
                <tbody>
                    <tr className="border-t border-gray-200">
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-xs font-medium">SUBTOTAL</td>
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-right text-xs">{formatCurrency(totals.subtotal)}</td>
                    </tr>
                    <tr>
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-xs font-medium flex items-center">
                            TAX RATE (%)
                        </td>
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-right text-xs">
                            <input 
                                type="number" 
                                value={totals.taxRate}
                                onChange={(e) => isEditable && onTotalChange('taxRate', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className={`w-12 text-xs text-gray-700 text-right p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:shadow-none`}
                                style={isEditable ? { borderBottomColor: primaryColor } : {}}
                                readOnly={!isEditable}
                            />%
                        </td>
                    </tr>
                    <tr>
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-xs font-medium">TAX</td>
                        {/* CHANGED: Reduced padding from p-2 to py-1 px-2, and font size from text-sm to text-xs */}
                        <td className="py-1 px-2 text-right text-xs">{formatCurrency(totals.tax)}</td>
                    </tr>
                    {/* REPLACED hardcoded background color with inline style */}
                    <tr className="text-white font-bold" style={{ backgroundColor: primaryColor }}>
                        {/* REDUCED FONT: text-lg -> text-base, kept p-3 */}
                        <td className="p-3 text-base rounded-bl-lg">TOTAL DUE</td>
                        {/* REDUCED FONT: text-lg -> text-base, kept p-3 */}
                        <td className="p-3 text-right text-base rounded-br-lg">{formatCurrency(totals.totalDue)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};


// -------------------------------------------------------------
// NEW: Template Component (Existing Layout) - RENAMED to TemplateModernStyle
// MODIFIED: Accepts brandingSettings and added editable footer
// -------------------------------------------------------------
const TemplateModernStyle = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    // UPDATED: Destructure companyInfo
    const { primaryColor, accentColor, logoUrl, companyName, companyInfo, paymentDetails, contactDetails } = brandingSettings;
    
    // Utility for editable footer inputs
    const EditableFooterInput = ({ label, section, key, value, type = 'text', readOnly }) => (
        <div className='text-xs flex mb-0.5'>
            <span className='font-semibold mr-1 shrink-0'>{label}:</span>
            <input
                type={type}
                value={value}
                onChange={(e) => isEditable && handleTemplateDetailChange(section, key, e.target.value)}
                className={`flex-1 text-gray-700 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                style={isEditable ? { borderBottomColor: primaryColor } : {}}
                readOnly={!isEditable || readOnly}
            />
        </div>
    );

    return (
        // ADDED responsive padding: p-10 -> p-4 sm:p-10
        <div id="document-template" className="relative bg-white p-4 sm:p-10 max-w-4xl mx-auto shadow-2xl border border-gray-100 rounded-lg print:p-6">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-500 opacity-20 transform -rotate-12 select-none border-4 border-red-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* ------------------------------------------------------------- */}
            {/* DOCUMENT HEADER LAYOUT - MADE RESPONSIVE */}
            {/* ------------------------------------------------------------- */}

            {/* Changed flex-container to allow wrap on small screens, and stacked items on smaller screens */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                {/* LEFT SIDE: Logo and Company Info */}
                <div className="flex flex-col items-start max-w-sm mb-4 sm:mb-0">
                    {/* 1. LOGO: Always before company name */}
                    <div className="mb-3">
                        <img 
                            // Use dynamic logoUrl
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg" 
                            // Fallback in case of broken Base64 or URL
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                    </div>
                    
                    {/* 2. Company Info (AFTER logo) - NOW DYNAMIC */}
                    <div className="text-left">
                        {/* REPLACED hardcoded text colors with inline styles */}
                        <p className="text-xl font-bold" style={{ color: primaryColor }}>
                            {/* Dynamically display company name */}
                            {companyName.split(' ')[0]} <span style={{ color: accentColor }}>{companyName.split(' ').slice(1).join(' ')}</span>
                        </p>
                        
                        <p className="text-xs mt-1">{companyInfo.address}</p>
                        <p className="text-xs">Phone: {companyInfo.phone}</p>
                        <p className="text-xs">Email: {companyInfo.email}</p>
                        <p className="text-xs">Vat No. {companyInfo.vatNo}</p>
                    </div>
                </div>

                {/* RIGHT SIDE: Document Details (DOC NO, CUSTOMER ID, DATE, TERMS) */}
                <div className="text-left sm:text-right space-y-2 text-sm w-full sm:w-70">
                    
                    {/* Document Type (e.g., INVOICE) */}
                    {/* REPLACED hardcoded text color with inline style */}
                    <h2 className="text-2xl font-bold mb-4 uppercase" style={{ color: primaryColor }}>
                        {currentDoc.documentType}
                    </h2>
                    
                    {/* DOC NO and CUSTOMER ID - MADE RESPONSIVE */}
                    {/* Added grid-cols-1 on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* DOC NO Column */}
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">DOC NO</p>
                            <input 
                                type="text" 
                                value={currentDoc.documentDetails.docNo} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)}
                                // REPLACED hardcoded text color and focus border color with inline style
                                className={`w-full font-bold p-0.5 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ color: primaryColor, borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        {/* CUSTOMER ID Column */}
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">CUSTOMER ID</p>
                            <input 
                                type="text" 
                                value={currentDoc.clientDetails.id} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('clientDetails', 'id', e.target.value)}
                                // REPLACED hardcoded text color and focus border color with inline style
                                className={`w-full font-bold p-0.5 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ color: primaryColor, borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={true} // ID must remain READ-ONLY
                            />
                        </div>
                    </div>

                    {/* DATE and TERMS - MADE RESPONSIVE */}
                    {/* Added grid-cols-1 on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* DATE Column */}
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">DATE</p>
                            <input 
                                type="date" 
                                value={currentDoc.documentDetails.date} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        {/* TERMS Column */}
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">TERMS</p>
                            <input 
                                type="text" 
                                value={currentDoc.documentDetails.terms} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* REPLACED hardcoded border color with inline style */}
            <hr className="my-4" style={{ borderColor: primaryColor, borderTopWidth: '1px' }}/>
            
            <ClientDetailsBlock 
                details={currentDoc.clientDetails} 
                isEditable={isEditable}
                onDetailChange={handleTemplateDetailChange}
                customers={customerList}
                onSelectCustomer={handleSelectCustomer}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />

            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />

            {/* Totals Summary - Added max-w-full and mx-auto for mobile */}
            <div className='max-w-full mx-auto'> 
                <TotalsSummary 
                    totals={currentDoc.totals} 
                    isEditable={isEditable} 
                    onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                    brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
                />
            </div>
            
            <hr className="my-6 border-gray-300" />
            
            {/* Payment and Contact Details (NOW EDITABLE) - MADE RESPONSIVE */}
            <div className="flex flex-col sm:flex-row justify-between items-start text-xs space-y-4 sm:space-y-0">
                <div>
                    {/* REPLACED hardcoded text color with inline style */}
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Details</h3>
                    
                    {/* Editable Account Holder - UPDATED */}
                    <EditableFooterInput 
                        label="Account Holder" 
                        section="brandingSettings.paymentDetails" 
                        key="accountHolder" 
                        value={paymentDetails.accountHolder} 
                        readOnly={false}
                    />

                    {/* Editable Bank Name - NEW FIELD */}
                    <EditableFooterInput 
                        label="Bank" 
                        section="brandingSettings.paymentDetails" 
                        key="bankName" 
                        value={paymentDetails.bankName} 
                        readOnly={false}
                    />

                    {/* Editable Account Number - UPDATED */}
                    <EditableFooterInput 
                        label="Account Number" 
                        section="brandingSettings.paymentDetails" 
                        key="accountNumber" 
                        value={paymentDetails.accountNumber} 
                        readOnly={false}
                    />

                    {/* Editable Payment Note */}
                    <div className="mt-4 italic" style={{ color: brandingSettings.accentColor }}>
                        {isEditable ? (
                            <input
                                type="text"
                                value={paymentDetails.paymentNote}
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'paymentNote', e.target.value)}
                                className={`w-full p-0.5  border-gray-300 focus:outline-none bg-transparent`}
                                style={{ borderBottomColor: primaryColor }}
                            />
                        ) : (
                            paymentDetails.paymentNote
                        )}
                    </div>
                </div>

                <div className="text-left sm:text-right">
                    <p className="font-bold mb-2">If you have any questions about this document, please contact:</p>
                    
                    {/* START OF EDITED SECTION: Contact Name, Phone, and Email on one line (responsive) */}
                    <div className='text-xs flex flex-col sm:flex-row sm:justify-end sm:space-x-2 flex-wrap'>
                        {/* 1. Contact Name */}
                        <div className='flex items-center mb-0.5 sm:mb-0'>
                            <span className='font-semibold mr-1 shrink-0'>Contact:</span>
                            <input
                                type="text"
                                value={contactDetails.contactName}
                                onChange={(e) => isEditable && handleTemplateDetailChange('brandingSettings.contactDetails', 'contactName', e.target.value)}
                                className={`flex-1 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                                style={isEditable ? { borderBottomColor: primaryColor } : {}}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        {/* 2. Contact Phone */}
                        <div className='flex items-center mb-0.5 sm:mb-0'>
                            <span className='font-semibold mr-1 shrink-0'>Tel:</span>
                            <input
                                type="text"
                                value={contactDetails.contactPhone}
                                onChange={(e) => isEditable && handleTemplateDetailChange('brandingSettings.contactDetails', 'contactPhone', e.target.value)}
                                className={`flex-1 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                                style={isEditable ? { borderBottomColor: primaryColor } : {}}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        {/* 3. Contact Email */}
                        <div className='flex items-center mb-0.5 sm:mb-0'>
                            <span className='font-semibold mr-1 shrink-0'>Email:</span>
                            <input
                                type="text"
                                value={contactDetails.contactEmail}
                                onChange={(e) => isEditable && handleTemplateDetailChange('brandingSettings.contactDetails', 'contactEmail', e.target.value)}
                                // REPLACED hardcoded text color with inline style
                                className={`flex-1 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                                style={{ color: primaryColor, borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                    </div>
                    {/* END OF EDITED SECTION */}

                    {/* Editable Thank You Note */}
                    <div className="mt-4 text-sm font-bold" style={{ color: primaryColor }}>
                        {isEditable ? (
                            <input
                                type="text"
                                value={contactDetails.thankYouNote}
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.contactDetails', 'thankYouNote', e.target.value)}
                                className={`w-full text-left sm:text-right p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
                                style={{ borderBottomColor: primaryColor, color: primaryColor }}
                            />
                        ) : (
                            contactDetails.thankYouNote
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// -------------------------------------------------------------
// NEW: Template Component Style B (Simple Variant) - RENAMED to TemplateSimpleStyle
// MODIFIED: Accepts brandingSettings and added editable footer
// -------------------------------------------------------------
const TemplateSimpleStyle = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    // UPDATED: Destructure companyInfo
    const { primaryColor, logoUrl, companyName, companyInfo, templateBThankYou } = brandingSettings;
    return (
        <div 
            id="document-template" 
            // ADDED responsive padding: p-10 -> p-4 sm:p-10
            className="relative bg-white p-4 sm:p-10 max-w-4xl mx-auto shadow-2xl rounded-none print:p-6"
            // REPLACED hardcoded border color with inline style
            style={{ borderColor: primaryColor, borderWidth: '2px', borderStyle: 'solid' }}
        >
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-700 opacity-20 transform -rotate-12 select-none border-4 border-red-700 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}

            {/* Header - Simple Style - MADE RESPONSIVE */}
            {/* flex-col on mobile, flex-row on md screens */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-4 border-gray-300 pb-4">
                <div className="mb-4 md:mb-0">
                    {/* REPLACED hardcoded text color with inline style */}
                    <h1 className="text-4xl font-extrabold uppercase" style={{ color: primaryColor }}>{currentDoc.documentType}</h1>
                    <p className="text-sm text-gray-600 mt-2">Document No: <span className='font-semibold'>{currentDoc.documentDetails.docNo}</span></p>
                    <p className="text-sm text-gray-600">Date: <span className='font-semibold'>{currentDoc.documentDetails.date}</span></p>
                </div>
                
                {/* Right side: Logo & Company Info */}
                <div className='flex flex-col items-start md:items-end text-left md:text-right'>
                    <img 
                        src={logoUrl}
                        alt="Company Logo" 
                        className="w-auto max-w-[120px] max-h-[50px] mb-2 rounded-lg" 
                        onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='50'><rect width='120' height='50' fill='%23ccc'/><text x='60' y='30' font-size='10' text-anchor='middle' fill='%23666'>Logo</text></svg>"; }}
                    />
                    <p className="text-sm font-bold text-gray-800">{companyName}</p>
                    <p className="text-xs text-gray-600">{companyInfo.address}</p>
                </div>
            </div>
            
            {/* Client Details (Simplified for Template B) - MADE RESPONSIVE */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 space-y-4 md:space-y-0">
                {/* BILL TO */}
                {/* REPLACED hardcoded border color with inline style */}
                <div className="w-full md:w-1/2 md:pr-8 md:border-r border-gray-200" style={{ borderRightColor: primaryColor }}>
                    <h3 className="text-sm font-bold mb-2 uppercase text-gray-700">Bill To</h3>
                    <p className="text-sm font-semibold">{currentDoc.clientDetails.name} ({currentDoc.clientDetails.company})</p>
                    <p className="text-xs text-gray-600">{currentDoc.clientDetails.address}</p>
                    <p className="text-xs text-gray-600">{currentDoc.clientDetails.cityStateZip}</p>
                    <p className="text-xs text-gray-600">{currentDoc.clientDetails.email}</p>
                </div>
                
                {/* OTHER DOC DETAILS */}
                <div className="w-full md:w-1/2 md:pl-8">
                    <h3 className="text-sm font-bold mb-2 uppercase text-gray-700">Details</h3>
                    <div className="space-y-1">
                        <p className="text-xs">
                            <span className="font-semibold">VAT No:</span> {companyInfo.vatNo}
                        </p>
                        <p className="text-xs">
                            <span className="font-semibold">Terms:</span> {currentDoc.documentDetails.terms}
                        </p>
                        {/* New Payment Details Display (Simplified) */}
                        <p className="text-xs pt-2">
                            <span className="font-semibold" style={{ color: primaryColor }}>
                                Payment:
                            </span> {brandingSettings.paymentDetails.accountHolder} - {brandingSettings.paymentDetails.bankName} Acc: {brandingSettings.paymentDetails.accountNumber}
                        </p>
                        
                    </div>
                </div>
            </div>

            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />

            {/* Totals Summary - Added max-w-full and mx-auto for mobile */}
            <div className='max-w-full mx-auto'> 
                <TotalsSummary 
                    totals={currentDoc.totals} 
                    isEditable={isEditable} 
                    onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                    brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
                />
            </div>
            
            <hr className="my-6 border-gray-200" />
            
            {/* Footer - Simple Thank You Note */}
            <div className="text-center">
                {/* Editable Thank You Note */}
                <div className="mt-4 text-sm font-bold" style={{ color: primaryColor }}>
                    {isEditable ? (
                        <input
                            type="text"
                            value={templateBThankYou}
                            onChange={(e) => handleTemplateDetailChange('brandingSettings', 'templateBThankYou', e.target.value)}
                            className={`w-full text-center p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
                            style={{ borderBottomColor: primaryColor, color: primaryColor }}
                        />
                    ) : (
                        templateBThankYou
                    )}
                </div>
            </div>

        </div>
    );
};


// -------------------------------------------------------------
// TEMPLATE SWITCHER - UPDATED WITH NEW NAMES
// -------------------------------------------------------------
const DocumentTemplate = (props) => {
    switch (props.currentDoc.templateStyle) {
        case 'SimpleStyle': // Renamed from StyleB
            return <TemplateSimpleStyle {...props} />; // Renamed component
        case 'ModernStyle': // Renamed from StyleA
        default:
            return <TemplateModernStyle {...props} />; // Renamed component
    }
};

// -------------------------------------------------------------
// MAIN APP COMPONENT
// -------------------------------------------------------------
const App = () => {
    // Helper to calculate totals based on line items and tax rate
    const recalculateTotals = (items, taxRate) => {
        const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        const tax = subtotal * (taxRate / 100);
        const totalDue = subtotal + tax;
        return { subtotal, taxRate, tax, totalDue };
    };

    // State for Authentication
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null); // The Firebase user ID
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // State for Branding/Color Settings (MODIFIED to use getInitialState for deep merge)
    const [brandingSettings, setBrandingSettings] = useState(getInitialState('brandingSettings', defaultBrandingSettings));
    
    // Use the loaded default template style for initial document state
    const defaultTemplateFromBranding = brandingSettings.defaultTemplateStyle || 'ModernStyle'; // Updated fallback

    // State for Document Data
    const [documentLedger, setDocumentLedger] = useState(getInitialState('documentLedger', sampleLedger));
    const [customerList, setCustomerList] = useState(getInitialState('customerList', tempSampleCustomers));
    const [currentDoc, setCurrentDoc] = useState(initialData('Invoice', null, defaultTemplateFromBranding));
    
    // UI State
    const [sectionTitle, setSectionTitle] = useState('Invoices'); // Current view: 'Invoices', 'Quotations', 'Receipts', 'Customers'
    const [isEditable, setIsEditable] = useState(false);
    const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [modal, setModal] = useState({ isVisible: false, message: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditButtonHovered, setIsEditButtonHovered] = useState(false); // New state for hover effect

    // Refs for file inputs
    const logoInputRef = useRef(null);
    const fileInputRef = useRef(null); // For data upload

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                setIsLoggedIn(true);
                setUserId(user.uid);
                // Load data specific to this user/session if needed
            } else {
                // User is signed out
                setIsLoggedIn(false);
                setUserId(null);
            }
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);


    // Save data to localStorage whenever it changes
    useEffect(() => {
        // Only save state if a user is logged in (simple persistence proxy)
        if (isLoggedIn) {
            localStorage.setItem('documentLedger', JSON.stringify(documentLedger));
            localStorage.setItem('customerList', JSON.stringify(customerList));
            localStorage.setItem('brandingSettings', JSON.stringify(brandingSettings));
        }
    }, [documentLedger, customerList, brandingSettings, isLoggedIn]);


    // Recalculate totals whenever line items or tax rate changes
    useEffect(() => {
        const { lineItems, totals } = currentDoc;
        const newTotals = recalculateTotals(lineItems, totals.taxRate);
        
        // Prevent infinite loop by checking if totals actually changed before setting state
        if (newTotals.subtotal !== totals.subtotal || newTotals.tax !== totals.tax || newTotals.totalDue !== totals.totalDue) {
            setCurrentDoc(prevDoc => ({
                ...prevDoc,
                totals: newTotals
            }));
        }
    }, [currentDoc.lineItems, currentDoc.totals.taxRate]); // Dependency on lineItems and taxRate

    // Utility to show modal messages
    const showModal = (message) => {
        setModal({ isVisible: true, message });
    };

    // Refactored Handler for Firebase Login
    const handleLogin = async () => {
        setLoginError(''); // Clear previous errors
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener handles setting isLoggedIn/userId
            showModal('Login successful!');
        } catch (error) {
            // Firebase error codes are specific. We can generalize the message.
            const errorMessage = error.message.includes('auth/invalid-credential') 
                ? 'Invalid email or password. Please try again.' 
                : error.message;
            setLoginError(errorMessage);
        }
    };

    // Refactored Handler for Firebase Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Auth state listener (onAuthStateChanged) will handle setting isLoggedIn and userId to UNAUTHENTICATED/false.
            showModal('You have been successfully logged out!');
        } catch (error) {
            console.error("Firebase Logout Error:", error.message);
            showModal(`Logout failed: ${error.message}`);
        }
    };

    // MODIFIED: Generic handler for detail changes, including nested branding settings
    const handleTemplateDetailChange = (section, key, value) => {
        // 1. Check if the section refers to brandingSettings (using dot notation for nesting)
        if (section.startsWith('brandingSettings')) {
            setBrandingSettings(prev => {
                const parts = section.split('.'); // e.g., ['brandingSettings', 'paymentDetails']
                let newState = { ...prev };
                
                if (parts.length === 1) {
                    // Top-level branding change (e.g., 'companyName' or 'defaultTemplateStyle')
                    newState = { ...newState, [key]: value };
                } else if (parts.length === 2 && newState[parts[1]]) {
                    // Nested branding change (e.g., 'brandingSettings.paymentDetails')
                    const nestedKey = parts[1];
                    newState[nestedKey] = {
                        ...newState[nestedKey],
                        [key]: value
                    };
                }
                return newState;
            });
            return;
        }

        // 2. Handle normal document changes
        setCurrentDoc(prevDoc => {
            if (prevDoc[section]) {
                return {
                    ...prevDoc,
                    [section]: {
                        ...prevDoc[section],
                        [key]: value
                    }
                };
            }
            return prevDoc;
        });
    };
    
    // Handler specifically for branding settings (top-level properties only)
    const handleBrandingChange = (key, value) => {
        // This is a simpler version that can be used for top-level branding properties only (colors, name, logoUrl)
        setBrandingSettings(prev => ({
            ...prev,
            [key]: value,
        }));
    };


    const handleLineItemChange = useCallback((index, key, value) => {
        setCurrentDoc(prevDoc => {
            const newItems = prevDoc.lineItems.map((item, i) => {
                if (i === index) {
                    // Ensure quantities and prices are numbers
                    let newValue = value;
                    if (key === 'qty' || key === 'unitPrice') {
                        // Parse as float, fallback to 0 if invalid
                        newValue = parseFloat(value) || 0;
                    }

                    const updatedItem = { ...item, [key]: newValue };
                    // Recalculate amount for the updated item
                    updatedItem.amount = updatedItem.qty * updatedItem.unitPrice;
                    return updatedItem;
                }
                return item;
            });

            // Recalculate totals based on new items and existing tax rate
            const newTotals = recalculateTotals(newItems, prevDoc.totals.taxRate);

            return {
                ...prevDoc,
                lineItems: newItems,
                totals: newTotals,
            };
        });
    }, [recalculateTotals]);

    const handleAddItem = () => {
        setCurrentDoc(prevDoc => {
            const newItem = { description: 'New Line Item', qty: 1, unitPrice: 0.00, amount: 0.00 };
            const newItems = [...prevDoc.lineItems, newItem];
            const newTotals = recalculateTotals(newItems, prevDoc.totals.taxRate);

            return {
                ...prevDoc,
                lineItems: newItems,
                totals: newTotals,
            };
        });
    };

    const handleDeleteItem = (index) => {
        setCurrentDoc(prevDoc => {
            const newItems = prevDoc.lineItems.filter((_, i) => i !== index);
            const newTotals = recalculateTotals(newItems, prevDoc.totals.taxRate);

            return {
                ...prevDoc,
                lineItems: newItems,
                totals: newTotals,
            };
        });
    };

    // Handler for selecting an existing customer
    const handleSelectCustomer = (customerId) => {
        const customer = customerList.find(c => c.id === customerId);
        if (customer) {
            setCurrentDoc(prevDoc => ({
                ...prevDoc,
                clientDetails: customer,
            }));
        }
    };
    
    // Handler for saving the current document
    const saveCurrentDocument = () => {
        // Ensure a doc number is generated if it's the initial temporary one (999)
        if (currentDoc.documentDetails.docNo.includes('999')) {
            const newSequence = documentLedger.length + 1; // Simple sequence counter
            const newDocId = generateDateBasedID('RS', newSequence);

            const newDoc = {
                ...currentDoc,
                id: newDocId, // Update the unique ID
                documentDetails: {
                    ...currentDoc.documentDetails,
                    docNo: newDocId, // Update the document number
                },
                // Documents created from scratch start as Draft/Outstanding/Pending unless its a Receipt
                status: currentDoc.documentType === 'Receipt' ? 'Paid' : (currentDoc.documentType === 'Quotation' ? 'Pending' : 'Outstanding'),
            };

            // Add the new document to the ledger
            setDocumentLedger(prevLedger => [
                newDoc,
                ...prevLedger, // Add new documents to the start of the list
            ]);
            
            setCurrentDoc(newDoc); // Load the finalized document back into the editor
            showModal(`New ${newDoc.documentType} ${newDoc.documentDetails.docNo} saved successfully!`);

        } else {
            // Update existing document in the ledger
            setDocumentLedger(prevLedger => prevLedger.map(doc => doc.id === currentDoc.id ? currentDoc : doc));
            showModal(`${currentDoc.documentType} ${currentDoc.documentDetails.docNo} updated successfully!`);
        }
        setIsEditable(false); // Disable editing after save
    };
    
    // Handler for creating a new document of a specified type
    const createNewDocument = (docType) => {
        setCurrentDoc(initialData(docType, null, brandingSettings.defaultTemplateStyle)); // Use the default template from branding
        setIsEditable(true);
        setIsDropdownOpen(false); // Close the 'New' dropdown
        setSectionTitle(docType === 'Invoice' ? 'Invoices' : (docType === 'Quotation' ? 'Quotations' : 'Receipts'));
        setIsSidebarOpen(false); // Close sidebar on mobile
    };

    // Function to filter documents for display in the sidebar
    const getFilteredDocs = (title) => {
        if (title === 'Customers') {
            return customerList; // Return the customer list for the customer view
        }
        
        const typeMap = {
            'Invoices': 'Invoice',
            'Quotations': 'Quotation',
            'Receipts': 'Receipt',
        };
        const docType = typeMap[title];
        
        // Filter by document type
        return documentLedger.filter(doc => doc.documentType === docType)
                             .sort((a, b) => new Date(b.documentDetails.date) - new Date(a.documentDetails.date)); // Sort by date descending
    };

    // Handler to load a document from the sidebar list
    const loadDocumentFromLedger = (docId) => {
        const docToLoad = documentLedger.find(doc => doc.id === docId);
        if (docToLoad) {
            // Ensure the loaded document has a templateStyle for safety
            const safeDocToLoad = { ...docToLoad, templateStyle: docToLoad.templateStyle || 'ModernStyle' }; // Updated fallback
            setCurrentDoc(safeDocToLoad);
            // Documents loaded from the ledger are not editable by default
            setIsEditable(false);
            // Close dropdown if open
            setIsDropdownOpen(false);
            // Close sidebar on mobile after selection
            setIsSidebarOpen(false);
        }
    };
    
    // Placeholder for marking an invoice as paid and moving to Receipts
    const markAsPaid = () => {
        if (currentDoc.documentType === 'Invoice' && currentDoc.status === 'Outstanding') {
            // 1. Update the document's type and status
            const paidDoc = { 
                ...currentDoc, 
                documentType: 'Receipt', 
                status: 'Paid', 
                documentDetails: { 
                    ...currentDoc.documentDetails, 
                    isPaid: true, 
                    stampText: 'PAID' 
                } 
            };
            
            // 2. Update the Ledger with the paid document
            setDocumentLedger(prevLedger => prevLedger.map(doc => doc.id === paidDoc.id ? paidDoc : doc) );
            
            // 3. Load the paid document into the editor
            setCurrentDoc(paidDoc);
            setIsEditable(false);
            showModal(`Invoice ${paidDoc.documentDetails.docNo} marked as Paid and updated in the Receipts ledger!`);
        }
    };

    // NEW: Handler for marking a quotation as approved/converted to an invoice
    const handleApproveQuotation = () => {
        if (currentDoc.documentType === 'Quotation' && currentDoc.status === 'Pending') {
            // 1. Convert to Invoice
            const invoiceDoc = { 
                ...currentDoc, 
                documentType: 'Invoice', 
                status: 'Outstanding', // New invoices are outstanding
                documentDetails: { 
                    ...currentDoc.documentDetails, 
                    isPaid: false, // Invoices are not paid by default
                    stampText: '', 
                } 
            };
            
            // 2. Update the Ledger (This replaces the old quotation document)
            setDocumentLedger(prevLedger => prevLedger.map(doc => doc.id === invoiceDoc.id ? invoiceDoc : doc) );
            
            // 3. Load the new invoice into the editor
            setCurrentDoc(invoiceDoc);
            setIsEditable(false);
            showModal(`Quotation ${invoiceDoc.documentDetails.docNo} approved and converted to an Outstanding Invoice!`);
        }
    };

    // Handler for logo file input click
    const handleLogoUploadClick = () => {
        logoInputRef.current.click();
    };

    // Handler for logo file selection
    const handleLogoFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Update branding settings with the Base64 URL
                handleBrandingChange('logoUrl', reader.result);
            };
            reader.readAsDataURL(file); // Convert file to Base64 data URL
            showModal('Logo uploaded successfully!');
        }
    };

    // Function to handle data backup (download)
    const handleDownloadData = () => {
        // Construct the full data object
        const backupData = {
            documentLedger: documentLedger,
            customerList: customerList,
            userId: userId,
            brandingSettings: brandingSettings, // INCLUDE BRANDING SETTINGS
            // currentDoc is intentionally excluded as it's an editor state, not core data
        };

        const jsonString = JSON.stringify(backupData, null, 2); // prettify the JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = `RS_Finance_Backup_${new Date().toISOString().split('T')[0]}.json`;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showModal('Application data backup downloaded successfully!');
    };

    // Function to trigger the file input dialog
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    // Function to handle the file selection and upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const uploadedData = JSON.parse(e.target.result);
                
                // Basic validation and safe assignment
                if (uploadedData.documentLedger && Array.isArray(uploadedData.documentLedger)) {
                    setDocumentLedger(uploadedData.documentLedger);
                }
                if (uploadedData.customerList && Array.isArray(uploadedData.customerList)) {
                    setCustomerList(uploadedData.customerList);
                }
                
                // Update userId, but do NOT set isLoggedIn state directly.
                // The Firebase listener should manage isLoggedIn based on the auth session.
                if (uploadedData.userId) {
                    setUserId(uploadedData.userId);
                }
                
                if (uploadedData.brandingSettings) {
                    // Use a functional update to safely merge old defaults with uploaded data
                    setBrandingSettings(getInitialState('brandingSettings', uploadedData.brandingSettings));
                }
                
                showModal('Application data restored successfully!');

            } catch (error) {
                console.error("Error parsing or restoring file:", error);
                showModal('Error restoring data: Invalid file format.');
            }
        };
        reader.readAsText(file);

        // Clear the input value so the same file can be uploaded again
        event.target.value = null;
    };

    // Counts for sidebar badges
    const invoiceCount = getFilteredDocs('Invoices').length;
    const quotationCount = getFilteredDocs('Quotations').length;
    const receiptCount = getFilteredDocs('Receipts').length;
    const customerCount = customerList.length;

    const navItems = [
        { title: 'Invoices', icon: DollarSign, count: invoiceCount },
        { title: 'Quotations', icon: FileText, count: quotationCount },
        { title: 'Receipts', icon: Save, count: receiptCount },
        { title: 'Customers', icon: Users, count: customerCount },
    ];

    // --- Login Screen (UPDATED FOR FIREBASE) ---
    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-8 bg-white shadow-xl rounded-xl w-96">
                    {/* REPLACED hardcoded text color with inline style */}
                    <h2 className="text-3xl font-extrabold mb-6 text-center" style={{ color: brandingSettings.primaryColor }}>RS Finance Login</h2>
                    
                    {/* Display Error Message */}
                    {loginError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium">
                            {loginError}
                        </div>
                    )}
                    
                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input 
                                type="email" 
                                placeholder="user@rsfinance.co.za" 
                                required 
                                value={email} // BIND STATE
                                onChange={(e) => setEmail(e.target.value)} // UPDATE STATE
                                // REPLACED hardcoded focus border color with inline style
                                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input 
                                type="password" 
                                placeholder="Enter password" 
                                required 
                                value={password} // BIND STATE
                                onChange={(e) => setPassword(e.target.value)} // UPDATE STATE
                                // REPLACED hardcoded focus border color with inline style
                                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            // REPLACED hardcoded background color with inline style
                            className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200"
                            style={{ backgroundColor: brandingSettings.primaryColor }}
                        >
                            <LogIn size={20} className="inline mr-2" /> Log In
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    // --- Main Application UI ---
    return (
        <div className="flex min-h-screen bg-gray-50 print:block">
            
            <ModalMessage 
                message={modal.message} 
                isVisible={modal.isVisible} 
                onClose={() => setModal({ isVisible: false, message: '' })} 
                primaryColor={brandingSettings.primaryColor}
            />

            {/* Branding Settings Modal */}
            {isBrandingSettingsOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 print:hidden">
                    {/* Max width and size adjustment */}
                    <div className="p-4 rounded-lg shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-[90vh] overflow-y-auto w-11/12 max-w-lg">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 border-b pb-1">Customize Branding</h4>
                        
                        {/* 1. Company Name */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                <User2 size={14} className='mr-1' /> Company Name:
                            </label>
                            <input 
                                type="text" 
                                value={brandingSettings.companyName} 
                                onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                        
                        {/* 2. Logo Upload/URL */}
                        <div className="mb-4 border-t pt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <ImageIcon size={14} className='mr-1' /> Logo Upload:
                            </label>
                            <div className='flex space-x-2 items-center'>
                                <button 
                                    // REPLACED hardcoded background color with inline style
                                    onClick={handleLogoUploadClick} 
                                    className='shrink-0 text-white py-1 px-3 rounded-lg text-sm hover:opacity-80 transition'
                                    style={{ backgroundColor: brandingSettings.primaryColor }}
                                >
                                    Upload File
                                </button>
                                <img src={brandingSettings.logoUrl} alt="Current Logo" className='w-12 h-12 object-contain border rounded' />
                            </div>
                            <input 
                                type="file" 
                                ref={logoInputRef} 
                                onChange={handleLogoFileUpload} 
                                className="hidden" 
                                accept="image/*"
                            />
                            <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">Logo URL / Base64:</label>
                            <textarea 
                                value={brandingSettings.logoUrl} 
                                onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs h-16 resize-none focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                placeholder="Paste Image URL or Base64 content here..."
                            />
                        </div>

                        {/* 3. Company Info Details (address, phone, email, vatNo) - Grid Layout */}
                        <div className="mb-4 border-t pt-4">
                             <h5 className="text-xs font-bold text-gray-700 mb-2">Company Information</h5>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                {Object.entries(brandingSettings.companyInfo).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</label>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', key, e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                            style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Payment Details Section (New Addition) */}
                        <div className="mb-4 border-t pt-4">
                             <h5 className="text-xs font-bold text-gray-700 mb-2">Payment Details (Editable Footer Info)</h5>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                {/* Account Holder */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Holder:</label>
                                    <input
                                        type="text"
                                        value={brandingSettings.paymentDetails.accountHolder}
                                        onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'accountHolder', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                                {/* Bank Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name:</label>
                                    <input
                                        type="text"
                                        value={brandingSettings.paymentDetails.bankName}
                                        onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'bankName', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                                {/* Account Number */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number:</label>
                                    <input
                                        type="text"
                                        value={brandingSettings.paymentDetails.accountNumber}
                                        onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'accountNumber', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                                {/* Payment Note */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Note:</label>
                                    <input
                                        type="text"
                                        value={brandingSettings.paymentDetails.paymentNote}
                                        onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'paymentNote', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                            </div>
                        </div>


                        {/* 5. Template Selection (Default) - UPDATED TO USE 6 OPTIONS */}
                        <div className="mb-4 border-t pt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <Layout size={14} className='mr-1' /> Default Document Template:
                            </label>
                            <select 
                                value={brandingSettings.defaultTemplateStyle}
                                onChange={(e) => handleBrandingChange('defaultTemplateStyle', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            >
                                {TemplateOptions.map(option => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {TemplateOptions.find(o => o.id === brandingSettings.defaultTemplateStyle)?.description || 'Select a template style.'}
                            </p>
                        </div>

                        {/* 6. Color Pickers */}
                        <div className="flex space-x-4 border-t pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Color (Headers/Main):</label>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="color" 
                                        value={brandingSettings.primaryColor} 
                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} 
                                        className="w-8 h-8 rounded-full border-none p-0 cursor-pointer" 
                                    />
                                    <input 
                                        type="text" 
                                        value={brandingSettings.primaryColor} 
                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} 
                                        // REPLACED hardcoded focus border color with inline style
                                        className="flex-1 p-1 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Accent Color (Logo/Highlight):</label>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="color" 
                                        value={brandingSettings.accentColor} 
                                        onChange={(e) => handleBrandingChange('accentColor', e.target.value)} 
                                        className="w-8 h-8 rounded-full border-none p-0 cursor-pointer" 
                                    />
                                    <input 
                                        type="text" 
                                        value={brandingSettings.accentColor} 
                                        onChange={(e) => handleBrandingChange('accentColor', e.target.value)} 
                                        // REPLACED hardcoded focus border color with inline style
                                        className="flex-1 p-1 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                        style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => setIsBrandingSettingsOpen(false)} 
                            className="mt-6 w-full py-2 bg-gray-200 rounded-lg text-gray-800 font-semibold hover:bg-gray-300 transition"
                        >
                            Close Settings
                        </button>
                    </div>
                </div>
            )}


            {/* 1. SIDEBAR NAVIGATION - UPDATED FOR RESPONSIVENESS AND COUNTS */}
            <div 
                // Conditional classes for mobile sidebar overlay vs. desktop fixed sidebar
                className={`w-64 p-4 flex-shrink-0 flex-col shadow-xl print:hidden ${isSidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden md:flex'}` }
                style={{ backgroundColor: brandingSettings.primaryColor }}
            >
                
                {/* Mobile Close Button */}
                <button 
                    onClick={() => setIsSidebarOpen(false)} 
                    className="md:hidden absolute top-4 right-4 text-white hover:opacity-80 z-50"
                >
                    <X size={24} />
                </button>

                {/* Logo/Title */}
                <div className="mb-6 pt-2 pb-4 border-b border-white/20">
                    <h1 className="text-xl font-bold text-white">
                        {brandingSettings.companyName.split(' ')[0]} 
                        <span style={{ color: brandingSettings.accentColor }}> 
                            {brandingSettings.companyName.split(' ').slice(1).join(' ')}
                        </span>
                    </h1>
                    <p className='text-xs text-white/70'>Finance Manager</p>
                </div>

                {/* Primary Navigation - Document Types */}
                <nav className="space-y-1">
                    {navItems.map(item => (
                        <div 
                            key={item.title}
                            onClick={() => {
                                setSectionTitle(item.title);
                                setSearchQuery(''); // Clear search when switching sections
                                setIsSidebarOpen(false); // Close sidebar on mobile after selection
                            }}
                            // Dynamic background color for selected section
                            className={`flex items-center p-3 text-sm font-medium rounded-lg transition duration-150 cursor-pointer ${
                                sectionTitle === item.title 
                                    ? 'text-gray-900 shadow-md'
                                    : 'text-white/90 hover:bg-white/20'
                            }`}
                            style={sectionTitle === item.title ? { backgroundColor: 'white' } : {}}
                        >
                            <item.icon 
                                size={20} 
                                className="mr-3" 
                                // Dynamic icon color for selected section
                                style={sectionTitle === item.title ? { color: brandingSettings.primaryColor } : { color: 'white' }}
                            />
                            <span className="flex-1">
                                {item.title}
                            </span>
                            {/* Badge with Count */}
                            <span 
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    sectionTitle === item.title 
                                        ? 'text-white' 
                                        : 'bg-white text-gray-900'
                                }`}
                                style={sectionTitle === item.title ? { backgroundColor: brandingSettings.accentColor } : {}}
                            >
                                {item.count}
                            </span>
                        </div>
                    ))}
                </nav>

                {/* Search Bar for Documents/Customers */}
                <div className="mt-6 mb-4 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={`Search ${sectionTitle.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 text-sm rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-white bg-white/90 text-gray-800"
                    />
                </div>
                
                {/* Secondary Navigation - Document List / Customer List (Removed redundant count badge from Customers header) */}
                <nav className="flex-1 overflow-y-auto space-y-4 pr-1 text-white/90">
                    {/* List of documents/customers */}
                    {sectionTitle === 'Customers' ? (
                        // Customer List View
                        <div key="Customers">
                            {/* Removed count badge from H3 as it's now in the main navigation */}
                            <h3 className="flex items-center p-2 text-sm font-bold uppercase border-b border-white/20 mb-1">
                                CUSTOMERS
                            </h3>
                            <div className="space-y-1 pl-4">
                                {getFilteredDocs('Customers')
                                    .filter(c => 
                                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        c.company.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map(customer => (
                                    <div 
                                        key={customer.id} 
                                        className="block p-1 text-xs rounded-lg transition duration-100 hover:bg-white/10"
                                        title={customer.company}
                                        onClick={() => {
                                            // Create a dummy document to view the customer details in the editor if needed
                                            setCurrentDoc(initialData('Invoice', null, brandingSettings.defaultTemplateStyle));
                                            handleSelectCustomer(customer.id);
                                            setIsEditable(false);
                                            setIsSidebarOpen(false);
                                        }}
                                    >
                                        <p className='font-bold'>{customer.name}</p>
                                        <p className='text-white/70'>{customer.company}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Document List View
                        ['Invoices', 'Quotations', 'Receipts'].map(title => {
                            // Filter the ledger based on the section title
                            if (title !== sectionTitle) return null; // Only show the current section
                            
                            const filteredDocs = getFilteredDocs(title)
                                .filter(doc => 
                                    // Simple search filter by document number, customer company, or name
                                    doc.documentDetails.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    doc.clientDetails.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    doc.clientDetails.name.toLowerCase().includes(searchQuery.toLowerCase())
                                );

                            return (
                                <div key={title}>
                                    <h3 className="flex items-center p-2 text-sm font-bold uppercase border-b border-white/20 mb-1">
                                        {title}
                                    </h3>
                                    <div className="space-y-1 pl-4">
                                        {filteredDocs.length > 0 ? (
                                            filteredDocs.map(doc => (
                                                <div 
                                                    key={doc.id} 
                                                    className={`block p-1 text-xs rounded-lg transition duration-100 hover:bg-white/10 cursor-pointer ${currentDoc.id === doc.id ? 'bg-white/30' : ''}`}
                                                    onClick={() => loadDocumentFromLedger(doc.id)}
                                                >
                                                    <p className='font-bold'>{doc.documentDetails.docNo}</p>
                                                    <p className='text-white/70'>{doc.clientDetails.company} - {doc.clientDetails.name}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className='p-2 text-xs text-white/50'>No {title.toLowerCase()} found.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </nav>

                {/* Footer Controls */}
                <div className="mt-auto pt-4 border-t border-white/20 space-y-2">
                    {/* Display User ID */}
                    <div className="text-white/70 text-xs p-2 break-all bg-white/10 rounded-lg">
                        <span className="font-semibold block mb-1">Current User ID:</span>
                        {userId}
                    </div>

                    <button 
                        onClick={() => setIsEditable(prev => !prev)} 
                        onMouseEnter={() => setIsEditButtonHovered(true)} // ADDED: Set hover state to true
                        onMouseLeave={() => setIsEditButtonHovered(false)} // ADDED: Set hover state to false
                        // UPDATED: Dynamic classes for background hover effect when active
                        className={`w-full flex items-center p-2 text-sm font-medium rounded-lg transition duration-150 ${isEditable ? 'shadow-md hover:bg-gray-100' : ''}` // Added hover:bg-gray-100 for visual feedback when active
                        }
                        style={
                            isEditable // Active State (Editing ENABLED)
                            ? { 
                                backgroundColor: 'white', 
                                color: brandingSettings.primaryColor, 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            }
                            // Inactive State (Editing DISABLED) - Handles hover to change text/bg color
                            : { 
                                backgroundColor: isEditButtonHovered ? 'white' : 'transparent', 
                                color: isEditButtonHovered ? brandingSettings.primaryColor : 'white',
                            }
                        }
                    >
                        <Edit size={16} className="mr-3" /> 
                        {isEditable ? 'Editing ENABLED' : 'Editing DISABLED'}
                    </button>
                    
                    <button 
                        onClick={() => setIsBrandingSettingsOpen(true)} 
                        className="w-full flex items-center p-2 mt-2 text-sm font-medium text-white rounded-lg hover:bg-white/20 transition duration-150"
                    >
                        <Settings size={16} className="mr-3" /> Branding Settings
                    </button>
                    
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center p-2 mt-2 text-sm font-medium text-white rounded-lg hover:bg-white/20 transition duration-150"
                    >
                        <LogIn size={16} className="mr-3" /> Log Out
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex flex-col grow min-h-screen">
                
                {/* 3. TOOLBAR - UPDATED FOR RESPONSIVENESS */}
                <div className="shrink-0 p-4 bg-white shadow-md flex justify-between items-center print:hidden">
                    
                    {/* Mobile Menu Button */}
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="md:hidden text-gray-700 hover:text-gray-900 transition mr-4"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Left Section (Current Document Info) */}
                    <div className='flex items-center space-x-4 flex-1 overflow-hidden'>
                        {/* REPLACED hardcoded text color with inline style */}
                        <h2 className="text-xl font-bold uppercase truncate" style={{ color: brandingSettings.primaryColor }}>
                            {currentDoc.documentType} 
                            <span className='font-normal text-gray-500 text-sm ml-2'>
                                {currentDoc.documentDetails.docNo.includes('TEMP') ? '(Draft)' : currentDoc.documentDetails.docNo}
                            </span>
                        </h2>

                        {/* Status Badge */}
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap hidden sm:block ${
                            currentDoc.status === 'Paid' ? 'bg-green-100 text-green-700' :
                            currentDoc.status === 'Outstanding' ? 'bg-red-100 text-red-700' :
                            currentDoc.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {currentDoc.status}
                        </span>
                    </div>

                    {/* Right Section (Actions) - Made responsive with hidden/show on small screens */}
                    <div className="flex items-center space-x-2 shrink-0">

                        {/* Save Button (Conditional) */}
                        {isEditable && (
                            <button 
                                onClick={saveCurrentDocument}
                                // REPLACED hardcoded background color with inline style
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md text-sm"
                                style={{ backgroundColor: brandingSettings.primaryColor, hover: { opacity: 0.9 } }}
                            >
                                <Save size={16} className="mr-2 hidden sm:block" /> Save
                            </button>
                        )}

                        {/* New Document Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsDropdownOpen(prev => !prev)} 
                                className="flex items-center text-gray-700 bg-gray-100 py-2 px-4 rounded-lg font-semibold transition hover:bg-gray-200 text-sm"
                            >
                                <Plus size={16} className="mr-2 hidden sm:block" /> New
                                <ChevronDown size={16} className="ml-1" />
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-30">
                                    <button 
                                        onClick={() => createNewDocument('Invoice')} 
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                                    >
                                        <FileText size={16} className="inline mr-2" /> New Invoice
                                    </button>
                                    <button 
                                        onClick={() => createNewDocument('Quotation')} 
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                                    >
                                        <FileText size={16} className="inline mr-2" /> New Quotation
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Approve Quotation Button (Conditional) */}
                        {currentDoc.documentType === 'Quotation' && currentDoc.status === 'Pending' && (
                            <button 
                                onClick={handleApproveQuotation} 
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md bg-green-500 hover:bg-green-600 text-sm"
                            >
                                <Save size={16} className="mr-2 hidden sm:block" /> Approve
                            </button>
                        )}
                        
                        {/* Mark as Paid Button (Conditional) */}
                        {currentDoc.documentType === 'Invoice' && currentDoc.status === 'Outstanding' && (
                            <button 
                                onClick={markAsPaid} 
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md bg-yellow-600 hover:bg-yellow-700 text-sm"
                            >
                                <DollarSign size={16} className="mr-2 hidden sm:block" /> Mark Paid
                            </button>
                        )}


                        {/* Print Button */}
                        <button 
                            onClick={() => window.print()} 
                            // REPLACED hardcoded styles with inline styles
                            className="flex items-center py-2 px-4 rounded-lg font-semibold transition hover:opacity-90 text-sm"
                            style={{ backgroundColor: brandingSettings.accentColor, color: brandingSettings.primaryColor }}
                        >
                            <FileText size={20} className="mr-1 sm:mr-2" /> 
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        
                        {/* Download/Upload Data Buttons */}
                        <div className='flex space-x-2'>
                            <button 
                                title="Download Data Backup" 
                                onClick={handleDownloadData} 
                                className="p-2 text-gray-700 hover:text-green-600 bg-gray-100 rounded-full transition shadow-inner"
                            >
                                <Download size={20} />
                            </button>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                className="hidden" 
                                accept="application/json"
                            />
                            <button 
                                title="Upload Data Restore" 
                                onClick={handleUploadClick} 
                                className="p-2 text-gray-700 hover:text-red-600 bg-gray-100 rounded-full transition shadow-inner"
                            >
                            <Upload size={20} />
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* 7. TEMPLATE SECTION */}
                {/* Reduced padding on mobile: p-8 -> p-4 sm:p-8 */}
                <div className="p-4 sm:p-8 grow overflow-y-auto">
                    {/* The DocumentTemplate component renders the chosen style */}
                    <DocumentTemplate
                        currentDoc={currentDoc}
                        isEditable={isEditable}
                        handleTemplateDetailChange={handleTemplateDetailChange}
                        customerList={customerList}
                        handleSelectCustomer={handleSelectCustomer}
                        handleLineItemChange={handleLineItemChange}
                        handleDeleteItem={handleDeleteItem}
                        handleAddItem={handleAddItem}
                        brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
                    />
                </div>
            </main>
        </div>
    );
};

export default App;
