import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogIn, FileText, Settings, Download, Upload, Plus, Search, Calendar, DollarSign, Users, Trash2, Edit, Save, User, Layout, ChevronDown, ImageIcon, User2 } from 'lucide-react';

// --- 1. FIREBASE & AUTH CONFIGURATION (Client-side) ---
// Note: In a real environment, __firebase_config and __initial_auth_token are provided globally.
const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "AIzaSyBNevKsqcHGt2XRm4ELdnJmIrWN7b62FmY",
  authDomain: "documets-ledger.firebaseapp.com",
  projectId: "documets-ledger",
  storageBucket: "documets-ledger.firebasestorage.com",
  messagingSenderId: "974348742536",
  appId: "1:974348742536:web:22476ccbbb597cd575543d"
=======
  apiKey: "AIzaSyCeSoePIKZLQgXSErE2vyjdmpzd2blhUhY",
  authDomain: "leger-app-228f2.firebaseapp.com",
  projectId: "leger-app-228f2",
  storageBucket: "leger-app-228f2.firebasestorage.app",
  messagingSenderId: "23840369680",
  appId: "1:23840369680:web:0ec69e2f99f2be288b6e95"
>>>>>>> 08e51c0ecf1c20d181bef026bef7749f3cb4b439
};

// --- 2. DUMMY DATA STRUCTURES ---

// UPDATED default branding configuration, including new company info
const defaultBrandingSettings = {
    primaryColor: '#039dbf', // Revolit Blue
    accentColor: '#e9b318',  // Revolit Yellow
    companyName: 'REVOLIT SOLUTIONS',
    // Using a default Base64 or external URL for initial state
    logoUrl: "https://revolitsolutions.co.za/wp-content/uploads/2025/11/revolitlogo-yellow-icon-2024.png", 
    // NEW: Editable Company Info
    companyInfo: {
        address: '611 Lydia Street Birchleigh North Ex 3, Kempton',
        phone: '064 546 8642',
        email: 'info@rs.co.za',
        vatNo: '91976412451',
    },
    // NEW: Editable Footer Details
    paymentDetails: {
        accHolder: 'REVOLIT SOLUTIONS',
        accNo: 'FNB ACC NO. 63165202276',
        paymentNote: 'Payment must be made in full before the due date.',
    },
    contactDetails: {
        contactName: 'Nakedi Mphela',
        contactPhone: '+27 64 546 8642',
        contactEmail: 'nakedi@revolitsolutions.co.za',
        thankYouNote: 'Thank you for choosing us!',
    },
    // Simple template B thank you note (kept separate for template B simplicity)
    templateBThankYou: 'Thank you for your business!',
};

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

