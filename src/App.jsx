import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogIn, FileText, Settings, Download, Upload, Plus, Search, Calendar, DollarSign, Users, Trash2, Edit, Save, User, Layout, ChevronDown, ImageIcon, User2 } from 'lucide-react';

// --- 1. FIREBASE & AUTH CONFIGURATION ---
// IMPORT FIREBASE FUNCTIONS
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeSoePIKZLQgXSErE2vyjdmpzd2blhUhY",
  authDomain: "leger-app-228f2.firebaseapp.com",
  projectId: "leger-app-228f2",
  storageBucket: "leger-app-228f2.firebasestorage.app",
  messagingSenderId: "23840369680",
  appId: "1:23840369680:web:0ec69e2f99f2be288b6e95"
};

// INITIALIZE FIREBASE APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- 2. DUMMY DATA STRUCTURES ---

const defaultBrandingSettings = {
    primaryColor: '#039dbf', 
    accentColor: '#e9b318', 
    companyName: 'REVOLIT SOLUTIONS',
    logoUrl: "https://revolitsolutions.co.za/wp-content/uploads/2025/11/revolitlogo-yellow-icon-2024.png", 
};

const generateDateBasedID = (prefix, sequenceNum) => {
    const date = new Date();
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const num = String(sequenceNum).padStart(3, '0');
    return `${prefix}-${YYYY}-${MM}-${DD}-${num}`;
};

const getIDCycleYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); 
    if (month === 0) return year - 1;
    return year;
};

const initialClient = {
    id: 'NEW-CLIENT', 
    company: 'Client Company (Optional)',
    name: 'New Client Name',
    address: 'Street address',
    cityStateZip: 'State / City, Zip code',
    phone: 'Client Phone',
    email: 'Client Email',
};

