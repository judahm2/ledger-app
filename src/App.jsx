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
    defaultTemplateStyle: 'StyleA', // RENAMED
    // Using a default Base64 or external URL for initial state
    logoUrl: "https://image.url", 
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
        accountNumber: '00000000', // Updated key
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

// MODIFIED: Template Options for Selector (defines 7 templates with unique names)
const TemplateOptions = [
    { id: 'StyleA', name: 'Style A (Structured)', description: 'Classic Revolit layout with accent color boxes.' },
    { id: 'StyleB', name: 'Style B (Minimal)', description: 'Clean layout with a heavy bottom border.' },
    { id: 'StyleC', name: 'Style C (Monotone)', description: 'High contrast, black and white, professional lines.' },
    { id: 'StyleD', name: 'Style D (Vibrant Bar)', description: 'Full-height primary color sidebar.' },
    { id: 'StyleE', name: 'Style E (Solid Header)', description: 'Full-width primary color solid header block.' },
    { id: 'StyleF', name: 'Style F (Compact)', description: 'A condensed view for smaller transactions (Minimal look).' }, // Maps to Style B
    { id: 'StyleG', name: 'Style G (Corporate)', description: 'A simple, black-and-white professional look (Structured look).' }, // Maps to Style A
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
const initialData = (docType = 'Invoice', id = null, defaultTemplate = 'StyleA') => ({ // RENAMED default template to 'StyleA'
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
        templateStyle: 'StyleA', // Set default template style
        // Date is used for cycle counting: December 2025 is in the 2025 cycle
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-05-001', date: '2025-12-05', isPaid: false, stampText: '' },
        clientDetails: tempSampleCustomers[0],
        totals: { subtotal: 500.00, taxRate: 15, tax: 75.00, totalDue: 575.00 },
        lineItems: [{ description: 'Annual Subscription', qty: 1, unitPrice: 500.00, amount: 500.00 }],
    },
    {
        ...initialData('Quotation', 'RS-2025-12-09-002'),
        status: 'Pending',
        templateStyle: 'StyleB', // Set Style B for one sample
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-08-002', date: '2025-12-08', isPaid: false, stampText: '' },
        clientDetails: tempSampleCustomers[1],
        totals: { subtotal: 1200.00, taxRate: 15, tax: 180.00, totalDue: 1380.00 },
        lineItems: [{ description: 'Consulting Services', qty: 10, unitPrice: 120.00, amount: 1200.00 }],
    },
    {
        ...initialData('Receipt', 'RS-2025-12-09-003'),
        status: 'Paid',
        templateStyle: 'StyleA', // Set default template style
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-01-003', date: '2025-12-01', isPaid: true, stampText: 'PAID' },
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
const ClientDetailsBlock = ({ details, isEditable, onDetailChange, customers, onSelectCustomer, brandingSettings, style = 'modern' }) => {
    const { primaryColor } = brandingSettings;
    // Determine if the current customer is one of the pre-loaded ones
    const isPreloadedCustomer = customers.some(c => c.id === details.id && details.id !== 'NEW-CLIENT');
    
    // Determine block style
    const blockClassName = style === 'minimal' 
        ? "p-0 mb-4" // Simple, no border/background
        : style === 'monotone'
        ? "p-4 mb-4 border-l-4 border-gray-900 bg-gray-50/50 rounded-r-lg" // Dark border for monotone
        : "p-4 mb-4 border-l-4 bg-gray-50/50 rounded-r-lg"; // Default modern style

    const blockStyle = style === 'minimal' 
        ? {} 
        : style === 'monotone'
        ? { borderLeftColor: '#000' }
        : { borderLeftColor: primaryColor };
    
    const titleStyle = style === 'monotone' ? { color: '#000' } : { color: primaryColor };

    return (
        <div className={blockClassName} style={blockStyle}>
            <h3 className="text-sm font-bold mb-2 uppercase" style={titleStyle}>Bill To</h3>

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
// MODIFIED: Accepts brandingSettings (which contains colors) and style
const LineItemsTable = ({ items, isEditable, onItemChange, onDeleteItem, onAddItem, brandingSettings, style = 'modern' }) => {
    const { primaryColor } = brandingSettings;
    
    // Conditional styles based on template style
    let headerStyle = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider";
    let tableHeaderClasses = '';
    let tableHeaderInlineStyle = {};

    if (style === 'simple' || style === 'monotone') {
        // Minimal/Monotone: Light gray or white background
        tableHeaderClasses = "text-gray-700 bg-gray-100 border-b-2 border-gray-300";
        if (style === 'monotone') {
            tableHeaderClasses = "text-gray-900 bg-white border-b-2 border-gray-900";
        }
    } else {
        // Modern/Solid Header/Vibrant Bar: Primary Color background
        tableHeaderClasses = "text-white";
        tableHeaderInlineStyle = { backgroundColor: primaryColor };
    }

    return (
      // REDUCED MARGIN: mb-8 -> mb-4
      <div className="mb-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden">
          {/* Apply conditional header style */}
          <thead className={tableHeaderClasses} style={tableHeaderInlineStyle}>
            <tr>
              {/* Removed rounded corners for simplicity in all styles, which is fine */}
              <th className={`${headerStyle} w-1/2`}>DESCRIPTION</th>
              <th className={`${headerStyle} text-center w-16`}>QTY</th>
              <th className={`${headerStyle} text-right w-24`}>UNIT PRICE (R)</th>
              <th className={`${headerStyle} text-right w-28`}>AMOUNT (R)</th>
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

// Component for Totals Summary (USED BY MODERN STYLES)
// MODIFIED: Accepts brandingSettings (which contains colors)
const TotalsSummary = ({ totals, isEditable, onTotalChange, brandingSettings, style = 'modern' }) => {
    const { primaryColor } = brandingSettings;
    
    // Monotone style uses black/gray only
    const finalRowColor = style === 'monotone' ? '#000' : primaryColor;
    const finalRowTextColor = style === 'monotone' ? 'text-gray-100' : 'text-white';
    const totalBoxBorder = style === 'monotone' ? 'border-2 border-gray-900' : 'border-2 border-gray-300';

    return (
        <div className="flex justify-end">
            <table className={`w-full sm:w-80 ${totalBoxBorder} rounded-lg overflow-hidden`}>
                <tbody>
                    <tr className="border-t border-gray-200">
                        <td className="py-1 px-2 text-xs font-medium">SUBTOTAL</td>
                        <td className="py-1 px-2 text-right text-xs">{formatCurrency(totals.subtotal)}</td>
                    </tr>
                    <tr>
                        <td className="py-1 px-2 text-xs font-medium flex items-center">
                            TAX RATE (%)
                        </td>
                        <td className="py-1 px-2 text-right text-xs">
                            <input 
                                type="number" 
                                value={totals.taxRate}
                                onChange={(e) => isEditable && onTotalChange('taxRate', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className={`w-12 text-xs text-gray-700 text-right p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />%
                        </td>
                    </tr>
                    <tr>
                        <td className="py-1 px-2 text-xs font-medium">TAX</td>
                        <td className="py-1 px-2 text-right text-xs">{formatCurrency(totals.tax)}</td>
                    </tr>
                    {/* Final Total Row */}
                    <tr className={`${finalRowTextColor} font-bold`} style={{ backgroundColor: finalRowColor }}>
                        <td className="p-3 text-base rounded-bl-lg">TOTAL DUE</td>
                        <td className="p-3 text-right text-base rounded-br-lg">{formatCurrency(totals.totalDue)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// Utility for editable footer inputs (Used by all templates)
const EditableFooterInput = ({ label, section, key, value, type = 'text', readOnly, isEditable, handleTemplateDetailChange, primaryColor }) => (
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


// -------------------------------------------------------------
// Template Component 1: TemplateStyleA (Structured/Modern) - RENAMED
// -------------------------------------------------------------
const TemplateStyleA = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, accentColor, logoUrl, companyName, companyInfo, paymentDetails, contactDetails } = brandingSettings;
    
    // Utility for editable inputs inside the document
    const EditableDocInput = ({ value, onChange, className = '', readOnly, style = {}, type = 'text' }) => (
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            className={`w-full font-bold p-0.5 text-xs text-gray-700 ${className} ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
            style={{ borderBottomColor: isEditable ? primaryColor : undefined, ...style }}
            readOnly={!isEditable || readOnly} 
        />
    );

    return (
        <div id="document-template" className="relative bg-white p-4 sm:p-10 max-w-4xl mx-auto shadow-2xl border border-gray-100 rounded-lg print:p-6 print:max-w-full print:mx-0 print:shadow-none print:border-none">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-500 opacity-20 transform -rotate-12 select-none border-4 border-red-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* DOCUMENT HEADER LAYOUT */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                {/* LEFT SIDE: Logo and Company Info */}
                <div className="flex flex-col items-start max-w-sm mb-4 sm:mb-0">
                    <div className="mb-3">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg object-contain" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                    </div>
                    <div className="text-left">
                        <p className="text-xl font-bold" style={{ color: primaryColor }}>
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
                    <h2 className="text-2xl font-bold mb-4 uppercase" style={{ color: primaryColor }}>
                        {currentDoc.documentType}
                    </h2>
                    
                    {/* DOC NO and CUSTOMER ID - ACCENT COLOR STYLING */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-left p-2 rounded-lg print:border-none print:bg-transparent" style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}` }}>
                            <p className="text-xs font-bold text-gray-500 uppercase">DOC NO</p>
                            <EditableDocInput 
                                value={currentDoc.documentDetails.docNo} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)}
                                style={{ color: accentColor }}
                            />
                        </div>
                        <div className="text-left p-2 rounded-lg print:border-none print:bg-transparent" style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}` }}>
                            <p className="text-xs font-bold text-gray-500 uppercase">CUSTOMER ID</p>
                            <EditableDocInput 
                                value={currentDoc.clientDetails.id} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('clientDetails', 'id', e.target.value)}
                                style={{ color: accentColor }}
                                readOnly={true} // ID must remain READ-ONLY
                            />
                        </div>
                    </div>

                    {/* DATE and TERMS - ACCENT COLOR STYLING */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-left p-2 rounded-lg print:border-none print:bg-transparent" style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}` }}>
                            <p className="text-xs font-bold text-gray-500 uppercase">DATE</p>
                            <EditableDocInput 
                                type="date" 
                                value={currentDoc.documentDetails.date} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                                className="font-bold p-0.5 text-gray-700 text-xs mt-1"
                                readOnly={!isEditable}
                            />
                        </div>
                        <div className="text-left p-2 rounded-lg print:border-none print:bg-transparent" style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}` }}>
                            <p className="text-xs font-bold text-gray-500 uppercase">TERMS</p>
                            <EditableDocInput 
                                value={currentDoc.documentDetails.terms} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)}
                                className="font-bold p-0.5 text-gray-700 text-xs mt-1"
                                readOnly={!isEditable}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Separator Line */}
            <hr className="my-4" style={{ borderColor: primaryColor, borderTopWidth: '1px' }}/>

            {/* Client Details (Bill To) */}
            <ClientDetailsBlock 
                details={currentDoc.clientDetails} 
                isEditable={isEditable} 
                onDetailChange={handleTemplateDetailChange} 
                customers={customerList}
                onSelectCustomer={handleSelectCustomer}
                brandingSettings={brandingSettings}
            />

            {/* Line Items Table */}
            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange} 
                onDeleteItem={handleDeleteItem} 
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings}
                style="modern"
            />

            {/* Totals Summary */}
            <div className='max-w-full mx-auto'>
                <TotalsSummary 
                    totals={currentDoc.totals} 
                    isEditable={isEditable} 
                    onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                    brandingSettings={brandingSettings}
                />
            </div>

            {/* Footer Section */}
            <hr className="my-6 border-gray-300" />

            {/* Payment and Contact Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start text-xs space-y-4 sm:space-y-0">
                <div>
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Details</h3>
                    <EditableFooterInput label="Account Holder" section="brandingSettings.paymentDetails" key="accountHolder" value={paymentDetails.accountHolder} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    <EditableFooterInput label="Bank" section="brandingSettings.paymentDetails" key="bankName" value={paymentDetails.bankName} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    <EditableFooterInput label="Account Number" section="brandingSettings.paymentDetails" key="accountNumber" value={paymentDetails.accountNumber} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    <EditableFooterInput label="Note" section="brandingSettings.paymentDetails" key="paymentNote" value={paymentDetails.paymentNote} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                </div>
                
                <div className="text-left sm:text-right">
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Contact Details</h3>
                    <EditableFooterInput label="Contact" section="brandingSettings.contactDetails" key="contactName" value={contactDetails.contactName} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    <EditableFooterInput label="Phone" section="brandingSettings.contactDetails" key="contactPhone" value={contactDetails.contactPhone} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    <EditableFooterInput label="Email" section="brandingSettings.contactDetails" key="contactEmail" value={contactDetails.contactEmail} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    
                    <div className='mt-4'>
                        <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Thank You Note</h3>
                        <EditableFooterInput label="Note" section="brandingSettings.contactDetails" key="thankYouNote" value={contactDetails.thankYouNote} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={primaryColor} />
                    </div>
                </div>
            </div>

            <div className='h-4 print:h-0'></div>
        </div>
    );
};


// -------------------------------------------------------------
// Template Component 2: TemplateStyleB (Minimal) - RENAMED
// -------------------------------------------------------------
const TemplateStyleB = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, logoUrl, companyName, companyInfo, templateBThankYou } = brandingSettings;
    
    // Utility for editable inputs inside the document
    const EditableDocInput = ({ value, onChange, className = '', readOnly, style = {}, type = 'text' }) => (
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            className={`w-full font-normal p-0.5 text-xs text-gray-700 ${className} ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
            style={{ borderBottomColor: isEditable ? primaryColor : undefined, ...style }}
            readOnly={!isEditable || readOnly} 
        />
    );

    return (
        <div 
            id="document-template" 
            // MODIFIED: Removed full border, added heavy bottom border for minimal look
            className="relative bg-white p-4 sm:p-10 max-w-4xl mx-auto shadow-lg rounded-lg print:p-6 print:max-w-full print:mx-0 print:shadow-none"
            style={{ borderBottomColor: primaryColor, borderBottomWidth: '4px', borderStyle: 'solid' }}
        >

            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-9xl font-black text-green-500 opacity-20 transform -rotate-12 select-none border-4 border-green-500 p-10 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* Header: Logo, Company Info, Doc Type - MODIFIED LAYOUT */}
            <div className="flex justify-between items-start mb-8">
                {/* LEFT SIDE: Document Type and Company Info (now simplified and smaller) */}
                <div className="flex flex-col items-start max-w-sm">
                    {/* Document Type (e.g., INVOICE) - Larger and bold */}
                    <h2 className="text-4xl font-extrabold mb-4 uppercase" style={{ color: primaryColor }}>
                        {currentDoc.documentType}
                    </h2>

                    {/* Company Info */}
                    <div className="text-left mt-2">
                        <p className="text-sm font-bold text-gray-700 mb-1">{companyName}</p>
                        <p className="text-xs">{companyInfo.address}</p>
                        <p className="text-xs">Email: {companyInfo.email}</p>
                        <p className="text-xs">VAT No: {companyInfo.vatNo}</p>
                    </div>
                </div>

                {/* RIGHT SIDE: Logo and Doc Details - Simplified box */}
                <div className="flex flex-col items-end text-right space-y-4">
                    {/* Logo */}
                    <div className="mb-3">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            // Reduced logo size for minimal template
                            className="w-auto max-w-[120px] max-h-[60px] object-contain rounded-lg" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><rect width='120' height='60' fill='%23ccc'/><text x='60' y='35' font-size='10' text-anchor='middle' fill='%23666'>Logo</text></svg>"; }}
                        />
                    </div>
                    
                    {/* Doc Details Box - Simple black text, primary color border on sides */}
                    <div className='p-4 border-l-4 border-r-4 text-xs space-y-1' style={{ borderColor: primaryColor }}>
                        <p><span className="font-bold">{currentDoc.documentType} No:</span> 
                            <EditableDocInput 
                                value={currentDoc.documentDetails.docNo} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)} 
                                className="inline w-auto ml-1 font-bold"
                            />
                        </p>
                        <p><span className="font-bold">Date:</span>
                            <input 
                                type="date" 
                                value={currentDoc.documentDetails.date} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                                className={`w-auto ml-1 font-normal text-xs text-gray-700 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </p>
                        <p className="font-bold">Customer ID: {currentDoc.clientDetails.id}</p>
                    </div>
                </div>
            </div>

            {/* Client and Other Details Section - REMOVED gray background */}
            <hr className="my-6 border-gray-300" />
            <div className='flex flex-col md:flex-row justify-between mb-8 p-0'>
                {/* CUSTOMER DETAILS */}
                <div className="w-full md:w-1/2 md:pr-8 mb-4 md:mb-0">
                    <ClientDetailsBlock 
                        details={currentDoc.clientDetails} 
                        isEditable={isEditable} 
                        onDetailChange={handleTemplateDetailChange} 
                        customers={customerList}
                        onSelectCustomer={handleSelectCustomer}
                        brandingSettings={brandingSettings}
                        style="minimal" // Use minimal style for no border/background
                    />
                </div>

                {/* OTHER DOC DETAILS - SIMPLIFIED BLOCK */}
                <div className="w-full md:w-1/2 md:pl-8 mt-4 md:mt-0">
                    <h3 className="text-sm font-bold mb-2 uppercase text-gray-700">Additional Details</h3>
                    <div className="space-y-1">
                        <p className="text-xs">
                            <span className="font-semibold">Terms:</span>
                            <EditableDocInput 
                                value={currentDoc.documentDetails.terms} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)} 
                                className="inline w-3/4 ml-1"
                            />
                        </p>
                        <p className="text-xs">
                            <span className="font-semibold">Prepared By:</span>
                            <EditableDocInput 
                                value={brandingSettings.contactDetails.contactName} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.contactDetails', 'contactName', e.target.value)} 
                                className="inline w-3/4 ml-1" 
                            />
                        </p>
                    </div>
                </div>
            </div>

            {/* Line Items Table (Modified for simple style) */}
            <div className="mb-8">
                <LineItemsTable 
                    items={currentDoc.lineItems} 
                    isEditable={isEditable} 
                    onItemChange={handleLineItemChange} 
                    onDeleteItem={handleDeleteItem} 
                    onAddItem={handleAddItem}
                    brandingSettings={brandingSettings}
                    style="simple" // Use simple style for light header
                />
            </div>
            

            {/* Totals Summary (Simplified block style) - MANUAL TABLE (BYPASSING TotalsSummary) */}
            <div className="flex justify-end">
                <table className="w-full sm:w-80">
                    <tbody>
                        {/* Subtotal */}
                        <tr className="">
                            <td className="py-1 px-2 text-xs font-medium text-right">SUBTOTAL</td>
                            <td className="py-1 px-2 text-right text-xs border-b border-gray-200">{formatCurrency(currentDoc.totals.subtotal)}</td>
                        </tr>
                        {/* Tax Rate */}
                        <tr>
                            <td className="py-1 px-2 text-xs font-medium text-right">TAX RATE (%)</td>
                            <td className="py-1 px-2 text-right text-xs border-b border-gray-200">
                                {/* Inline editable tax rate */}
                                <EditableDocInput 
                                    type="number" 
                                    value={currentDoc.totals.taxRate} 
                                    onChange={(e) => isEditable && handleTemplateDetailChange('totals', 'taxRate', e.target.value)} 
                                    className="w-12 inline text-right"
                                    readOnly={!isEditable}
                                />%
                            </td>
                        </tr>
                        {/* Tax */}
                        <tr>
                            <td className="py-1 px-2 text-xs font-medium text-right">TAX</td>
                            <td className="py-1 px-2 text-right text-xs border-b border-gray-200">{formatCurrency(currentDoc.totals.tax)}</td>
                        </tr>
                        {/* TOTAL DUE - Simple border and primary color text (No full block) */}
                        <tr className="font-bold border-t-2" style={{ borderColor: primaryColor }}>
                            <td className="p-3 text-base text-right" style={{ color: primaryColor }}>TOTAL DUE</td>
                            <td className="p-3 text-base text-right" style={{ color: primaryColor }}>{formatCurrency(currentDoc.totals.totalDue)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer / Thank You Note - Added Divider */}
            <hr className="my-8 border-gray-300" />
            <div className="text-center">
                <div className="text-sm font-bold" style={{ color: primaryColor }}>
                    {isEditable ? (
                        <input 
                            type="text" 
                            value={templateBThankYou} 
                            // This change updates the top-level templateBThankYou in brandingSettings
                            onChange={(e) => handleTemplateDetailChange('brandingSettings', 'templateBThankYou', e.target.value)} 
                            className={`w-full text-center p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
                            style={{ borderBottomColor: primaryColor, color: primaryColor }}
                        />
                    ) : (
                        templateBThankYou
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Please ensure payment is made to the following account details.
                </p>
                <p className="text-xs text-gray-500">
                    <span className='font-bold'>Account:</span> {brandingSettings.paymentDetails.accountHolder} ({brandingSettings.paymentDetails.bankName}) | 
                    <span className='font-bold'> Acc No:</span> {brandingSettings.paymentDetails.accountNumber}
                </p>
            </div>
            
            <div className='h-4 print:h-0'></div>
        </div>
    );
};


// -------------------------------------------------------------
// Template Component 3: TemplateStyleC (Monotone) - NEW
// -------------------------------------------------------------
const TemplateStyleC = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, logoUrl, companyName, companyInfo, paymentDetails, contactDetails } = brandingSettings;
    
    // Utility for editable inputs inside the document
    const EditableDocInput = ({ value, onChange, className = '', readOnly, style = {}, type = 'text' }) => (
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            className={`w-full font-normal p-0.5 text-xs text-gray-900 ${className} ${isEditable ? 'border-b border-gray-400 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
            style={{ borderBottomColor: isEditable ? primaryColor : undefined, ...style }}
            readOnly={!isEditable || readOnly} 
        />
    );

    return (
        <div id="document-template" className="relative bg-white p-4 sm:p-10 max-w-4xl mx-auto shadow-2xl border border-gray-900 rounded-lg print:p-6 print:max-w-full print:mx-0 print:shadow-none print:border-none">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-gray-900 opacity-10 transform -rotate-12 select-none border-4 border-gray-900 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* DOCUMENT HEADER LAYOUT - Monotone */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
                {/* LEFT SIDE: Document Type */}
                <div className="flex flex-col items-start max-w-sm mb-4 sm:mb-0">
                    <h2 className="text-4xl font-extrabold mb-4 uppercase text-gray-900">
                        {currentDoc.documentType}
                    </h2>
                </div>

                {/* RIGHT SIDE: Logo and Company Info */}
                <div className="text-left sm:text-right space-y-2 text-sm w-full sm:w-70">
                    <div className="flex flex-col items-end">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg object-contain" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                        <p className="text-xl font-bold text-gray-900 mt-2">{companyName}</p>
                        <p className="text-xs">{companyInfo.address}</p>
                        <p className="text-xs">Phone: {companyInfo.phone}</p>
                        <p className="text-xs">Email: {companyInfo.email}</p>
                        <p className="text-xs">Vat No. {companyInfo.vatNo}</p>
                    </div>
                </div>
            </div>

            {/* Document Details Block (Black border, white background) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-gray-900 bg-white rounded-lg mb-8">
                <div className='col-span-1'>
                    <p className="text-xs font-bold text-gray-700 uppercase">DOC NO</p>
                    <EditableDocInput 
                        value={currentDoc.documentDetails.docNo} 
                        onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)}
                        className="font-bold text-sm mt-1"
                    />
                </div>
                <div className='col-span-1'>
                    <p className="text-xs font-bold text-gray-700 uppercase">CUSTOMER ID</p>
                    <EditableDocInput 
                        value={currentDoc.clientDetails.id} 
                        className="font-bold text-sm mt-1"
                        readOnly={true}
                    />
                </div>
                <div className='col-span-1'>
                    <p className="text-xs font-bold text-gray-700 uppercase">DATE</p>
                    <EditableDocInput 
                        type="date" 
                        value={currentDoc.documentDetails.date} 
                        onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                        className="font-bold text-sm mt-1"
                    />
                </div>
                <div className='col-span-1'>
                    <p className="text-xs font-bold text-gray-700 uppercase">TERMS</p>
                    <EditableDocInput 
                        value={currentDoc.documentDetails.terms} 
                        onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)}
                        className="font-bold text-sm mt-1"
                    />
                </div>
            </div>

            {/* Client Details (Bill To) - Monotone style (dark border, no color) */}
            <ClientDetailsBlock 
                details={currentDoc.clientDetails} 
                isEditable={isEditable} 
                onDetailChange={handleTemplateDetailChange} 
                customers={customerList}
                onSelectCustomer={handleSelectCustomer}
                brandingSettings={brandingSettings}
                style="monotone"
            />

            {/* Line Items Table */}
            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange} 
                onDeleteItem={handleDeleteItem} 
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings}
                style="monotone" // Use monotone style for table header
            />

            {/* Totals Summary */}
            <div className='max-w-full mx-auto'>
                <TotalsSummary 
                    totals={currentDoc.totals} 
                    isEditable={isEditable} 
                    onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                    brandingSettings={brandingSettings}
                    style="monotone" // Use monotone style for total box
                />
            </div>

            {/* Footer Section */}
            <hr className="my-6 border-gray-900" />

            {/* Payment and Contact Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start text-xs space-y-4 sm:space-y-0">
                <div>
                    <h3 className="text-sm font-bold mb-2 uppercase text-gray-900">Payment Details</h3>
                    <EditableFooterInput label="Account Holder" section="brandingSettings.paymentDetails" key="accountHolder" value={paymentDetails.accountHolder} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    <EditableFooterInput label="Bank" section="brandingSettings.paymentDetails" key="bankName" value={paymentDetails.bankName} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    <EditableFooterInput label="Account Number" section="brandingSettings.paymentDetails" key="accountNumber" value={paymentDetails.accountNumber} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    <EditableFooterInput label="Note" section="brandingSettings.paymentDetails" key="paymentNote" value={paymentDetails.paymentNote} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                </div>
                
                <div className="text-left sm:text-right">
                    <h3 className="text-sm font-bold mb-2 uppercase text-gray-900">Contact Details</h3>
                    <EditableFooterInput label="Contact" section="brandingSettings.contactDetails" key="contactName" value={contactDetails.contactName} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    <EditableFooterInput label="Phone" section="brandingSettings.contactDetails" key="contactPhone" value={contactDetails.contactPhone} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    <EditableFooterInput label="Email" section="brandingSettings.contactDetails" key="contactEmail" value={contactDetails.contactEmail} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    
                    <div className='mt-4'>
                        <h3 className="text-sm font-bold mb-2 uppercase text-gray-900">Thank You Note</h3>
                        <EditableFooterInput label="Note" section="brandingSettings.contactDetails" key="thankYouNote" value={contactDetails.thankYouNote} isEditable={isEditable} handleTemplateDetailChange={handleTemplateDetailChange} primaryColor={'#000'} />
                    </div>
                </div>
            </div>

            <div className='h-4 print:h-0'></div>
        </div>
    );
};


// -------------------------------------------------------------
// Template Component 4: TemplateStyleD (Vibrant Left Bar) - NEW
// -------------------------------------------------------------
const TemplateStyleD = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, accentColor, logoUrl, companyName, companyInfo, paymentDetails, contactDetails } = brandingSettings;
    
    // Utility for editable inputs inside the document
    const EditableDocInput = ({ value, onChange, className = '', readOnly, style = {}, type = 'text' }) => (
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            className={`w-full font-bold p-0.5 text-xs text-gray-700 ${className} ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
            style={{ borderBottomColor: isEditable ? primaryColor : undefined, ...style }}
            readOnly={!isEditable || readOnly} 
        />
    );

    return (
        <div id="document-template" className="relative bg-white max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden print:max-w-full print:mx-0 print:shadow-none print:border-none">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-green-500 opacity-20 transform -rotate-12 select-none border-4 border-green-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            <div className="flex">
                {/* LEFT BAR: Company Info - Full Height Primary Color */}
                <div className="w-48 p-4 text-white flex flex-col justify-start space-y-4" style={{ backgroundColor: primaryColor, minHeight: '800px' }}>
                    
                    <h2 className="text-xl font-extrabold uppercase mb-2">{companyName}</h2>
                    
                    <div className="text-sm space-y-1">
                        <p className="font-semibold">{companyInfo.address}</p>
                        <p>Phone: {companyInfo.phone}</p>
                        <p>Email: {companyInfo.email}</p>
                        <p>VAT No: {companyInfo.vatNo}</p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-white/50 text-sm space-y-1">
                        <p className="font-semibold uppercase">Details:</p>
                        <p>Doc No: {currentDoc.documentDetails.docNo}</p>
                        <p>Date: {currentDoc.documentDetails.date}</p>
                        <p>Terms: {currentDoc.documentDetails.terms}</p>
                    </div>

                    <img 
                        src={logoUrl}
                        alt="Company Logo" 
                        className="w-auto max-w-[120px] max-h-[60px] object-contain rounded-lg mt-auto mb-4" 
                        onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><rect width='120' height='60' fill='%23aaa'/><text x='60' y='35' font-size='10' text-anchor='middle' fill='%23666'>Logo</text></svg>"; }}
                    />
                </div>

                {/* RIGHT CONTENT: Document, Client, Items, Totals */}
                <div className="flex-1 p-4 sm:p-10">
                    
                    {/* Header Top */}
                    <div className="flex justify-between items-start mb-8 border-b-2 pb-4" style={{ borderBottomColor: accentColor }}>
                        <h1 className="text-4xl font-extrabold uppercase" style={{ color: primaryColor }}>
                            {currentDoc.documentType}
                        </h1>
                        <div className="text-right text-sm">
                            <p className="font-bold">Customer ID: {currentDoc.clientDetails.id}</p>
                            <p className="font-bold">Total Due: <span className='text-xl' style={{ color: primaryColor }}>{formatCurrency(currentDoc.totals.totalDue)}</span></p>
                        </div>
                    </div>

                    {/* Client Details (Bill To) */}
                    <ClientDetailsBlock 
                        details={currentDoc.clientDetails} 
                        isEditable={isEditable} 
                        onDetailChange={handleTemplateDetailChange} 
                        customers={customerList}
                        onSelectCustomer={handleSelectCustomer}
                        brandingSettings={brandingSettings}
                    />

                    {/* Line Items Table */}
                    <LineItemsTable 
                        items={currentDoc.lineItems} 
                        isEditable={isEditable} 
                        onItemChange={handleLineItemChange} 
                        onDeleteItem={handleDeleteItem} 
                        onAddItem={handleAddItem}
                        brandingSettings={brandingSettings}
                        style="modern" // Uses primary color header
                    />

                    {/* Totals Summary */}
                    <div className='max-w-full mx-auto'>
                        <TotalsSummary 
                            totals={currentDoc.totals} 
                            isEditable={isEditable} 
                            onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                            brandingSettings={brandingSettings}
                        />
                    </div>

                    {/* Footer Section - Payment/Contact Details (Simplified) */}
                    <hr className="my-6 border-gray-300" />
                    <div className="flex justify-between items-start text-xs space-y-4 sm:space-y-0">
                        <div>
                            <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Instructions</h3>
                            <p>Bank: {paymentDetails.bankName}</p>
                            <p>Account: {paymentDetails.accountNumber}</p>
                            <p className='font-semibold mt-1'>{paymentDetails.paymentNote}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Contact</h3>
                            <p>{contactDetails.contactName}</p>
                            <p>{contactDetails.contactPhone}</p>
                            <p>{contactDetails.contactEmail}</p>
                        </div>
                    </div>

                    <div className='h-4 print:h-0'></div>
                </div>
            </div>
        </div>
    );
};


// -------------------------------------------------------------
// Template Component 5: TemplateStyleE (Solid Header Block) - NEW
// -------------------------------------------------------------
const TemplateStyleE = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, logoUrl, companyName, companyInfo, paymentDetails, contactDetails } = brandingSettings;
    
    // Utility for editable inputs inside the document
    const EditableDocInput = ({ value, onChange, className = '', readOnly, style = {}, type = 'text' }) => (
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            className={`w-full font-normal p-0.5 text-xs text-gray-700 ${className} ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
            style={{ borderBottomColor: isEditable ? primaryColor : undefined, ...style }}
            readOnly={!isEditable || readOnly} 
        />
    );

    return (
        <div id="document-template" className="relative bg-white max-w-4xl mx-auto shadow-2xl border border-gray-200 rounded-lg overflow-hidden print:max-w-full print:mx-0 print:shadow-none print:border-none">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-green-500 opacity-20 transform -rotate-12 select-none border-4 border-green-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* TOP HEADER BLOCK - Primary Color */}
            <div className="p-6 sm:p-8 text-white flex justify-between items-center" style={{ backgroundColor: primaryColor }}>
                
                {/* LEFT: Company Logo/Name/Doc Type */}
                <div className="flex items-center space-x-6">
                    <img 
                        src={logoUrl}
                        alt="Company Logo" 
                        className="w-auto max-w-[100px] max-h-[50px] object-contain rounded-lg" 
                        onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50'><rect width='100' height='50' fill='%23aaa'/><text x='50' y='30' font-size='10' text-anchor='middle' fill='%23fff'>Logo</text></svg>"; }}
                    />
                    <div>
                        <h1 className="text-3xl font-extrabold uppercase">{currentDoc.documentType}</h1>
                        <p className='text-sm font-semibold'>{companyName}</p>
                    </div>
                </div>

                {/* RIGHT: Document No */}
                <div className="text-right">
                    <p className='text-sm font-bold uppercase'>Doc No:</p>
                    <EditableDocInput 
                        value={currentDoc.documentDetails.docNo} 
                        onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)} 
                        className="inline w-auto ml-1 font-bold text-lg text-white"
                        style={{ borderBottomColor: 'white' }}
                    />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="p-4 sm:p-8">
                
                {/* Company & Client Info Section */}
                <div className="flex flex-col sm:flex-row justify-between mb-8 space-y-6 sm:space-y-0">
                    
                    {/* LEFT: Company Contact Info (Below Header) */}
                    <div className="text-xs space-y-1 p-3 border border-gray-300 rounded-lg">
                        <h3 className="font-bold text-gray-700 uppercase mb-1">Our Details</h3>
                        <p>{companyInfo.address}</p>
                        <p>Tel: {companyInfo.phone} | Email: {companyInfo.email}</p>
                        <p>VAT No: {companyInfo.vatNo}</p>
                    </div>

                    {/* RIGHT: Client Details (Bill To) */}
                    <div className='sm:w-1/2'>
                        <ClientDetailsBlock 
                            details={currentDoc.clientDetails} 
                            isEditable={isEditable} 
                            onDetailChange={handleTemplateDetailChange} 
                            customers={customerList}
                            onSelectCustomer={handleSelectCustomer}
                            brandingSettings={brandingSettings}
                            style="minimal"
                        />
                    </div>
                </div>

                {/* Document Details Block (Dates/Terms) */}
                <div className="flex justify-end mb-8">
                    <div className='flex space-x-4 text-xs font-semibold p-3 border border-gray-300 rounded-lg'>
                        <p>Date: 
                            <EditableDocInput 
                                type="date" 
                                value={currentDoc.documentDetails.date} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                                className="inline w-auto ml-1"
                            />
                        </p>
                        <p>Terms: 
                            <EditableDocInput 
                                value={currentDoc.documentDetails.terms} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)}
                                className="inline w-auto ml-1"
                            />
                        </p>
                    </div>
                </div>

                {/* Line Items Table */}
                <LineItemsTable 
                    items={currentDoc.lineItems} 
                    isEditable={isEditable} 
                    onItemChange={handleLineItemChange} 
                    onDeleteItem={handleDeleteItem} 
                    onAddItem={handleAddItem}
                    brandingSettings={brandingSettings}
                    style="modern" // Uses primary color header
                />

                {/* Totals Summary */}
                <div className='max-w-full mx-auto mt-8'>
                    <TotalsSummary 
                        totals={currentDoc.totals} 
                        isEditable={isEditable} 
                        onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                        brandingSettings={brandingSettings}
                    />
                </div>

                {/* Footer Section */}
                <hr className="my-6 border-gray-300" />
                <div className="text-xs">
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Details</h3>
                    <p className='font-semibold'>{paymentDetails.accountHolder} ({paymentDetails.bankName}) - Acc No: {paymentDetails.accountNumber}</p>
                    <p className='mt-1'>{paymentDetails.paymentNote}</p>
                    
                    <div className='mt-4'>
                        <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Contact / Note</h3>
                        <p>{contactDetails.contactName} - {contactDetails.contactPhone} / {contactDetails.contactEmail}</p>
                        <p className='font-semibold mt-1'>{contactDetails.thankYouNote}</p>
                    </div>
                </div>

                <div className='h-4 print:h-0'></div>
            </div>
        </div>
    );
};


// -------------------------------------------------------------
// NEW: Branding Settings Modal Component
// (Kept outside App for brevity, but functionality is integrated)
// -------------------------------------------------------------
const BrandingSettingsModal = ({ isOpen, onClose, brandingSettings, handleBrandingChange, handleTemplateDetailChange, handleLogoFileUpload, logoInputRef }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center p-4 sm:p-8 z-50 overflow-y-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl mt-8 mb-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold" style={{ color: brandingSettings.primaryColor }}>
                        <Settings size={24} className="inline mr-2" /> Branding Settings
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Settings Grid */}
                <div className="space-y-6">

                    {/* 1. General Company Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Company Name */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.companyName} 
                                onChange={(e) => handleBrandingChange('companyName', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                        {/* Company VAT No */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">VAT Number:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.companyInfo.vatNo} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', 'vatNo', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                    </div>
                    
                    {/* 2. Logo Upload */}
                    <div className="mb-4 border-t pt-4">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">Company Logo</h5>
                        <div className='flex items-end justify-between'>
                            <button 
                                onClick={() => logoInputRef.current.click()} 
                                className='flex items-center text-white py-2 px-3 rounded-lg text-sm hover:opacity-80 transition'
                                style={{ backgroundColor: brandingSettings.primaryColor }}
                            >
                                Upload File
                            </button>
                            <img src={brandingSettings.logoUrl} alt="Current Logo" className='w-12 h-12 object-contain border rounded' />
                        </div>
                        <input type="file" ref={logoInputRef} onChange={handleLogoFileUpload} className="hidden" accept="image/*" />
                    </div>

                    {/* 3. Color Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                        {/* Primary Color */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                <span className='mr-2'>Primary Theme Color:</span>
                                <span className='text-gray-400'>({brandingSettings.primaryColor})</span>
                            </label>
                            <input 
                                type="color" 
                                value={brandingSettings.primaryColor} 
                                onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} 
                                className="w-full h-10 p-1 border border-gray-300 rounded-lg cursor-pointer" 
                            />
                        </div>
                        {/* Accent Color */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                <span className='mr-2'>Accent Theme Color:</span>
                                <span className='text-gray-400'>({brandingSettings.accentColor})</span>
                            </label>
                            <input 
                                type="color" 
                                value={brandingSettings.accentColor} 
                                onChange={(e) => handleBrandingChange('accentColor', e.target.value)} 
                                className="w-full h-10 p-1 border border-gray-300 rounded-lg cursor-pointer" 
                            />
                        </div>
                    </div>

                    {/* 4. Default Template Selector */}
                    <div className="border-t pt-4">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">Default Document Template</h5>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Select Default Template:</label>
                        <div className="relative">
                            <select 
                                value={brandingSettings.defaultTemplateStyle} 
                                onChange={(e) => handleBrandingChange('defaultTemplateStyle', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm appearance-none pr-8 focus:ring-1 focus:border-1 cursor-pointer"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            >
                                {TemplateOptions.map(option => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}: {option.description}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                    </div>


                    {/* 5. Editable Payment & Contact Defaults */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-4">
                        {/* Payment Details */}
                        <div>
                            <h5 className="text-sm font-bold" style={{ color: brandingSettings.primaryColor }}>Default Payment Details</h5>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Account Holder:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.paymentDetails.accountHolder} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'accountHolder', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Bank Name:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.paymentDetails.bankName} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'bankName', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Account Number:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.paymentDetails.accountNumber} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'accountNumber', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Payment Note:</label>
                            <input 
                                type="text" 
                                value={brandingSettings.paymentDetails.paymentNote} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'paymentNote', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>

                        {/* Contact & Thank You Details */}
                        <div>
                            <h5 className="text-sm font-bold" style={{ color: brandingSettings.primaryColor }}>Default Contact Details</h5>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Contact Name (for doc):</label>
                            <input 
                                type="text" 
                                value={brandingSettings.contactDetails.contactName} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.contactDetails', 'contactName', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Thank You Note (Modern Style Footer):</label>
                            <input 
                                type="text" 
                                value={brandingSettings.contactDetails.thankYouNote} 
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.contactDetails', 'thankYouNote', e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                            {/* Thank You Note (Template B - Simple Style) */}
                            <div className='mt-4'>
                                <h5 className="text-sm font-bold" style={{ color: brandingSettings.primaryColor }}>Simple Style: Thank You Note</h5>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Note (Simple Style Footer):</label>
                                <input 
                                    type="text" 
                                    value={brandingSettings.templateBThankYou}
                                    onChange={(e) => handleBrandingChange('templateBThankYou', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                    style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                />
                            </div>
                        </div>
                    </div>


                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="text-white py-2 px-6 rounded-lg font-semibold hover:opacity-90 transition"
                        style={{ backgroundColor: brandingSettings.primaryColor }}
                    >
                        Close & Apply
                    </button>
                </div>
            </div>
        </div>
    );
};


// -------------------------------------------------------------
// NEW: Main App Component
// -------------------------------------------------------------
const App = () => {
    // --- STATE MANAGEMENT ---
    // User Authentication State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState('UNAUTHENTICATED');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Document & Ledger State (using local storage for persistence)
    const [brandingSettings, setBrandingSettings] = useState(() => 
        getInitialState('brandingSettings', defaultBrandingSettings)
    );
    // Initialize document with the default template style from branding settings
    const [currentDoc, setCurrentDoc] = useState(() => 
        getInitialState('currentDoc', initialData('Invoice', null, brandingSettings.defaultTemplateStyle))
    );
    const [documentLedger, setDocumentLedger] = useState(() => 
        getInitialState('documentLedger', sampleLedger)
    );
    const [customerList, setCustomerList] = useState(() => 
        getInitialState('customerList', tempSampleCustomers)
    );

    // UI State
    const [sectionTitle, setSectionTitle] = useState('Invoices'); // 'Invoices', 'Quotations', 'Receipts', 'Customers'
    const [isEditable, setIsEditable] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // For New Document dropdown
    const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false); // For Branding Modal
    const [modal, setModal] = useState({ isVisible: false, message: '' });
    const [isEditButtonHovered, setIsEditButtonHovered] = useState(false); // New state for hover effect

    // Refs for file inputs
    const logoInputRef = useRef(null);
    const fileInputRef = useRef(null); // For data upload

    // Utility to show modal messages
    const showModal = useCallback((message) => {
        setModal({ isVisible: true, message });
    }, []);


    // --- UTILITIES / CALCULATIONS ---

    // Recalculates all totals based on line items and tax rate
    const recalculateTotals = (items, taxRate) => {
        const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        const tax = subtotal * (taxRate / 100);
        const totalDue = subtotal + tax;
        return { subtotal, taxRate, tax, totalDue };
    };


    // --- HANDLERS ---

    // Handler for updating branding settings
    // MODIFIED: Handles nested key changes (e.g., 'paymentDetails.accountNumber') AND updates currentDoc template if defaultTemplateStyle is changed.
    const handleBrandingChange = (key, value) => {
        setBrandingSettings(prevSettings => {
            let newSettings = { ...prevSettings };
            // Handle nested keys (e.g., 'paymentDetails.accountNumber')
            if (key.includes('.')) {
                const parts = key.split('.');
                const rootKey = parts[0]; // e.g., 'paymentDetails'
                const subKey = parts[1]; // e.g., 'accountNumber'
                // Safely update nested object
                newSettings[rootKey] = {
                    ...newSettings[rootKey],
                    [subKey]: value,
                };
            } else {
                newSettings[key] = value;
            }
            return newSettings;
        });
        
        // FIX: If the default template style is changed, update the current document immediately
        // to reflect the change without a refresh.
        if (key === 'defaultTemplateStyle') {
            setCurrentDoc(prevDoc => ({
                ...prevDoc,
                templateStyle: value,
            }));
        }
    };


    // Generic Handler for updating document details or nested branding details (used in templates/modals)
    const handleTemplateDetailChange = (section, key, value) => {
        // Check if the change is targeting a branding setting (which starts with 'brandingSettings')
        if (section.startsWith('brandingSettings')) {
            // Check for triple-nested path (e.g., brandingSettings.contactDetails.contactName)
            if (section.split('.').length > 1) {
                const parts = section.split('.');
                // The full key path for the branding handler should be 'contactDetails.contactName'
                const keyPath = `${parts[1]}.${key}`; 
                handleBrandingChange(keyPath, value);
            } else {
                // If section is just 'brandingSettings', it's a top-level change for branding (like templateBThankYou)
                 handleBrandingChange(key, value);
            }
            return;
        }

        setCurrentDoc(prevDoc => {
            const newDoc = { ...prevDoc };
            // Ensure section exists (e.g., documentDetails, clientDetails, totals)
            newDoc[section] = { ...newDoc[section], [key]: value };

            // Special logic for totals
            if (section === 'totals') {
                // Recalculate if taxRate changes
                if (key === 'taxRate') {
                    // Recalculate tax and totalDue based on new taxRate
                    return { ...newDoc, totals: recalculateTotals(newDoc.lineItems, parseFloat(value) || 0) };
                }
            }

            return newDoc;
        });
    };

    // Handler for template style change (outside of branding settings)
    // MODIFIED: This handler now also updates the default template in branding settings
    const handleTemplateStyleChange = (value) => {
        // 1. Update the document's templateStyle
        setCurrentDoc(prevDoc => ({
            ...prevDoc,
            templateStyle: value
        }));
        // 2. Also update the branding default setting (saves to local storage)
        handleBrandingChange('defaultTemplateStyle', value);
    };

    // Handler for line item changes
    const handleLineItemChange = (index, key, value) => {
        setCurrentDoc(prevDoc => {
            const newItems = [...prevDoc.lineItems];
            const updatedValue = key === 'qty' || key === 'unitPrice' ? parseFloat(value) || 0 : value;

            newItems[index] = { ...newItems[index], [key]: updatedValue };

            // Recalculate amounts for the changed item (if qty or price changed)
            if (key === 'qty' || key === 'unitPrice') {
                newItems[index].amount = newItems[index].qty * newItems[index].unitPrice;
            }
            
            // Recalculate totals for the entire document
            const newTotals = recalculateTotals(newItems, prevDoc.totals.taxRate);

            return { ...prevDoc, lineItems: newItems, totals: newTotals };
        });
    };

    // Handler to delete a line item
    const handleDeleteItem = (index) => {
        setCurrentDoc(prevDoc => {
            const newItems = prevDoc.lineItems.filter((_, i) => i !== index);
            const newTotals = recalculateTotals(newItems, prevDoc.totals.taxRate);
            return { ...prevDoc, lineItems: newItems, totals: newTotals };
        });
    };

    // Handler to add a new line item
    const handleAddItem = () => {
        setCurrentDoc(prevDoc => {
            const newItems = [...prevDoc.lineItems, { description: '', qty: 1, unitPrice: 0.00, amount: 0.00 }];
            // No need to recalculate totals immediately as the new item has zero value
            return { ...prevDoc, lineItems: newItems };
        });
    };

    // Handler to save the current document to the ledger and update customer list
    const handleSaveDocument = () => {
        // 1. Validate mandatory fields
        if (!currentDoc.documentDetails.docNo || !currentDoc.clientDetails.name || currentDoc.lineItems.length === 0) {
            showModal('Error: Document Number, Client Name, and at least one Line Item are required to save.');
            return;
        }

        // 2. Determine if it's an existing document or new
        const isExisting = documentLedger.some(doc => doc.id === currentDoc.id);

        // 3. Update or Add to Ledger
        setDocumentLedger(prevLedger => {
            const filteredLedger = prevLedger.filter(doc => doc.id !== currentDoc.id);
            // Ensure the document details are finalized (recalculating just in case)
            const finalizedDoc = { 
                ...currentDoc, 
                totals: recalculateTotals(currentDoc.lineItems, currentDoc.totals.taxRate)
            };
            return [...filteredLedger, finalizedDoc].sort((a, b) => 
                a.documentDetails.docNo.localeCompare(b.documentDetails.docNo)
            );
        });

        // 4. Update or Add to Customer List
        const customerExists = customerList.some(c => c.id === currentDoc.clientDetails.id && c.id !== 'NEW-CLIENT');

        // Check if the current client is the temporary 'NEW-CLIENT'
        if (currentDoc.clientDetails.id === 'NEW-CLIENT') {
             // Create a new unique ID for the customer
            const newCustomerId = generateDateBasedID('CUST', customerList.length + 1);
            // Update the document with the new customer ID
            setCurrentDoc(prevDoc => ({
                ...prevDoc,
                clientDetails: {
                    ...prevDoc.clientDetails,
                    id: newCustomerId
                }
            }));
            // Add the new customer to the list
            setCustomerList(prevList => [...prevList, { ...currentDoc.clientDetails, id: newCustomerId }]);
        } else if (customerExists) {
            // Update existing customer in the list
            setCustomerList(prevList => prevList.map(c => 
                c.id === currentDoc.clientDetails.id ? currentDoc.clientDetails : c
            ));
        }

        // 5. Provide feedback
        showModal(isExisting ? 'Document updated successfully!' : 'New document saved to ledger!');
        setIsEditable(false); // Exit edit mode after saving
    };

    // Handler to create a new, blank document
    const handleNewDocument = (docType) => {
        // Find the current highest sequence number for 'RS' documents
        const lastDoc = documentLedger
            .filter(doc => doc.documentDetails.docNo.startsWith('RS')) // Only count 'RS' documents
            .sort((a, b) => b.documentDetails.docNo.localeCompare(a.documentDetails.docNo))[0];
        
        let sequenceNum = 1;
        if (lastDoc) {
            // Extract the sequence number from the ID (the last segment)
            const parts = lastDoc.documentDetails.docNo.split('-');
            sequenceNum = parseInt(parts[parts.length - 1], 10) + 1;
        }

        const newDocId = generateDateBasedID('RS', sequenceNum);
        const defaultTemplate = brandingSettings.defaultTemplateStyle || 'StyleA';

        // Create a new document object
        const newDoc = initialData(docType, newDocId, defaultTemplate);
        // Overwrite the temp ID with the unique ID
        newDoc.documentDetails.docNo = newDocId;

        setCurrentDoc(newDoc);
        setSectionTitle(docType + 's'); // Switch the view to the new document type
        setIsEditable(true); // Always start new documents in edit mode
        setIsDropdownOpen(false); // Close dropdown
        setIsSidebarOpen(false); // Close sidebar on mobile
        showModal(`New ${docType} started.`);
    };

    // Handler to load a document from the ledger
    const loadDocumentFromLedger = (docId) => {
        const docToLoad = documentLedger.find(doc => doc.id === docId);
        if (docToLoad) {
            // Ensure the loaded document has a templateStyle for safety
            const safeDocToLoad = { 
                ...docToLoad, 
                // Fallback to the document's template or the current branding default
                templateStyle: docToLoad.templateStyle || brandingSettings.defaultTemplateStyle || 'StyleA',
            };
            setCurrentDoc(safeDocToLoad);
            setIsEditable(false); // Documents loaded from ledger are not in edit mode by default
            setIsSidebarOpen(false); // Close sidebar on mobile
        }
    };

    // Handler to filter documents for the sidebar
    const loadCustomerFromList = (customerId) => {
        const customerToLoad = customerList.find(c => c.id === customerId);
        if (customerToLoad) {
            // Create a new Invoice using this customer's details
            const defaultTemplate = brandingSettings.defaultTemplateStyle || 'StyleA';
            const newDoc = initialData('Invoice', null, defaultTemplate);
            // Overwrite client details
            newDoc.clientDetails = customerToLoad;
            setCurrentDoc(newDoc);
            setSectionTitle('Invoices'); // Switch to Invoice editor view
            setIsEditable(true); // Start editing
            setIsSidebarOpen(false); // Close sidebar on mobile
            showModal(`New Invoice started for client ${customerToLoad.name}.`);
        }
    };

    // Action to mark current document (Invoice/Quotation) as paid
    const markAsPaid = () => {
        if (currentDoc.documentType === 'Receipt') return;

        setCurrentDoc(prevDoc => {
            const updatedDoc = {
                ...prevDoc,
                documentType: 'Receipt', // Convert to Receipt
                status: 'Paid',
                documentDetails: {
                    ...prevDoc.documentDetails,
                    isPaid: true,
                    stampText: 'RECEIPT - PAID',
                },
            };
            // Update Ledger
            setDocumentLedger(prevLedger => {
                const filteredLedger = prevLedger.filter(doc => doc.id !== prevDoc.id);
                return [...filteredLedger, updatedDoc].sort((a, b) => 
                    a.documentDetails.docNo.localeCompare(b.documentDetails.docNo)
                );
            });
            showModal(`Document ${prevDoc.documentDetails.docNo} marked as Paid and converted to Receipt.`);
            return updatedDoc;
        });

        setIsEditable(false);
    };

    // Action to delete document from ledger and reset view
    const handleDeleteDocument = () => {
        if (window.confirm(`Are you sure you want to permanently delete document ${currentDoc.documentDetails.docNo}? This cannot be undone.`)) {
            setDocumentLedger(prevLedger => prevLedger.filter(doc => doc.id !== currentDoc.id));
            
            // Reset to a fresh invoice
            setCurrentDoc(initialData('Invoice', null, brandingSettings.defaultTemplateStyle));
            setIsEditable(true);
            showModal(`Document ${currentDoc.documentDetails.docNo} deleted.`);
        }
    };


    // Handler for Firebase Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener (onAuthStateChanged) will handle setting isLoggedIn and userId.
            showModal('Login successful!');
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Firebase Login Error:", error);
            const errorMessage = error.code === 'auth/invalid-credential' ? 
                'Invalid email or password. Please try again.' : error.message;
            setLoginError(errorMessage);
        }
    };

    // Refactored Handler for Firebase Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Auth state listener (onAuthStateChanged) will handle setting isLoggedIn and userId to UNAUTHENTICATED.
            showModal('Logged out successfully.');
        } catch (error) {
            console.error("Firebase Logout Error:", error.message);
            showModal('Error logging out.');
        }
    };

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                setIsLoggedIn(true);
                setUserId(user.uid);
            } else {
                // User is signed out
                setIsLoggedIn(false);
                setUserId('UNAUTHENTICATED');
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []); 

    // Local Storage Persistence Hooks
    useEffect(() => {
        // Save document ledger and customer list
        localStorage.setItem('documentLedger', JSON.stringify(documentLedger));
        localStorage.setItem('customerList', JSON.stringify(customerList));
    }, [documentLedger, customerList]);

    useEffect(() => {
        // Save branding settings
        localStorage.setItem('brandingSettings', JSON.stringify(brandingSettings));
    }, [brandingSettings]);

    useEffect(() => {
        // Save current editor state
        localStorage.setItem('currentDoc', JSON.stringify(currentDoc));
    }, [currentDoc]);


    // File Handlers for Backup/Restore

    // Handler for logo file upload
    const handleLogoFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            // Update branding settings with the Base64 URL
            handleBrandingChange('logoUrl', reader.result);
        };
        reader.readAsDataURL(file); // Convert file to Base64 data URL
        showModal('Logo uploaded successfully!');
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `rsfinance_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showModal('Data backup downloaded successfully!');
    };

    // Function to handle data restore (upload)
    const handleRestoreData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const uploadedData = JSON.parse(e.target.result);
                if (uploadedData.documentLedger && uploadedData.customerList) {
                    // Update main states
                    setDocumentLedger(uploadedData.documentLedger);
                    setCustomerList(uploadedData.customerList);
                    // Update branding settings, merging old defaults with uploaded data
                    setBrandingSettings(getInitialState('brandingSettings', uploadedData.brandingSettings));
                    // Check if currentDoc should be reset or kept, for simplicity, we keep it as is.
                    showModal('Data restored successfully!');
                } else {
                    showModal('Error: Uploaded file is not a valid RS Finance backup.');
                }
            } catch (error) {
                console.error("Data Restore Error:", error);
                showModal('Error parsing uploaded file. Please ensure it is a valid JSON backup file.');
            }
        };
        reader.readAsText(file);
    };


    // --- FILTERED DATA FOR SIDEBAR NAVIGATION ---

    const filteredLedger = (type) => documentLedger.filter(doc => 
        (type === 'Invoices' && doc.documentType === 'Invoice') ||
        (type === 'Quotations' && doc.documentType === 'Quotation') ||
        (type === 'Receipts' && doc.documentType === 'Receipt')
    ).sort((a, b) => b.documentDetails.docNo.localeCompare(a.documentDetails.docNo)); // Sort descending by DocNo


    const sidebarNavigation = [
        { id: 1, title: 'Invoices', icon: FileText, count: filteredLedger('Invoices').length },
        { id: 2, title: 'Quotations', icon: FileText, count: filteredLedger('Quotations').length },
        { id: 3, title: 'Receipts', icon: FileText, count: filteredLedger('Receipts').length },
        { id: 4, title: 'Customers', icon: Users, count: customerList.length },
    ];


    // --- COMPONENT RENDERING LOGIC ---

    // Conditional render for Login page
    if (!isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
                    <div className="text-center">
                        <h1 className="text-3xl font-extrabold" style={{ color: brandingSettings.primaryColor }}>
                            RS Finance App
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">Sign in to manage your documents</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleLogin}>
                        {loginError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-xs" role="alert">
                                {loginError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                required
                                value={email} // BIND STATE
                                onChange={(e) => setEmail(e.target.value)} // UPDATE STATE
                                // REPLACED hardcoded focus border color with inline style
                                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            />
                        </div>
                        <div>
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
                            className="w-full text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition shadow-lg"
                            style={{ backgroundColor: brandingSettings.primaryColor }}
                        >
                            <LogIn size={20} className="inline mr-2" /> Log In
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- MAIN APPLICATION LAYOUT ---
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Modal for Messages */}
            <ModalMessage 
                message={modal.message} 
                isVisible={modal.isVisible} 
                onClose={() => setModal({ isVisible: false, message: '' })} 
                primaryColor={brandingSettings.primaryColor}
            />

            {/* Branding Settings Modal */}
            <BrandingSettingsModal 
                isOpen={isBrandingSettingsOpen} 
                onClose={() => setIsBrandingSettingsOpen(false)} 
                brandingSettings={brandingSettings} 
                handleBrandingChange={handleBrandingChange}
                handleTemplateDetailChange={handleTemplateDetailChange}
                handleLogoFileUpload={handleLogoFileUpload}
                logoInputRef={logoInputRef}
            />

            {/* Mobile Menu Overlay */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'} lg:hidden`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            {/* Sidebar (Navigation) - MADE RESPONSIVE */}
            <nav
                // MOBILE FRIENDLY CHANGE: Use fixed/transform for mobile, relative for desktop
                // ADDED: flex flex-col h-full to enable vertical layout and scrolling
                className={`fixed inset-y-0 left-0 transform w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out p-4 flex-shrink-0 z-40 print:hidden flex flex-col h-full`}
                style={{ backgroundColor: brandingSettings.primaryColor }}
            >
                {/* Logo / Title (FIXED HEADER) */}
                <div className="text-2xl font-bold text-white mb-6 flex items-center justify-between">
                    <span>{brandingSettings.companyName.split(' ')[0]} <span style={{ color: brandingSettings.accentColor }}>{brandingSettings.companyName.split(' ').slice(1).join(' ')}</span></span>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-white lg:hidden">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto pb-4">
                
                    {/* Main Navigation Links */}
                    <div className="flex flex-col space-y-2">
                        {sidebarNavigation.map(item => (
                            <div 
                                key={item.id}
                                // REPLACED hardcoded background color/opacity with inline style
                                className={`flex items-center text-white py-2 px-3 rounded-lg font-semibold cursor-pointer transition ${sectionTitle === item.title ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                onClick={() => {
                                    setSectionTitle(item.title);
                                    setIsSidebarOpen(false); // Close sidebar on mobile after selection
                                }}
                            >
                                <item.icon size={20} className="mr-3" style={{ color: brandingSettings.accentColor }} />
                                <span className="flex-1"> {item.title} </span>
                                {/* Badge with Count */}
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sectionTitle === item.title ? 'bg-gray-200 text-gray-700' : 'bg-white/20 text-white'}`}>
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* New Document Button */}
                    <div className="mt-6 border-t border-white/20 pt-4 relative">
                        <button 
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            className="w-full flex items-center justify-center text-white py-2 px-4 rounded-lg font-bold hover:opacity-90 transition shadow-md bg-white/30"
                        >
                            <Plus size={18} className="mr-2" /> Create New <ChevronDown size={18} className="ml-2" />
                        </button>
                        {/* New Document Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl overflow-hidden z-50">
                                {['Invoice', 'Quotation', 'Receipt'].map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => handleNewDocument(type)}
                                        // REPLACED hardcoded text color with inline style
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        style={{ color: brandingSettings.primaryColor }}
                                    >
                                        New {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Document List (Ledger) */}
                    {/* Only show ledger if not viewing customers */}
                    {sectionTitle !== 'Customers' && (
                        // REMOVED: overflow-y-auto flex-1, now handled by parent
                        <div className="mt-8">
                            <h3 className="text-sm font-bold uppercase text-white/70 mb-2">{sectionTitle} ({filteredLedger(sectionTitle).length})</h3>
                            <div className='space-y-2'>
                                {filteredLedger(sectionTitle).map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => loadDocumentFromLedger(doc.id)}
                                        // REPLACED hardcoded border color with inline style
                                        className={`p-3 rounded-lg cursor-pointer transition border ${currentDoc.id === doc.id ? 'bg-white text-gray-800 border-white' : 'hover:bg-white/10 text-white border-white/40'}`}
                                    >
                                        <p className="text-sm font-semibold">{doc.documentDetails.docNo}</p>
                                        <p className="text-xs">{doc.clientDetails.name} ({doc.clientDetails.company})</p>
                                        <div className="flex justify-between items-center text-xs mt-1">
                                            <span className={`py-0.5 px-2 rounded-full text-xs font-medium ${doc.status === 'Paid' ? 'bg-green-500 text-white' : doc.status === 'Outstanding' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-gray-900'}`}>
                                                {doc.status}
                                            </span>
                                            <span className={currentDoc.id === doc.id ? 'text-gray-500' : 'text-white/70'}>
                                                {doc.documentDetails.date}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Customer List (Ledger) */}
                    {/* Only show customer list if viewing customers */}
                    {sectionTitle === 'Customers' && (
                        // REMOVED: overflow-y-auto flex-1, now handled by parent
                        <div className="mt-8">
                            <h3 className="text-sm font-bold uppercase text-white/70 mb-2">Customer List ({customerList.length})</h3>
                            <div className='space-y-2'>
                                {customerList.map(customer => (
                                    <div
                                        key={customer.id}
                                        onClick={() => loadCustomerFromList(customer.id)}
                                        // REPLACED hardcoded border color with inline style
                                        className={`p-3 rounded-lg cursor-pointer transition border ${currentDoc.clientDetails.id === customer.id ? 'bg-white text-gray-800 border-white' : 'hover:bg-white/10 text-white border-white/40'}`}
                                    >
                                        <p className="text-sm font-semibold">{customer.name}</p>
                                        <p className="text-xs text-white/70">{customer.company}</p>
                                        <div className="flex justify-between items-center text-xs text-white/70 mt-1">
                                            <span className={`py-0.5 px-2 rounded-full text-xs font-medium bg-gray-600 text-white`}>
                                                {customer.id}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div> {/* END Main Scrollable Content Area */}


                {/* Footer Controls (FIXED FOOTER) */}
                <div className="mt-auto pt-4 border-t border-white/20 space-y-2">
                    {/* Display User ID */}
                    <div className="text-white/70 text-xs p-2 break-all bg-white/10 rounded-lg">
                        <span className="font-semibold block mb-1">Current User ID:</span> {userId}
                    </div>
                    <button 
                        onClick={() => setIsEditable(prev => !prev)}
                        onMouseEnter={() => setIsEditButtonHovered(true)} // ADDED: Set hover state to true
                        onMouseLeave={() => setIsEditButtonHovered(false)} // ADDED: Set hover state to false
                        className={`w-full flex items-center justify-center py-2 px-4 rounded-lg font-semibold transition duration-200 shadow-md text-sm ${isEditable ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-white hover:bg-white/10'}`}
                        // Dynamic styling for non-editing state
                        style={!isEditable ? { 
                            backgroundColor: isEditButtonHovered ? brandingSettings.accentColor : 'transparent', 
                            borderWidth: '1px', 
                            borderColor: 'white' 
                        } : {}}
                    >
                        {isEditable ? (
                            <> <X size={16} className="mr-2 hidden sm:block" /> Exit Edit Mode </>
                        ) : (
                            <> <Edit size={16} className="mr-2 hidden sm:block" /> Enter Edit Mode </>
                        )}
                    </button>
                    <button 
                        onClick={() => setIsBrandingSettingsOpen(true)}
                        className="w-full flex items-center justify-center py-2 px-4 rounded-lg font-semibold transition text-white hover:bg-white/10 border border-white"
                        style={{ backgroundColor: 'transparent' }}
                    >
                        <Settings size={16} className="mr-2 hidden sm:block" /> Branding
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center py-2 px-4 rounded-lg font-semibold transition text-white bg-red-600 hover:bg-red-700"
                    >
                        <LogIn size={16} className="mr-2 hidden sm:block" /> Log Out
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                {/* Header/Controls */}
                <header className="flex-shrink-0 bg-white shadow-md p-4 flex flex-col md:flex-row justify-between items-center print:hidden space-y-2 md:space-y-0 md:space-x-4">
                    {/* Mobile Menu Button */}
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-auto lg:hidden text-gray-600 hover:text-gray-800">
                        <Menu size={24} />
                    </button>

                    {/* Left side: Current View Title */}
                    <div className='flex items-center w-full md:w-auto'>
                        <h1 className="text-xl font-bold text-gray-800">
                            {sectionTitle === 'Customers' ? 'Customer Manager' : `${currentDoc.documentType} Editor`}
                        </h1>
                        <span className="ml-3 text-sm text-gray-500 font-medium hidden sm:inline-block">
                            ({currentDoc.documentDetails.docNo})
                        </span>
                    </div>

                    {/* Right side: Action Buttons & Selector */}
                    {/* MOBILE FRIENDLY CHANGE: Use flex-wrap and gap-2 to prevent overflow on small screens */}
                    <div className="flex flex-wrap items-center justify-end w-full md:w-auto gap-2 md:gap-3">
                        
                        {/* Mark As Paid / Delete Button Group */}
                        {isEditable && currentDoc.documentType !== 'Receipt' && (
                            <button 
                                onClick={markAsPaid}
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md text-sm bg-green-500 hover:bg-green-600"
                            >
                                <DollarSign size={16} className="mr-2 hidden sm:block" /> Mark Paid
                            </button>
                        )}
                        {isEditable && (
                            <button 
                                onClick={handleDeleteDocument}
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md text-sm bg-red-500 hover:bg-red-600"
                            >
                                <Trash2 size={16} className="mr-2 hidden sm:block" /> Delete
                            </button>
                        )}

                        {/* Save Button */}
                        {isEditable && (
                            <button 
                                onClick={handleSaveDocument}
                                className="flex items-center text-white py-2 px-4 rounded-lg font-semibold transition shadow-md text-sm hover:opacity-90"
                                style={{ backgroundColor: brandingSettings.primaryColor }}
                            >
                                <Save size={16} className="mr-2 hidden sm:block" /> Save Document
                            </button>
                        )}

                        {/* Print Button */}
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center text-gray-700 bg-gray-100 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition shadow-md text-sm"
                        >
                            <Download size={16} className="mr-2 hidden sm:block" /> Print / PDF
                        </button>

                        {/* Template Selector (NEW) */}
                        <div className="relative text-sm">
                            <select 
                                value={currentDoc.templateStyle}
                                onChange={(e) => handleTemplateStyleChange(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg text-sm bg-white shadow-inner focus:ring-1 focus:border-1 appearance-none pr-8 cursor-pointer"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                            >
                                {TemplateOptions.map(option => (
                                    <option key={option.id} value={option.id}>
                                        Template: {option.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                    </div>
                </header>

                {/* App Status and Data Controls */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center text-xs text-gray-600 print:hidden">
                    <p>Current Document: <span className="font-semibold" style={{ color: brandingSettings.primaryColor }}>{currentDoc.documentType} - {currentDoc.documentDetails.docNo}</span></p>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            {/* Backup Button */}
                            <button 
                                title="Download Data Backup" 
                                onClick={handleDownloadData}
                                className="flex items-center text-gray-700 bg-gray-100 py-1 px-2 rounded-md hover:bg-gray-200 transition"
                            >
                                <Download size={14} className="mr-1" /> Backup
                            </button>
                            {/* Restore Button */}
                            <button 
                                title="Restore Data from Backup File" 
                                onClick={() => fileInputRef.current.click()}
                                className="flex items-center text-gray-700 bg-gray-100 py-1 px-2 rounded-md hover:bg-gray-200 transition"
                            >
                                <Upload size={14} className="mr-1" /> Restore
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleRestoreData} className="hidden" accept="application/json" />
                        </div>
                    </div>
                </div>


                {/* Document View */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible print:bg-white">
                    {(() => {
                        // Render the selected template based on currentDoc.templateStyle
                        switch (currentDoc.templateStyle) {
                            case 'StyleA':
                            case 'StyleG': // Maps to StyleA (Structured)
                            default:
                                return (
                                    <TemplateStyleA
                                        currentDoc={currentDoc}
                                        isEditable={isEditable}
                                        handleTemplateDetailChange={handleTemplateDetailChange}
                                        customerList={customerList}
                                        handleSelectCustomer={loadCustomerFromList}
                                        handleLineItemChange={handleLineItemChange}
                                        handleDeleteItem={handleDeleteItem}
                                        handleAddItem={handleAddItem}
                                        brandingSettings={brandingSettings}
                                    />
                                );
                            case 'StyleB':
                            case 'StyleF': // Maps to StyleB (Minimal)
                                return (
                                    <TemplateStyleB
                                        currentDoc={currentDoc}
                                        isEditable={isEditable}
                                        handleTemplateDetailChange={handleTemplateDetailChange}
                                        customerList={customerList}
                                        handleSelectCustomer={loadCustomerFromList}
                                        handleLineItemChange={handleLineItemChange}
                                        handleDeleteItem={handleDeleteItem}
                                        handleAddItem={handleAddItem}
                                        brandingSettings={brandingSettings}
                                    />
                                );
                            case 'StyleC': // Monotone
                                return (
                                    <TemplateStyleC
                                        currentDoc={currentDoc}
                                        isEditable={isEditable}
                                        handleTemplateDetailChange={handleTemplateDetailChange}
                                        customerList={customerList}
                                        handleSelectCustomer={loadCustomerFromList}
                                        handleLineItemChange={handleLineItemChange}
                                        handleDeleteItem={handleDeleteItem}
                                        handleAddItem={handleAddItem}
                                        brandingSettings={brandingSettings}
                                    />
                                );
                            case 'StyleD': // Vibrant Left Bar
                                return (
                                    <TemplateStyleD
                                        currentDoc={currentDoc}
                                        isEditable={isEditable}
                                        handleTemplateDetailChange={handleTemplateDetailChange}
                                        customerList={customerList}
                                        handleSelectCustomer={loadCustomerFromList}
                                        handleLineItemChange={handleLineItemChange}
                                        handleDeleteItem={handleDeleteItem}
                                        handleAddItem={handleAddItem}
                                        brandingSettings={brandingSettings}
                                    />
                                );
                            case 'StyleE': // Solid Header Block
                                return (
                                    <TemplateStyleE
                                        currentDoc={currentDoc}
                                        isEditable={isEditable}
                                        handleTemplateDetailChange={handleTemplateDetailChange}
                                        customerList={customerList}
                                        handleSelectCustomer={loadCustomerFromList}
                                        handleLineItemChange={handleLineItemChange}
                                        handleDeleteItem={handleDeleteItem}
                                        handleAddItem={handleAddItem}
                                        brandingSettings={brandingSettings}
                                    />
                                );
                        }
                    })()}
                </div>
            </main>
        </div>
    );
};

export default App;