// UPDATED: Added templateStyle field
const initialData = (docType = 'Invoice', id = null, templateStyle = 'StyleA') => ({
  // Use the generated ID for new documents, or a temporary ID for the current editor state
  id: id || `TEMP-${Date.now()}`, 
  documentType: docType, // 'Invoice', 'Quotation', 'Receipt'
  // NEW: Add a 'status' for ledger filtering
  status: docType === 'Receipt' ? 'Paid' : 'Draft', 
  templateStyle: templateStyle, // NEW: Default template style
  documentDetails: {
    // Placeholder 999 is used for the sequential number in the initial state
    docNo: generateDateBasedID('RS', 999), 
    date: new Date().toISOString().split('T')[0],
    terms: 'Due Upon Receipt',
    isPaid: docType === 'Receipt',
    stampText: 'RECEIPT - PAID',
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
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-001', date: '2025-12-05', isPaid: false },
        clientDetails: tempSampleCustomers[0],
        totals: { subtotal: 500.00, taxRate: 15, tax: 75.00, totalDue: 575.00 },
        lineItems: [{ description: 'Annual Subscription', qty: 1, unitPrice: 500.00, amount: 500.00 }],
    },
    {
        ...initialData('Quotation', 'RS-2025-12-09-002'),
        status: 'Pending',
        templateStyle: 'StyleA', // Set default template style
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-002', date: '2025-12-08', isPaid: false },
        clientDetails: tempSampleCustomers[1],
        totals: { subtotal: 1200.00, taxRate: 15, tax: 180.00, totalDue: 1380.00 },
        lineItems: [{ description: 'Consulting Services', qty: 10, unitPrice: 120.00, amount: 1200.00 }],
    },
    {
        ...initialData('Receipt', 'RS-2025-12-09-003'),
        status: 'Paid',
        templateStyle: 'StyleA', // Set default template style
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
                    ...parsed, // Overwritten top-level props (colors, name, logo, templateBThankYou)
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
// NEW: Template Component (Existing Layout)
// MODIFIED: Accepts brandingSettings and added editable footer
// -------------------------------------------------------------
const TemplateStyleA = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
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
        <div id="document-template" className="relative bg-white p-10 max-w-4xl mx-auto shadow-2xl border border-gray-100 rounded-lg print:p-6">
            
            {/* PAID Stamp Overlay */}
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-500 opacity-20 transform -rotate-12 select-none border-4 border-red-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            {/* ------------------------------------------------------------- */}
            {/* DOCUMENT HEADER LAYOUT */}
            {/* ------------------------------------------------------------- */}

            <div className="flex justify-between items-start mb-4">
                {/* LEFT SIDE: Logo and Company Info */}
                <div className="flex flex-col items-start max-w-sm">
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
                <div className="text-right space-y-2 text-sm w-70">
                    
                    {/* Document Type (e.g., INVOICE) */}
                    {/* REPLACED hardcoded text color with inline style */}
                    <h2 className="text-2xl font-bold mb-4 uppercase" style={{ color: primaryColor }}>
                        {currentDoc.documentType}
                    </h2>
                    
                    {/* DOC NO and CUSTOMER ID */}
                    <div className="grid grid-cols-2 gap-4">
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

                    {/* DATE and TERMS */}
                    <div className="grid grid-cols-2 gap-4">
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

            <TotalsSummary 
                totals={currentDoc.totals} 
                isEditable={isEditable} 
                onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />
            
            <hr className="my-6 border-gray-300" />
            
            {/* Payment and Contact Details (NOW EDITABLE) */}
            <div className="flex justify-between items-start text-xs">
                <div>
                    {/* REPLACED hardcoded text color with inline style */}
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Details</h3>
                    
                    {/* Editable Account Holder */}
                    <EditableFooterInput 
                        label="Acc Holder" 
                        section="brandingSettings.paymentDetails" 
                        key="accHolder" 
                        value={paymentDetails.accHolder} 
                        readOnly={false}
                    />

                    {/* Editable Account Number */}
                    <EditableFooterInput 
                        label="Account No" 
                        section="brandingSettings.paymentDetails" 
                        key="accNo" 
                        value={paymentDetails.accNo} 
                        readOnly={false}
                    />

                    {/* Editable Payment Note */}
                    <div className="mt-4 italic" style={{ color: accentColor }}>
                        {isEditable ? (
                            <input
                                type="text"
                                value={paymentDetails.paymentNote}
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.paymentDetails', 'paymentNote', e.target.value)}
                                className={`w-full p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
                                style={{ borderBottomColor: primaryColor }}
                            />
                        ) : (
                            paymentDetails.paymentNote
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <p className="font-bold mb-2">If you have any questions about this document, please contact:</p>
                    
                    {/* Editable Contact Name and Phone (combined for a simple display) */}
                    <div className='text-xs flex mb-0.5 justify-end'>
                        <EditableFooterInput 
                            label="" 
                            section="brandingSettings.contactDetails" 
                            key="contactName" 
                            value={contactDetails.contactName} 
                            readOnly={false}
                        />
                        <EditableFooterInput 
                            label="" 
                            section="brandingSettings.contactDetails" 
                            key="contactPhone" 
                            value={contactDetails.contactPhone} 
                            readOnly={false}
                        />
                    </div>
                    
                    {/* Editable Contact Email */}
                    <div className='text-xs flex mb-0.5 justify-end'>
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

                    {/* Editable Thank You Note */}
                    <div className="mt-4 text-sm font-bold" style={{ color: primaryColor }}>
                        {isEditable ? (
                            <input
                                type="text"
                                value={contactDetails.thankYouNote}
                                onChange={(e) => handleTemplateDetailChange('brandingSettings.contactDetails', 'thankYouNote', e.target.value)}
                                className={`w-full text-right p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
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
// NEW: Template Component Style B (Simple Variant)
// MODIFIED: Accepts brandingSettings and added editable footer
// -------------------------------------------------------------
const TemplateStyleB = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    // UPDATED: Destructure companyInfo
    const { primaryColor, logoUrl, companyName, companyInfo, templateBThankYou } = brandingSettings;
    return (
        <div 
            id="document-template" 
            className="relative bg-white p-10 max-w-4xl mx-auto shadow-2xl rounded-none print:p-6"
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

            {/* Header - Simple Style */}
            <div className="flex justify-between items-end mb-8 border-b-4 border-gray-300 pb-4">
                <div>
                    {/* REPLACED hardcoded text color with inline style */}
                    <h1 className="text-4xl font-extrabold uppercase" style={{ color: primaryColor }}>{currentDoc.documentType}</h1>
                    <p className="text-sm text-gray-600 mt-2">Document No: <span className='font-semibold'>{currentDoc.documentDetails.docNo}</span></p>
                    <p className="text-sm text-gray-600">Date: <span className='font-semibold'>{currentDoc.documentDetails.date}</span></p>
                </div>
                
                {/* Right side: Logo BEFORE Company Name */}
                <div className="text-right">
                    {/* 1. LOGO: Always before company name */}
                    <div className="mb-2 flex justify-end">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg" 
                            // Fallback in case of broken Base64 or URL
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                    </div>
                    {/* 2. Company Name & Details - NOW DYNAMIC */}
                    <p className="text-2xl font-bold text-gray-800">{companyName}</p>
                    <p className="text-xs">{companyInfo.address}</p>
                    <p className="text-xs">{companyInfo.email} | {companyInfo.phone}</p>
                </div>
            </div>

            {/* Client Details - Minimalist */}
            <div className="mb-6 p-3 border border-gray-200 rounded-lg">
                {/* REPLACED hardcoded text color with inline style */}
                <h3 className="text-xs font-bold mb-1 uppercase" style={{ color: primaryColor }}>Bill To</h3>
                <p className="text-sm font-semibold">{currentDoc.clientDetails.name} ({currentDoc.clientDetails.company})</p>
                <p className="text-xs text-gray-600">{currentDoc.clientDetails.address}</p>
                <p className="text-xs text-gray-600">{currentDoc.clientDetails.cityStateZip}</p>
                {/* The ClientDetailsBlock is not used here to keep this template distinct. 
                The editability in the original block is crucial for the app. */}
                <div className='mt-2 print:hidden'>
                    <p className='text-xs font-semibold text-gray-700'>Note: To edit client details, please switch back to Template A.</p>
                </div>
            </div>

            {/* Line Items Table (Using the shared component) */}
            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />

            {/* Totals Summary (Using the shared component) */}
            <TotalsSummary 
                totals={currentDoc.totals} 
                isEditable={isEditable} 
                onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                brandingSettings={brandingSettings} // PASS BRANDING SETTINGS
            />

            <hr className="my-6 border-gray-300" />

            {/* Footer (NOW EDITABLE Thank You Note) */}
            <div className="text-center text-xs text-gray-600">
                <p className="font-bold">Total Due: {formatCurrency(currentDoc.totals.totalDue)}</p>
                <p className="mt-2">Payment Terms: {currentDoc.documentDetails.terms}</p>
                
                {/* Editable Template B Thank You Note */}
                <div className="mt-4 italic">
                    {isEditable ? (
                        <input
                            type="text"
                            value={templateBThankYou}
                            onChange={(e) => handleTemplateDetailChange('brandingSettings', 'templateBThankYou', e.target.value)}
                            className={`w-full text-center p-0.5 border-b border-gray-300 focus:outline-none bg-transparent`}
                            style={{ borderBottomColor: primaryColor }}
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
// NEW: DocumentTemplate Switcher Component
// MODIFIED: DocumentTemplate now accepts brandingSettings
// -------------------------------------------------------------
const DocumentTemplate = (props) => {
    switch (props.currentDoc.templateStyle) {
        case 'StyleB':
            return <TemplateStyleB {...props} />;
        case 'StyleA':
        default:
            return <TemplateStyleA {...props} />;
    }
};


// --- 4. MAIN APP COMPONENT ---

const App = () => {
  
  // *** MODIFIED INITIAL STATE TO LOAD FROM LOCALSTORAGE ***
  const initialUserId = getInitialState('userId', 'UNAUTHENTICATED');
  
  // Set initial login state based on whether a userId was found
  const [isLoggedIn, setIsLoggedIn] = useState(initialUserId !== 'UNAUTHENTICATED'); 
  
  // Document Ledger and Customer List
  const [documentLedger, setDocumentLedger] = useState(getInitialState('documentLedger', sampleLedger));
  // UPDATED: Use tempSampleCustomers for initial state for customerList
  const [customerList, setCustomerList] = useState(getInitialState('customerList', tempSampleCustomers));

  // Current User ID State
  const [userId, setUserId] = useState(initialUserId);
  
  // Set currentDoc to the first document in the ledger, or a new blank one if ledger is empty
  const initialDoc = documentLedger.length > 0 ? documentLedger[0] : initialData('Invoice');
  // MODIFIED: Ensure initial currentDoc loaded from storage has a templateStyle
  const safeInitialDoc = { ...initialDoc, templateStyle: initialDoc.templateStyle || 'StyleA' };
  const [currentDoc, setCurrentDoc] = useState(getInitialState('currentDoc', safeInitialDoc)); 
  
  // NEW: State for Branding Settings (Logo, Colors, Company Name)
  // IMPORTANT: getInitialState now handles merging defaultBrandingSettings with stored data
  const initialBrandingSettings = getInitialState('brandingSettings', defaultBrandingSettings);
  const [brandingSettings, setBrandingSettings] = useState(initialBrandingSettings);

  // Other states
  const [isEditable, setIsEditable] = useState(false); // Default to non-editable after load
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false); // NEW: State for template selector
  // MODIFIED: State for Color Settings Modal/Panel is now for Branding
  const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Ref for the hidden file input element (used for data upload)
  const fileInputRef = useRef(null);
  // NEW Ref for the hidden logo file input element (used for logo upload)
  const logoInputRef = useRef(null);

  // *** NEW useEffect Hooks for Local Storage Persistence ***
  
  // Effect 1: Save Document Ledger to localStorage
  useEffect(() => {
    localStorage.setItem('documentLedger', JSON.stringify(documentLedger));
  }, [documentLedger]);

  // Effect 2: Save Customer List to localStorage
  useEffect(() => {
    localStorage.setItem('customerList', JSON.stringify(customerList));
  }, [customerList]);

  // Effect 3: Save Current User ID to localStorage (for persistence of login state)
  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);
  
  // Effect 4: Save Current Document to localStorage (to restore editor state)
  useEffect(() => {
    localStorage.setItem('currentDoc', JSON.stringify(currentDoc));
  }, [currentDoc]);
  
  // Effect 5 (MODIFIED): Save Branding Settings to localStorage
  useEffect(() => {
    localStorage.setItem('brandingSettings', JSON.stringify(brandingSettings));
  }, [brandingSettings]);
  // *** END Local Storage Persistence Hooks ***


  // Use useCallback for stable function definitions
  const recalculateTotals = useCallback((items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const tax = subtotal * (taxRate / 100);
    const totalDue = subtotal + tax;
    return { subtotal, tax, totalDue, taxRate };
  }, []);

  // Update totals whenever line items or tax rate changes (NO AUTOSAVE LOGIC HERE)
  useEffect(() => {
    const newTotals = recalculateTotals(currentDoc.lineItems, currentDoc.totals.taxRate);
    setCurrentDoc(prev => ({ ...prev, totals: newTotals }));
  }, [currentDoc.lineItems, currentDoc.totals.taxRate, recalculateTotals]);
  
  // Function to filter ledger for sidebar sections (for counts and display)
  const getFilteredDocs = useCallback((sectionTitle) => {
      return documentLedger.filter(doc => {
          if (sectionTitle === 'Pending Quotes') return doc.documentType === 'Quotation' && doc.status === 'Pending';
          if (sectionTitle === 'Outstanding Invoices') return doc.documentType === 'Invoice' && doc.status === 'Outstanding';
          if (sectionTitle === 'Receipts') return doc.documentType === 'Receipt' && doc.status === 'Paid';
          // Removed 'Approved Quotes'
          return false;
      });
  }, [documentLedger]);


  // Function to show modal message
  const showModal = (message) => {
    setModalMessage(message);
    setIsModalVisible(true);
  };
  
  // Placeholder for user login/logout
  const handleLogin = () => {
    // In a real app: signInWithEmailAndPassword(auth, email, password)
    setIsLoggedIn(true); 
    // Simulate setting a real user ID after successful login
    setUserId(typeof __initial_auth_token !== 'undefined' ? 'canvas-user-8b1c4d9e' : 'mock-user-c2f3a4b9');
  };

  const handleLogout = () => {
    // In a real app: signOut(auth).then(() => setIsLoggedIn(false));
    setIsLoggedIn(false);
    setUserId('UNAUTHENTICATED');
  };
  
  // MODIFIED: Generic handler for detail changes, including nested branding settings
  const handleTemplateDetailChange = (section, key, value) => {
      // 1. Check if the section refers to brandingSettings (using dot notation for nesting)
      if (section.startsWith('brandingSettings')) {
          setBrandingSettings(prev => {
              const parts = section.split('.'); // e.g., ['brandingSettings', 'paymentDetails']
              let newState = { ...prev };
              
              // Handle top-level branding change (e.g., 'brandingSettings', 'companyName' or 'templateBThankYou')
              if (parts.length === 1) {
                  newState[key] = value;
              } 
              // Handle nested branding change (e.g., 'brandingSettings.companyInfo', 'address')
              else if (parts.length === 2) {
                  const nestedKey = parts[1]; // 'companyInfo', 'paymentDetails', or 'contactDetails'
                  newState = {
                      ...newState,
                      [nestedKey]: {
                          ...newState[nestedKey],
                          [key]: value
                      }
                  };
              } else {
                  console.error('Too many nesting levels for branding update.');
                  return prev;
              }
              return newState;
          });
          return; // Stop here if it was a branding setting update
      }

      // 2. Otherwise, proceed with currentDoc update logic
      // Handle simple property update (like 'templateStyle')
      if (section === 'templateStyle') {
          setCurrentDoc(prev => ({ ...prev, templateStyle: value }));
      }
      // Handle nested property update (documentDetails, totals, clientDetails)
      else {
          const updatedDoc = {
              ...currentDoc,
              [section]: {
                  ...currentDoc[section],
                  [key]: value,
              }
          };

          setCurrentDoc(updatedDoc);
          
          // IMPORTANT: If the change is to clientDetails AND the client is an existing, 
          // non-NEW-CLIENT, update the customerList state immediately.
          if (section === 'clientDetails' && updatedDoc.clientDetails.id !== 'NEW-CLIENT') {
              // If the customer ID exists in the main list, update it.
              setCustomerList(prevList => prevList.map(customer => {
                  if (customer.id === updatedDoc.clientDetails.id) {
                      return {
                          ...customer,
                          [key]: value, // Apply the change to the customer in the list
                      };
                  }
                  return customer;
              }));
          }
      }
  };
  
  // NEW: Handler for branding setting changes (colors, logo, company name)
  // This is used for top-level keys like 'primaryColor', 'accentColor', 'companyName', 'logoUrl'
  const handleBrandingChange = (key, value) => {
    setBrandingSettings(prev => ({
        ...prev,
        [key]: value
    }));
  };

  // NEW: Handler for logo file upload (converts to Base64)
  const handleLogoUploadClick = () => {
    logoInputRef.current.click();
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            handleBrandingChange('logoUrl', e.target.result); // Save Base64 string
            showModal('Logo uploaded and saved successfully!');
        };
        reader.readAsDataURL(file); // Convert image to Base64
    } else if (file) {
        showModal('Error: Please select a valid image file.');
    }
    // Clear the input value so the same file can be uploaded again
    event.target.value = null; 
  };


  // Handler for line item changes
  const handleLineItemChange = (index, key, value) => {
      const newItems = [...currentDoc.lineItems];
      let val = value;
      if (key === 'qty' || key === 'unitPrice') {
        val = parseFloat(value) || 0; // Ensure numbers are numbers
      }
      newItems[index] = { 
          ...newItems[index], 
          [key]: val, 
          // Re-calculate amount for the item based on its new state
          amount: val * (key === 'qty' ? newItems[index].unitPrice : newItems[index].qty)
      };
      
      setCurrentDoc(prev => ({ ...prev, lineItems: newItems }));
  };

  const handleDeleteItem = (index) => {
      setCurrentDoc(prev => ({
          ...prev,
          lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
  };

  const handleAddItem = () => {
      setCurrentDoc(prev => ({
          ...prev,
          lineItems: [...prev.lineItems, { description: 'New Item', qty: 1, unitPrice: 0.00, amount: 0.00 }]
      }));
  };

  // Handler for selecting an existing customer
  const handleSelectCustomer = (customerId) => {
    if (customerId === 'NEW-CLIENT') {
        setCurrentDoc(prev => ({ 
            ...prev, 
            clientDetails: initialClient 
        }));
    } else {
        const selectedCustomer = customerList.find(c => c.id === customerId); // Use customerList state
        if (selectedCustomer) {
            // Overwrite clientDetails with the selected customer's data
            setCurrentDoc(prev => ({ 
                ...prev, 
                clientDetails: selectedCustomer 
            }));
        }
    }
  };


  // MODIFIED: Explicitly save the current document with sequential numbering based on ID Cycle Year.
  const handleSaveDocument = () => {
      // 1. Determine if it's an update or a new document
      const isNew = currentDoc.id.startsWith('TEMP-') || !documentLedger.some(d => d.id === currentDoc.id);

      let docToSave = currentDoc;
      let newCustomer = null;
            
      if (isNew) {
          // Determine the year for the ID cycle (resets in February)
          const currentDate = new Date();
          const currentIDCycleYear = getIDCycleYear(currentDate);

          // 1. Filter documents from the ledger that belong to the current ID cycle year
          const docsInCurrentCycle = documentLedger.filter(doc => {
              // Parse the stored document's date and find its ID cycle year
              const docDate = new Date(doc.documentDetails.date);
              const docCycleYear = getIDCycleYear(docDate);
              
              return docCycleYear === currentIDCycleYear;
          });
          
          // Calculate the next sequential number (starts counting from 1)
          // The count is based ONLY on documents within the current cycle, ensuring the February reset.
          const nextDocNum = docsInCurrentCycle.length + 1;
            
          // 2. Generate permanent Document ID (e.g., RS-2025-12-09-004)
          const newDocId = generateDateBasedID('RS', nextDocNum);

          docToSave = { 
              ...docToSave, 
              id: newDocId, 
              // Also update the display number (docNo) with the new sequential ID
              documentDetails: {
                  ...docToSave.documentDetails,
                  docNo: newDocId 
              },
              status: docToSave.documentType === 'Receipt' ? 'Paid' : (docToSave.documentType === 'Quotation' ? 'Pending' : 'Outstanding') 
          };
            
          // 3. Assign permanent Customer ID if it's a new client AND save to customerList
          if (docToSave.clientDetails.id === 'NEW-CLIENT') {
              // MODIFIED: Generate Customer ID using the requested 'RS' prefix and the new sequential number
              const newCustId = generateDateBasedID('RS', nextDocNum); 
              
              newCustomer = {
                  ...docToSave.clientDetails,
                  id: newCustId, 
              };
                
              docToSave = {
                  ...docToSave,
                  clientDetails: newCustomer,
              };
          }
      } else {
          // ADDED LOGIC FOR UPDATING EXISTING CUSTOMERS
          // If this is an update to an existing document, and the clientDetails.id is NOT 'NEW-CLIENT' 
          // (meaning it's an existing customer), we need to ensure the customerList is also updated.
          if (docToSave.clientDetails.id !== 'NEW-CLIENT') {
              // Note: Setting newCustomer to the current clientDetails triggers the update logic below.
              newCustomer = docToSave.clientDetails;
          }
      } 

      // 4. Update the Customer List (if a new customer was created OR an existing one was modified)
      if (newCustomer) {
          setCustomerList(prevList => {
              // Check if the customer ID already exists in the list
              const existingIndex = prevList.findIndex(c => c.id === newCustomer.id);

              if (existingIndex > -1) {
                  // Existing customer: Update the record in the list
                  const newList = [...prevList];
                  newList[existingIndex] = newCustomer;
                  return newList;
              } else {
                  // New customer: Add to the list
                  return [...prevList, newCustomer];
              }
          });
      }

      // 5. Update the Ledger
      setDocumentLedger(prevLedger => {
          if (isNew) {
              return [...prevLedger, docToSave];
          } else {
              // Update existing document in the ledger
              return prevLedger.map(doc => doc.id === docToSave.id ? docToSave : doc);
          }
      });
      
      // 6. Update the current document state with the permanent IDs (only relevant for 'isNew' scenario, but safe here)
      setCurrentDoc(docToSave);

      console.log(`Saving document: ${docToSave.documentDetails.docNo}`, docToSave);
      showModal(`${docToSave.documentType} ${docToSave.documentDetails.docNo} has been saved successfully!`);
  };

  // Handler for selecting an existing document from the sidebar
  const handleSelectDocument = (docId) => {
    const docToLoad = documentLedger.find(d => d.id === docId);
    if (docToLoad) {
        // Ensure the loaded document has a templateStyle for safety
        const safeDocToLoad = { ...docToLoad, templateStyle: docToLoad.templateStyle || 'StyleA' };
        setCurrentDoc(safeDocToLoad);
        // Documents loaded from the ledger are not editable by default
        setIsEditable(false); 
        // Close dropdown if open
        setIsDropdownOpen(false);
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
              documentDetails: { ...currentDoc.documentDetails, isPaid: true, stampText: 'PAID' }
          };

          // 2. Update the Ledger with the paid document
          setDocumentLedger(prevLedger => 
              prevLedger.map(doc => doc.id === paidDoc.id ? paidDoc : doc)
          );
          
          // 3. Load the paid document into the editor
          setCurrentDoc(paidDoc);
          setIsEditable(false);

          showModal(`Invoice ${paidDoc.documentDetails.docNo} marked as Paid and updated in the Receipts ledger!`);
      }
  };
  
  // NEW: Handler for marking a quotation as approved/converted to an invoice
  const handleApproveQuotation = () => {
      if (currentDoc.documentType === 'Quotation' && currentDoc.status === 'Pending') {
          // 1. Update the document's type and status
          const approvedDoc = { 
              ...currentDoc, 
              documentType: 'Invoice', // Change type to Invoice
              status: 'Outstanding', // Change status to Outstanding
              documentDetails: { 
                  ...currentDoc.documentDetails, 
                  isPaid: false, 
                  // Optionally clear the stamp text if it was present
                  stampText: '' 
              }
          };

          // 2. Update the Ledger with the approved document
          setDocumentLedger(prevLedger => 
              prevLedger.map(doc => doc.id === approvedDoc.id ? approvedDoc : doc)
          );
          
          // 3. Load the approved document into the editor
          setCurrentDoc(approvedDoc);
          setIsEditable(false);

          showModal(`Quotation ${approvedDoc.documentDetails.docNo} has been Approved, converted to an Invoice, and marked Outstanding!`);
      } else {
          showModal(`Error: Only Pending Quotations can be Approved.`);
      }
  };

  // Simple print to PDF using the browser's native function
  const handlePrintToPDF = () => {
      // The CSS in index.css handles hiding the UI elements for a clean print
      window.print(); 
  };

  // Function to create a new document and close the dropdown
  const createNewDocument = (type) => {
      // IMPORTANT: In a real app, you would confirm if the current doc is saved before proceeding.
      // Use the template style of the current document for the new one as a default
      setCurrentDoc(initialData(type, null, currentDoc.templateStyle)); // initialData now assigns a TEMP- ID
      setIsEditable(true); // New documents should be editable
      setIsDropdownOpen(false);
  }

  // *** Data Download/Upload Functions ***
  
  // Function to download the entire application state as a JSON file
  const handleDownloadData = () => {
      // Collect all persistent data into a single object
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
        if (uploadedData.userId) {
          setUserId(uploadedData.userId);
          setIsLoggedIn(uploadedData.userId !== 'UNAUTHENTICATED');
        }
        // NEW: Load branding settings (using the safe merge logic from getInitialState's fallback)
        if (uploadedData.brandingSettings && typeof uploadedData.brandingSettings === 'object') {
            // Use getInitialState logic for safe deep merging
            const mergedSettings = getInitialState('brandingSettings', uploadedData.brandingSettings);
            setBrandingSettings(mergedSettings);
        }
        
        // Reset currentDoc to a safe state (e.g., the first document in the new ledger or a new one)
        const firstDoc = uploadedData.documentLedger?.[0] || initialData('Invoice');
        const safeDoc = { ...firstDoc, templateStyle: firstDoc.templateStyle || 'StyleA' };
        setCurrentDoc(safeDoc);
        setIsEditable(false);
        
        showModal('Application data restored successfully!');
      } catch (error) {
        console.error('Error parsing uploaded JSON file:', error);
        showModal('Error: Invalid JSON file format.');
      }
    };
    
    reader.readAsText(file);
    
    // Clear the input value so the same file can be uploaded again
    event.target.value = null; 
  };
  
  // --- Login Screen ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-xl rounded-xl w-96">
          {/* REPLACED hardcoded text color with inline style */}
          <h2 className="text-3xl font-extrabold mb-6 text-center" style={{ color: brandingSettings.primaryColor }}>RS Finance Login</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                placeholder="user@rsfinance.co.za" 
                required 
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
                // REPLACED hardcoded focus border color with inline style
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:border-1" 
                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
              />
            </div>
            <button 
              type="submit" 
              // REPLACED hardcoded background color with inline style
              className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center"
              style={{ backgroundColor: brandingSettings.primaryColor }}
            >
              <LogIn size={20} className="mr-2" /> Secure Log In
            </button>
            <p className="text-center text-xs mt-4 text-gray-500">Using `__initial_auth_token` for automatic sign-in in Canvas environment.</p>
          </form>
        </div>
      </div>
    );
  }

  // --- Main Application UI ---
  return (
    <div className="flex min-h-screen bg-gray-100">
        
      <ModalMessage 
        message={modalMessage} 
        isVisible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
        primaryColor={brandingSettings.primaryColor} // PASS PRIMARY COLOR
      />
      
      {/* NEW: Hidden file input for logo upload */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        style={{ display: 'none' }}
        accept="image/*"
      />
      
      {/* NEW: Hidden file input for data upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".json"
      />

      {/* 5. SIDEBAR: Document Ledger (print:hidden hides this on print) */}
      {/* REPLACED hardcoded background color with inline style */}
      <aside className="w-64 text-white flex flex-col p-4 shadow-2xl print:hidden" style={{ backgroundColor: brandingSettings.primaryColor }}>
        <h2 className="text-2xl font-bold mb-6 pt-2 flex items-center border-b border-white/20 pb-3">
          <FileText size={24} className="mr-2" /> Document Ledger
        </h2>
        
        {/* Search Bar */}
        <div className="mb-6 relative">
          <input 
            type="search" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // REPLACED hardcoded focus border color with inline style
            className="w-full p-2 pl-10 text-sm text-gray-800 rounded-lg bg-white focus:outline-none focus:ring-2"
            style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        {/* Document Sections - NOW DISPLAYS LEDGER DATA */}
        <nav className="grow space-y-2 overflow-y-auto">
          {['Pending Quotes', 'Outstanding Invoices', 'Receipts'].map(sectionTitle => {
                // Filter the ledger based on the section title
                const filteredDocs = getFilteredDocs(sectionTitle).filter(doc => 
                    // Simple search filter by document number, customer company, or name
                    doc.documentDetails.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.clientDetails.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.clientDetails.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                return (
                    <div key={sectionTitle}>
                        {/* Section Header with Count */}
                        <h3 className="flex items-center p-2 text-sm font-bold uppercase border-b border-white/20 mb-1">
                            {sectionTitle}
                            {/* REPLACED hardcoded text color with inline style */}
                            <span className="ml-auto text-xs font-semibold bg-white px-2 py-0.5 rounded-full" style={{ color: brandingSettings.primaryColor }}>
                                {filteredDocs.length}
                            </span>
                        </h3>
                        
                        {/* List of Documents in this Section */}
                        <div className="space-y-1 pl-4">
                            {filteredDocs.length === 0 ? (
                                <p className="text-xs italic text-white/70 p-2">No documents match the filter.</p>
                            ) : (
                                filteredDocs.map(doc => (
                                    <a 
                                        key={doc.id}
                                        href="#" 
                                        onClick={() => handleSelectDocument(doc.id)}
                                        // Highlight the currently selected document
                                        // REPLACED hardcoded text color with inline style
                                        className={`block p-1 text-xs rounded-lg transition duration-100 ${currentDoc.id === doc.id ? 'bg-white font-bold' : 'hover:bg-white/10'}`}
                                        style={currentDoc.id === doc.id ? { color: brandingSettings.primaryColor } : {}}
                                        title={`Load ${doc.documentDetails.docNo}`}
                                    >
                                        {doc.documentDetails.docNo} - {formatCurrency(doc.totals.totalDue)}
                                    </a>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </nav>
        
        {/* Settings/Logout */}
        <div className="pt-4 mt-auto border-t border-white/20">
          
          {/* Display User ID */}
          <div className="mb-3 p-2 text-xs font-mono break-all bg-white/10 rounded-lg">
            <span className="font-semibold block mb-1">Current User ID:</span>
            {userId}
          </div>

          <button onClick={() => setIsEditable(prev => !prev)} className="w-full flex items-center p-2 text-sm font-medium rounded-lg hover:bg-white hover:text-[#039dbf] transition duration-150">
            <Edit size={18} className="mr-2" /> Toggle Edit Mode ({isEditable ? 'ON' : 'OFF'})
          </button>
          <button onClick={handleLogout} className="w-full flex items-center p-2 text-sm font-medium rounded-lg hover:bg-red-600 transition duration-150 mt-1">
            <LogIn size={18} className="rotate-180 mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        
        {/* 6. ACTION SECTION (Top of Template Section) (print:hidden hides this on print) */}
        <div className="bg-white shadow-md p-4 flex justify-between items-center z-10 sticky top-0 print:hidden border-b border-gray-200">
          {/* REPLACED hardcoded text color with inline style */}
          <h1 className="text-2xl font-extrabold" style={{ color: brandingSettings.primaryColor }}>{currentDoc.documentType} Editor</h1>
          
          <div className="flex items-center space-x-4">
            
            {/* Branding Settings Dropdown (MODIFIED: ADDED max-h-[80vh] and overflow-y-auto) */}
            <div className="relative">
                <button 
                    onClick={() => setIsBrandingSettingsOpen(prev => !prev)}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-300 font-semibold transition shadow-md"
                >
                    <Settings size={18} className="mr-2" /> 
                    Branding
                    <div className="w-4 h-4 rounded-full ml-2" style={{ backgroundColor: brandingSettings.primaryColor, border: `1px solid ${brandingSettings.accentColor}` }}></div>
                </button>
                
                {isBrandingSettingsOpen && (
                    <div className="absolute right-0 mt-2 w-80 p-4 rounded-lg shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-[80vh] overflow-y-auto">
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

                            <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">Logo URL / Base64:</label>
                            <textarea
                                value={brandingSettings.logoUrl} 
                                onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                                // REPLACED hardcoded focus border color with inline style
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs h-16 resize-none focus:ring-1 focus:border-1"
                                style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                placeholder="Paste Image URL or Base64 string here..."
                            />
                        </div>

                        {/* NEW: Company Contact Details */}
                        <div className="mb-4 border-t pt-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1 flex items-center">
                                <Layout size={14} className='mr-1' /> Company Contact Details
                            </h4>
                            
                            {/* Company Address */}
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Address:</label>
                                <input 
                                    type="text" 
                                    value={brandingSettings.companyInfo.address} 
                                    onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', 'address', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                    style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                />
                            </div>

                            {/* Company Phone */}
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone:</label>
                                <input 
                                    type="text" 
                                    value={brandingSettings.companyInfo.phone} 
                                    onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', 'phone', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                    style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                />
                            </div>
                            
                            {/* Company Email */}
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email:</label>
                                <input 
                                    type="email" 
                                    value={brandingSettings.companyInfo.email} 
                                    onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', 'email', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                    style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                />
                            </div>
                            
                            {/* Company VAT No */}
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">VAT No.:</label>
                                <input 
                                    type="text" 
                                    value={brandingSettings.companyInfo.vatNo} 
                                    onChange={(e) => handleTemplateDetailChange('brandingSettings.companyInfo', 'vatNo', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:border-1"
                                    style={{ focusRingColor: brandingSettings.primaryColor, focusBorderColor: brandingSettings.primaryColor }}
                                />
                            </div>
                        </div>

                        {/* 3. Color Settings */}
                        <div className='border-t pt-4'>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Colors</h4>
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Color (Headers, Borders):</label>
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

                        <button 
                            onClick={() => setBrandingSettings(defaultBrandingSettings)}
                            className="mt-4 w-full text-center text-xs text-red-500 hover:text-red-700"
                        >
                            Reset to Default Branding
                        </button>
                    </div>
                )}
            </div>
            {/* End Branding Settings Dropdown */}

            {/* Template Selector Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setIsTemplateSelectorOpen(prev => !prev)}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-300 font-semibold transition shadow-md"
                >
                    <Layout size={18} className="mr-2" /> 
                    Template: {currentDoc.templateStyle} 
                    <ChevronDown size={16} className="ml-2" />
                </button>
                
                {isTemplateSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <button 
                            onClick={() => { handleTemplateDetailChange('templateStyle', 'templateStyle', 'StyleA'); setIsTemplateSelectorOpen(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                        >
                            Template Style A (Default)
                        </button>
                        <button 
                            onClick={() => { handleTemplateDetailChange('templateStyle', 'templateStyle', 'StyleB'); setIsTemplateSelectorOpen(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                        >
                            Template Style B (Minimal)
                        </button>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <button 
                onClick={handleSaveDocument}
                className="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700 font-semibold transition shadow-md"
            >
                <Save size={18} className="mr-2" /> Save Document
            </button>

            {/* New Document Dropdown (CLICKABLE) */}
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(prev => !prev)}
                // REPLACED hardcoded background color with inline style
                className="text-white py-2 px-4 rounded-lg flex items-center hover:opacity-80 font-semibold transition shadow-md"
                style={{ backgroundColor: brandingSettings.primaryColor }}
              >
                <Plus size={18} className="mr-2" /> New Document
              </button>
              
              {/* Dropdown Menu - Conditionally rendered */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-20">
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
                className="bg-yellow-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-yellow-700 font-semibold transition shadow-md"
              >
                <Calendar size={18} className="mr-2" /> Approve Quotation
              </button>
            )}

            {/* Mark Paid Button */}
            {currentDoc.documentType === 'Invoice' && currentDoc.status === 'Outstanding' && (
              <button 
                onClick={markAsPaid} 
                className="bg-purple-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-purple-700 font-semibold transition shadow-md"
              >
                <DollarSign size={18} className="mr-2" /> Mark as Paid
              </button>
            )}

            {/* Print/Save to PDF Button */}
            <button 
              onClick={handlePrintToPDF} 
              className="bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-800 font-semibold transition shadow-md"
            >
              Print/Save to PDF
            </button>
            
            {/* Download and Upload Icons (for data backup/restore) */}
            <div className='flex space-x-2 border-l pl-4 border-gray-300'>
                {/* MODIFIED: Added onClick handler to handleDownloadData */}
                <button 
                    title="Download Data Backup" 
                    onClick={handleDownloadData} 
                    className="p-2 text-gray-700 hover:text-green-600 bg-gray-100 rounded-full transition shadow-inner"
                >
                <Download size={24} />
                </button>
                {/* MODIFIED: Added onClick handler to handleUploadClick */}
                <button 
                    title="Upload Data Restore" 
                    onClick={handleUploadClick} 
                    className="p-2 text-gray-700 hover:text-red-600 bg-gray-100 rounded-full transition shadow-inner"
                >
                <Upload size={24} />
                </button>
            </div>
          </div>
        </div>
        
        {/* 7. TEMPLATE SECTION */}
        <div className="p-8 grow overflow-y-auto">
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