const initialData = (docType = 'Invoice', id = null, templateStyle = 'StyleA') => ({
  id: id || `TEMP-${Date.now()}`, 
  documentType: docType, 
  status: docType === 'Receipt' ? 'Paid' : 'Draft', 
  templateStyle: templateStyle, 
  documentDetails: {
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

const tempSampleCustomers = [
    { id: 'CUST-001', company: 'Acme Corp', name: 'Wile E. Coyote', address: '123 Desert Rd', cityStateZip: 'Phoenix, AZ, 85001', phone: '555-1234', email: 'wile@acme.com' },
    { id: 'CUST-002', company: 'Stark Industries', name: 'Tony Stark', address: '10880 Malibu Point', cityStateZip: 'Malibu, CA, 90265', phone: '555-4321', email: 'tony@stark.com' },
    { id: 'CUST-003', company: 'Wayne Enterprises', name: 'Bruce Wayne', address: '1007 Mountain Drive', cityStateZip: 'Gotham, NJ, 07099', phone: '555-9876', email: 'bruce@wayne.com' },
];

const sampleLedger = [
    {
        ...initialData('Invoice', 'RS-2025-12-09-001'),
        status: 'Outstanding',
        templateStyle: 'StyleA', 
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-001', date: '2025-12-05', isPaid: false },
        clientDetails: tempSampleCustomers[0],
        totals: { subtotal: 500.00, taxRate: 15, tax: 75.00, totalDue: 575.00 },
        lineItems: [{ description: 'Annual Subscription', qty: 1, unitPrice: 500.00, amount: 500.00 }],
    },
    {
        ...initialData('Quotation', 'RS-2025-12-09-002'),
        status: 'Pending',
        templateStyle: 'StyleA', 
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-002', date: '2025-12-08', isPaid: false },
        clientDetails: tempSampleCustomers[1],
        totals: { subtotal: 1200.00, taxRate: 15, tax: 180.00, totalDue: 1380.00 },
        lineItems: [{ description: 'Consulting Services', qty: 10, unitPrice: 120.00, amount: 1200.00 }],
    },
    {
        ...initialData('Receipt', 'RS-2025-12-09-003'),
        status: 'Paid',
        templateStyle: 'StyleA', 
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-003', date: '2025-12-01', isPaid: true, stampText: 'PAID' },
        clientDetails: tempSampleCustomers[2],
        totals: { subtotal: 300.00, taxRate: 15, tax: 45.00, totalDue: 345.00 },
        lineItems: [{ description: 'Website Maintenance', qty: 3, unitPrice: 100.00, amount: 300.00 }],
    },
];

const getInitialState = (key, fallbackValue) => {
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            return fallbackValue;
        }
    }
    return fallbackValue;
};


// --- 3. CUSTOM COMPONENTS & UTILITIES ---

const formatCurrency = (amount) => `R ${parseFloat(amount).toFixed(2)}`;

const ModalMessage = ({ message, isVisible, onClose }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-80 text-center">
                <h3 className="text-xl font-bold mb-4 text-[#039dbf]">Action Successful</h3>
                <p className="text-gray-700 mb-6">{message}</p>
                <button 
                    onClick={onClose} 
                    className="bg-[#039dbf] text-white py-2 px-4 rounded-lg hover:bg-[#039dbf]/80 transition font-semibold"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

const ClientDetailsBlock = ({ details, isEditable, onDetailChange, customers, onSelectCustomer, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    const isPreloadedCustomer = customers.some(c => c.id === details.id && details.id !== 'NEW-CLIENT');
    
    return (
        <div className="mb-4 p-4 border-l-4 bg-gray-50/50 rounded-r-lg" style={{ borderLeftColor: primaryColor }}>
            <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Bill To</h3>
            <div className="mb-4 print:hidden">
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                    <User size={14} className="mr-1" /> Select Existing Customer:
                </label>
                <select 
                    onChange={(e) => onSelectCustomer(e.target.value)}
                    value={isPreloadedCustomer ? details.id : 'NEW-CLIENT'}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-[#039dbf] focus:border-[#039dbf] transition"
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
            {Object.entries(details).map(([key, value]) => (
                (key !== 'id') && (
                    <div key={key} className="text-xs flex mb-0.5">
                        <label className="capitalize font-semibold mr-2 min-w-[100px]">{key.replace(/([A-Z])/g, ' $1').replace('id', 'ID')}:</label>
                        <input 
                            type="text" 
                            value={value} 
                            onChange={(e) => isEditable && onDetailChange('clientDetails', key, e.target.value)}
                            className={`flex-1 text-gray-700 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                            style={isEditable ? { borderBottomColor: primaryColor } : {}}
                            readOnly={!isEditable} 
                        />
                    </div>
                )
            ))}
        </div>
    );
};

const LineItemsTable = ({ items, isEditable, onItemChange, onDeleteItem, onAddItem, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    return (
      <div className="mb-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden">
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
                    className={`w-24 text-xs text-gray-700 text-right p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                    style={isEditable ? { borderBottomColor: primaryColor } : {}}
                    readOnly={!isEditable}
                  />
                </td>
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
        {isEditable && (
          <button 
            onClick={onAddItem} 
            className="mt-4 hover:text-[#039dbf]/80 text-sm flex items-center font-bold p-2 transition duration-200 bg-gray-100 rounded-lg print:hidden"
            style={{ color: primaryColor }}
          >
            <Plus size={16} className="mr-1" /> Add Line Item
          </button>
        )}
      </div>
    );
};

const TotalsSummary = ({ totals, isEditable, onTotalChange, brandingSettings }) => {
    const { primaryColor } = brandingSettings;
    return (
        <div className="flex justify-end">
            <table className="w-80 border-2 border-gray-300 rounded-lg overflow-hidden">
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
                                className={`w-12 text-xs text-gray-700 text-right p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-transparent' : 'border-none bg-transparent'} print:border-none print:shadow-none`}
                                style={isEditable ? { borderBottomColor: primaryColor } : {}}
                                readOnly={!isEditable}
                            />%
                        </td>
                    </tr>
                    <tr>
                        <td className="py-1 px-2 text-xs font-medium">TAX</td>
                        <td className="py-1 px-2 text-right text-xs">{formatCurrency(totals.tax)}</td>
                    </tr>
                    <tr className="text-white font-bold" style={{ backgroundColor: primaryColor }}>
                        <td className="p-3 text-base rounded-bl-lg">TOTAL DUE</td>
                        <td className="p-3 text-right text-base rounded-br-lg">{formatCurrency(totals.totalDue)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// -------------------------------------------------------------
// TEMPLATE COMPONENT A
// -------------------------------------------------------------
const TemplateStyleA = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, accentColor, logoUrl, companyName } = brandingSettings;
    return (
        <div id="document-template" className="relative bg-white p-10 max-w-4xl mx-auto shadow-2xl border border-gray-100 rounded-lg print:p-6">
            
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-500 opacity-20 transform -rotate-12 select-none border-4 border-red-500 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col items-start max-w-sm">
                    <div className="mb-3">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                    </div>
                    
                    <div className="text-left">
                        <p className="text-xl font-bold" style={{ color: primaryColor }}>
                            {companyName.split(' ')[0]} <span style={{ color: accentColor }}>{companyName.split(' ').slice(1).join(' ')}</span>
                        </p>
                        <p className="text-xs mt-1">611 Lydia Street Birchleigh North Ex 3, Kempton</p>
                        <p className="text-xs">Phone: 064 546 8642</p>
                        <p className="text-xs">Email: info@rs.co.za</p>
                        <p className="text-xs">Vat No. 91976412451</p>
                    </div>
                </div>

                <div className="text-right space-y-2 text-sm w-70">
                    <h2 className="text-2xl font-bold mb-4 uppercase" style={{ color: primaryColor }}>
                        {currentDoc.documentType}
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">DOC NO</p>
                            <input 
                                type="text" 
                                value={currentDoc.documentDetails.docNo} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'docNo', e.target.value)}
                                className={`w-full font-bold p-0.5 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ color: primaryColor, borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">CUSTOMER ID</p>
                            <input 
                                type="text" 
                                value={currentDoc.clientDetails.id} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('clientDetails', 'id', e.target.value)}
                                className={`w-full font-bold p-0.5 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ color: primaryColor, borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={true} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">DATE</p>
                            <input 
                                type="date" 
                                value={currentDoc.documentDetails.date} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'date', e.target.value)}
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">TERMS</p>
                            <input 
                                type="text" 
                                value={currentDoc.documentDetails.terms} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('documentDetails', 'terms', e.target.value)}
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                style={{ borderBottomColor: isEditable ? primaryColor : undefined }}
                                readOnly={!isEditable}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <hr className="my-4 border-t-1" style={{ borderColor: primaryColor }}/>
            
            <ClientDetailsBlock 
                details={currentDoc.clientDetails} 
                isEditable={isEditable}
                onDetailChange={handleTemplateDetailChange}
                customers={customerList}
                onSelectCustomer={handleSelectCustomer}
                brandingSettings={brandingSettings} 
            />

            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings} 
            />

            <TotalsSummary 
                totals={currentDoc.totals} 
                isEditable={isEditable} 
                onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                brandingSettings={brandingSettings} 
            />
            
            <hr className="my-6 border-gray-300" />
            
            <div className="flex justify-between items-start text-xs">
                <div>
                    <h3 className="text-sm font-bold mb-2 uppercase" style={{ color: primaryColor }}>Payment Details</h3>
                    <p>Acc Holder: <span className='font-semibold'>{companyName}</span></p>
                    <p>Account No: <span className='font-semibold'>FNB ACC NO. 63165202276</span></p>
                    <p className="mt-4 italic" style={{ color: accentColor }}>Payment must be made in full before the due date.</p>
                </div>

                <div className="text-right">
                    <p className="font-bold mb-2">If you have any questions about this document, please contact:</p>
                    <p>Nakedi Mphela, +27 64 546 8642, <span style={{ color: primaryColor }}>nakedi@revolitsolutions.co.za</span></p>
                    <p className="mt-4 text-sm font-bold" style={{ color: primaryColor }}>Thank you for choosing us!</p>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// TEMPLATE COMPONENT B
// -------------------------------------------------------------
const TemplateStyleB = ({ currentDoc, isEditable, handleTemplateDetailChange, customerList, handleSelectCustomer, handleLineItemChange, handleDeleteItem, handleAddItem, brandingSettings }) => {
    const { primaryColor, logoUrl, companyName } = brandingSettings;
    return (
        <div 
            id="document-template" 
            className="relative bg-white p-10 max-w-4xl mx-auto shadow-2xl rounded-none print:p-6"
            style={{ borderColor: primaryColor, borderWidth: '2px', borderStyle: 'solid' }}
        >
            
            {currentDoc.documentDetails.isPaid && currentDoc.documentType === 'Receipt' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-8xl font-black text-red-700 opacity-20 transform -rotate-12 select-none border-4 border-red-700 p-8 rounded-xl shadow-2xl">
                        {currentDoc.documentDetails.stampText}
                    </span>
                </div>
            )}

            <div className="flex justify-between items-end mb-8 border-b-4 border-gray-300 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold uppercase" style={{ color: primaryColor }}>{currentDoc.documentType}</h1>
                    <p className="text-sm text-gray-600 mt-2">Document No: <span className='font-semibold'>{currentDoc.documentDetails.docNo}</span></p>
                    <p className="text-sm text-gray-600">Date: <span className='font-semibold'>{currentDoc.documentDetails.date}</span></p>
                </div>
                
                <div className="text-right">
                    <div className="mb-2 flex justify-end">
                        <img 
                            src={logoUrl}
                            alt="Company Logo" 
                            className="w-auto max-w-[150px] max-h-[70px] rounded-lg" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='70'><rect width='150' height='70' fill='%23ccc'/><text x='75' y='40' font-size='12' text-anchor='middle' fill='%23666'>Logo Missing</text></svg>"; }}
                        />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{companyName}</p>
                    <p className="text-xs">611 Lydia Street Birchleigh North Ex 3, Kempton</p>
                    <p className="text-xs">info@rs.co.za | 064 546 8642</p>
                </div>
            </div>

            <div className="mb-6 p-3 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-bold mb-1 uppercase" style={{ color: primaryColor }}>Bill To</h3>
                <p className="text-sm font-semibold">{currentDoc.clientDetails.name} ({currentDoc.clientDetails.company})</p>
                <p className="text-xs text-gray-600">{currentDoc.clientDetails.address}</p>
                <p className="text-xs text-gray-600">{currentDoc.clientDetails.cityStateZip}</p>
                <div className='mt-2 print:hidden'>
                    <p className='text-xs font-semibold text-gray-700'>Note: To edit client details, please switch back to Template A.</p>
                </div>
            </div>

            <LineItemsTable 
                items={currentDoc.lineItems} 
                isEditable={isEditable} 
                onItemChange={handleLineItemChange}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                brandingSettings={brandingSettings} 
            />

            <TotalsSummary 
                totals={currentDoc.totals} 
                isEditable={isEditable} 
                onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
                brandingSettings={brandingSettings} 
            />

            <hr className="my-6 border-gray-300" />

            <div className="text-center text-xs text-gray-600">
                <p className="font-bold">Total Due: {formatCurrency(currentDoc.totals.totalDue)}</p>
                <p className="mt-2">Payment Terms: {currentDoc.documentDetails.terms}</p>
                <p className="mt-4 italic">Thank you for your business!</p>
            </div>
        </div>
    );
};

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
  
  // *** FIREBASE AUTH STATE MANAGEMENT ***
  // We don't read userId from local storage for auth purposes anymore.
  // Firebase handles persistence automatically.
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('UNAUTHENTICATED');
  
  // Document Ledger and Customer List
  const [documentLedger, setDocumentLedger] = useState(getInitialState('documentLedger', sampleLedger));
  const [customerList, setCustomerList] = useState(getInitialState('customerList', tempSampleCustomers));

  const initialDoc = documentLedger.length > 0 ? documentLedger[0] : initialData('Invoice');
  const safeInitialDoc = { ...initialDoc, templateStyle: initialDoc.templateStyle || 'StyleA' };
  const [currentDoc, setCurrentDoc] = useState(getInitialState('currentDoc', safeInitialDoc)); 
  
  const initialBrandingSettings = getInitialState('brandingSettings', defaultBrandingSettings);
  const [brandingSettings, setBrandingSettings] = useState(initialBrandingSettings);

  const [isEditable, setIsEditable] = useState(false); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false); 
  const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // --- LOGIN STATE ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // *** EFFECT: LISTEN FOR AUTH CHANGES ***
  // This replaces the manual local storage check for userId
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            setIsLoggedIn(true);
            setUserId(user.uid);
        } else {
            // User is signed out.
            setIsLoggedIn(false);
            setUserId('UNAUTHENTICATED');
        }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('documentLedger', JSON.stringify(documentLedger));
  }, [documentLedger]);

  useEffect(() => {
    localStorage.setItem('customerList', JSON.stringify(customerList));
  }, [customerList]);

  // NOTE: We no longer manually save userId to localStorage for auth logic, 
  // but if you used it for other things, you can keep it. Firebase is now source of truth.
  
  useEffect(() => {
    localStorage.setItem('currentDoc', JSON.stringify(currentDoc));
  }, [currentDoc]);
  
  useEffect(() => {
    localStorage.setItem('brandingSettings', JSON.stringify(brandingSettings));
  }, [brandingSettings]);


  const recalculateTotals = useCallback((items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const tax = subtotal * (taxRate / 100);
    const totalDue = subtotal + tax;
    return { subtotal, tax, totalDue, taxRate };
  }, []);

  useEffect(() => {
    const newTotals = recalculateTotals(currentDoc.lineItems, currentDoc.totals.taxRate);
    setCurrentDoc(prev => ({ ...prev, totals: newTotals }));
  }, [currentDoc.lineItems, currentDoc.totals.taxRate, recalculateTotals]);
  
  const getFilteredDocs = useCallback((sectionTitle) => {
      return documentLedger.filter(doc => {
          if (sectionTitle === 'Pending Quotes') return doc.documentType === 'Quotation' && doc.status === 'Pending';
          if (sectionTitle === 'Outstanding Invoices') return doc.documentType === 'Invoice' && doc.status === 'Outstanding';
          if (sectionTitle === 'Receipts') return doc.documentType === 'Receipt' && doc.status === 'Paid';
          return false;
      });
  }, [documentLedger]);


  const showModal = (message) => {
    setModalMessage(message);
    setIsModalVisible(true);
  };
  
  // *** FIREBASE LOGIN HANDLER ***
  const handleLogin = async (e) => {
    e.preventDefault(); 
    setLoginError(''); // Reset errors
    try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        // Successful login triggers the onAuthStateChanged listener automatically
    } catch (error) {
        console.error("Firebase Login Error", error);
        // Map common firebase errors to user friendly messages
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            setLoginError('Invalid email or password.');
        } else {
            setLoginError(error.message);
        }
    }
  };

  // *** FIREBASE LOGOUT HANDLER ***
  const handleLogout = async () => {
    try {
        await signOut(auth);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
    } catch (error) {
        console.error("Logout Error", error);
    }
  };
  
  const handleTemplateDetailChange = (section, key, value) => {
      const updatedDoc = {
          ...currentDoc,
          [section]: {
              ...currentDoc[section],
              [key]: value,
          }
      };
      
      if (section === 'templateStyle') {
          updatedDoc.templateStyle = value;
      }

      setCurrentDoc(updatedDoc);
      
      if (section === 'clientDetails' && updatedDoc.clientDetails.id !== 'NEW-CLIENT') {
          setCustomerList(prevList => prevList.map(customer => {
              if (customer.id === updatedDoc.clientDetails.id) {
                  return {
                      ...customer,
                      [key]: value, 
                  };
              }
              return customer;
          }));
      }
  };
  
  const handleBrandingChange = (key, value) => {
    setBrandingSettings(prev => ({
        ...prev,
        [key]: value
    }));
  };

  const handleLogoUploadClick = () => {
    logoInputRef.current.click();
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            handleBrandingChange('logoUrl', e.target.result); 
            showModal('Logo uploaded and saved successfully!');
        };
        reader.readAsDataURL(file); 
    } else if (file) {
        showModal('Error: Please select a valid image file.');
    }
    event.target.value = null; 
  };


  const handleLineItemChange = (index, key, value) => {
      const newItems = [...currentDoc.lineItems];
      let val = value;
      if (key === 'qty' || key === 'unitPrice') {
        val = parseFloat(value) || 0; 
      }
      newItems[index] = { 
          ...newItems[index], 
          [key]: val, 
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

  const handleSelectCustomer = (customerId) => {
    if (customerId === 'NEW-CLIENT') {
        setCurrentDoc(prev => ({ 
            ...prev, 
            clientDetails: initialClient 
        }));
    } else {
        const selectedCustomer = customerList.find(c => c.id === customerId); 
        if (selectedCustomer) {
            setCurrentDoc(prev => ({ 
                ...prev, 
                clientDetails: selectedCustomer 
            }));
        }
    }
  };


  const handleSaveDocument = () => {
      const isNew = currentDoc.id.startsWith('TEMP-') || !documentLedger.some(d => d.id === currentDoc.id);

      let docToSave = currentDoc;
      let newCustomer = null;
            
      if (isNew) {
          const currentDate = new Date();
          const currentIDCycleYear = getIDCycleYear(currentDate);

          const docsInCurrentCycle = documentLedger.filter(doc => {
              const docDate = new Date(doc.documentDetails.date);
              const docCycleYear = getIDCycleYear(docDate);
              return docCycleYear === currentIDCycleYear;
          });
          
          const nextDocNum = docsInCurrentCycle.length + 1;
            
          const newDocId = generateDateBasedID('RS', nextDocNum);

          docToSave = { 
              ...docToSave, 
              id: newDocId, 
              documentDetails: {
                  ...docToSave.documentDetails,
                  docNo: newDocId 
              },
              status: docToSave.documentType === 'Receipt' ? 'Paid' : (docToSave.documentType === 'Quotation' ? 'Pending' : 'Outstanding') 
          };
            
          if (docToSave.clientDetails.id === 'NEW-CLIENT') {
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
          if (docToSave.clientDetails.id !== 'NEW-CLIENT') {
              newCustomer = docToSave.clientDetails;
          }
      } 

      if (newCustomer) {
          setCustomerList(prevList => {
              const existingIndex = prevList.findIndex(c => c.id === newCustomer.id);
              if (existingIndex > -1) {
                  const newList = [...prevList];
                  newList[existingIndex] = newCustomer;
                  return newList;
              } else {
                  return [...prevList, newCustomer];
              }
          });
      }

      setDocumentLedger(prevLedger => {
          if (isNew) {
              return [...prevLedger, docToSave];
          } else {
              return prevLedger.map(doc => doc.id === docToSave.id ? docToSave : doc);
          }
      });
      
      setCurrentDoc(docToSave);
      showModal(`${docToSave.documentType} ${docToSave.documentDetails.docNo} has been saved successfully!`);
  };

  const handleSelectDocument = (docId) => {
    const docToLoad = documentLedger.find(d => d.id === docId);
    if (docToLoad) {
        const safeDocToLoad = { ...docToLoad, templateStyle: docToLoad.templateStyle || 'StyleA' };
        setCurrentDoc(safeDocToLoad);
        setIsEditable(false); 
        setIsDropdownOpen(false);
    }
  };


  const markAsPaid = () => {
      if (currentDoc.documentType === 'Invoice' && currentDoc.status === 'Outstanding') {
          const paidDoc = { 
              ...currentDoc, 
              documentType: 'Receipt',
              status: 'Paid',
              documentDetails: { ...currentDoc.documentDetails, isPaid: true, stampText: 'PAID' }
          };

          setDocumentLedger(prevLedger => 
              prevLedger.map(doc => doc.id === paidDoc.id ? paidDoc : doc)
          );
          
          setCurrentDoc(paidDoc);
          setIsEditable(false);
          showModal(`Invoice ${paidDoc.documentDetails.docNo} marked as Paid and updated in the Receipts ledger!`);
      }
  };
  
  const handleApproveQuotation = () => {
      if (currentDoc.documentType === 'Quotation' && currentDoc.status === 'Pending') {
          const approvedDoc = { 
              ...currentDoc, 
              documentType: 'Invoice', 
              status: 'Outstanding', 
              documentDetails: { 
                  ...currentDoc.documentDetails, 
                  isPaid: false, 
                  stampText: '' 
              }
          };

          setDocumentLedger(prevLedger => 
              prevLedger.map(doc => doc.id === approvedDoc.id ? approvedDoc : doc)
          );
          
          setCurrentDoc(approvedDoc);
          setIsEditable(false);

          showModal(`Quotation ${approvedDoc.documentDetails.docNo} has been Approved, converted to an Invoice, and marked Outstanding!`);
      } else {
          showModal(`Error: Only Pending Quotations can be Approved.`);
      }
  };

  const handlePrintToPDF = () => {
      window.print(); 
  };

  const createNewDocument = (type) => {
      setCurrentDoc(initialData(type, null, currentDoc.templateStyle)); 
      setIsEditable(true); 
      setIsDropdownOpen(false);
  }

  const handleDownloadData = () => {
      const backupData = {
          documentLedger: documentLedger,
          customerList: customerList,
          userId: userId,
          brandingSettings: brandingSettings, 
      };

      const jsonString = JSON.stringify(backupData, null, 2); 
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `RS_Finance_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showModal('Application data backup downloaded successfully!');
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uploadedData = JSON.parse(e.target.result);
        
        if (uploadedData.documentLedger && Array.isArray(uploadedData.documentLedger)) {
          setDocumentLedger(uploadedData.documentLedger);
        }
        if (uploadedData.customerList && Array.isArray(uploadedData.customerList)) {
          setCustomerList(uploadedData.customerList);
        }
        
        // Note: We do NOT restore userId from backup as that is a security risk/irrelevant with Auth
        
        if (uploadedData.brandingSettings && typeof uploadedData.brandingSettings === 'object') {
            setBrandingSettings(uploadedData.brandingSettings);
        }
        
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
    event.target.value = null; 
  };
  
  // --- Login Screen ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-xl rounded-xl w-96">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-[#039dbf]">RS Finance Login</h2>
          
          {/* Error Message Display */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 text-center">
                {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                placeholder="user@rsfinance.co.za" 
                required 
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-[#039dbf] focus:border-[#039dbf]"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                placeholder="Enter password" 
                required 
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-[#039dbf] focus:border-[#039dbf]"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-[#039dbf] text-white py-3 rounded-lg font-semibold hover:bg-[#039dbf]/90 transition shadow-lg flex items-center justify-center">
              <LogIn size={20} className="mr-2" /> Secure Log In
            </button>
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
      />
      
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        style={{ display: 'none' }}
        accept="image/*"
      />
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".json"
      />

      <aside className="w-64 bg-[#039dbf] text-white flex flex-col p-4 shadow-2xl print:hidden">
        <h2 className="text-2xl font-bold mb-6 pt-2 flex items-center border-b border-white/20 pb-3">
          <FileText size={24} className="mr-2" /> Document Ledger
        </h2>
        
        <div className="mb-6 relative">
          <input 
            type="search" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-10 text-sm text-gray-800 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        <nav className="flex-grow space-y-2 overflow-y-auto">
          {['Pending Quotes', 'Outstanding Invoices', 'Receipts'].map(sectionTitle => {
                const filteredDocs = getFilteredDocs(sectionTitle).filter(doc => 
                    doc.documentDetails.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.clientDetails.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.clientDetails.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                return (
                    <div key={sectionTitle}>
                        <h3 className="flex items-center p-2 text-sm font-bold uppercase border-b border-white/20 mb-1">
                            {sectionTitle}
                            <span className="ml-auto text-xs font-semibold bg-white text-[#039dbf] px-2 py-0.5 rounded-full">
                                {filteredDocs.length}
                            </span>
                        </h3>
                        
                        <div className="space-y-1 pl-4">
                            {filteredDocs.length === 0 ? (
                                <p className="text-xs italic text-white/70 p-2">No documents match the filter.</p>
                            ) : (
                                filteredDocs.map(doc => (
                                    <a 
                                        key={doc.id}
                                        href="#" 
                                        onClick={() => handleSelectDocument(doc.id)}
                                        className={`block p-1 text-xs rounded-lg transition duration-100 ${currentDoc.id === doc.id ? 'bg-white text-[#039dbf] font-bold' : 'hover:bg-white/10'}`}
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
        
        <div className="pt-4 mt-auto border-t border-white/20">
          
          <div className="mb-3 p-2 text-xs font-mono break-all bg-white/10 rounded-lg">
            <span className="font-semibold block mb-1">Firebase UID:</span>
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

      <main className="flex-1 flex flex-col">
        
        <div className="bg-white shadow-md p-4 flex justify-between items-center z-10 sticky top-0 print:hidden border-b border-gray-200">
          <h1 className="text-2xl font-extrabold text-[#039dbf]">{currentDoc.documentType} Editor</h1>
          
          <div className="flex items-center space-x-4">
            
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
                    <div className="absolute right-0 mt-2 w-80 p-4 rounded-lg shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 border-b pb-1">Customize Branding</h4>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                <User2 size={14} className='mr-1' /> Company Name:
                            </label>
                            <input 
                                type="text" 
                                value={brandingSettings.companyName} 
                                onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-[#039dbf] focus:border-[#039dbf]"
                            />
                        </div>
                        
                        <div className="mb-4 border-t pt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <ImageIcon size={14} className='mr-1' /> Logo Upload:
                            </label>
                            <div className='flex space-x-2 items-center'>
                                <button
                                    onClick={handleLogoUploadClick}
                                    className='flex-shrink-0 bg-blue-500 text-white py-1 px-3 rounded-lg text-sm hover:bg-blue-600 transition'
                                >
                                    Upload File
                                </button>
                                <img src={brandingSettings.logoUrl} alt="Current Logo" className='w-12 h-12 object-contain border rounded' />
                            </div>

                            <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">Logo URL / Base64:</label>
                            <textarea
                                value={brandingSettings.logoUrl} 
                                onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs h-16 resize-none focus:ring-[#039dbf] focus:border-[#039dbf]"
                                placeholder="Paste Image URL or Base64 string here..."
                            />
                        </div>

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
                                        className="flex-1 p-1 border border-gray-300 rounded-lg text-sm"
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
                                        className="flex-1 p-1 border border-gray-300 rounded-lg text-sm"
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

            <button 
                onClick={handleSaveDocument}
                className="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700 font-semibold transition shadow-md"
            >
                <Save size={18} className="mr-2" /> Save Document
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="bg-[#039dbf] text-white py-2 px-4 rounded-lg flex items-center hover:bg-[#039dbf]/80 font-semibold transition shadow-md"
              >
                <Plus size={18} className="mr-2" /> New Document
              </button>
              
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

            {currentDoc.documentType === 'Quotation' && currentDoc.status === 'Pending' && (
              <button 
                onClick={handleApproveQuotation} 
                className="bg-yellow-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-yellow-700 font-semibold transition shadow-md"
              >
                <Calendar size={18} className="mr-2" /> Approve Quotation
              </button>
            )}

            {currentDoc.documentType === 'Invoice' && currentDoc.status === 'Outstanding' && (
              <button 
                onClick={markAsPaid} 
                className="bg-purple-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-purple-700 font-semibold transition shadow-md"
              >
                <DollarSign size={18} className="mr-2" /> Mark as Paid
              </button>
            )}

            <button 
              onClick={handlePrintToPDF} 
              className="bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-800 font-semibold transition shadow-md"
            >
              Print/Save to PDF
            </button>
            
            <div className='flex space-x-2 border-l pl-4 border-gray-300'>
                <button 
                    title="Download Data Backup" 
                    onClick={handleDownloadData} 
                    className="p-2 text-gray-700 hover:text-green-600 bg-gray-100 rounded-full transition shadow-inner"
                >
                <Download size={24} />
                </button>
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
        
        <div className="p-8 flex-grow overflow-y-auto">
            <DocumentTemplate
                currentDoc={currentDoc}
                isEditable={isEditable}
                handleTemplateDetailChange={handleTemplateDetailChange}
                customerList={customerList}
                handleSelectCustomer={handleSelectCustomer}
                handleLineItemChange={handleLineItemChange}
                handleDeleteItem={handleDeleteItem}
                handleAddItem={handleAddItem}
                brandingSettings={brandingSettings} 
            />
        </div>
      </main>
    </div>
  );
};

export default App;
