import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogIn, FileText, Settings, Download, Upload, Plus, Search, Calendar, DollarSign, Users, Trash2, Edit, Save, User } from 'lucide-react';

// --- 1. FIREBASE & AUTH CONFIGURATION (Client-side) ---
// Note: In a real environment, __firebase_config and __initial_auth_token are provided globally.
const firebaseConfig = {
  apiKey: "AIzaSyBNevKsqQHgT2XRm4ELdnJmIrWN7b62FmY",
  authDomain: "documets-ledger.firebaseapp.com",
  projectId: "documets-ledger",
  storageBucket: "documets-ledger.firebasestorage.app",
  messagingSenderId: "974348742536",
  appId: "1:974348742536:web:22476ccbbb597cd575543d"
};

// --- 2. DUMMY DATA STRUCTURES ---

// Sample Customer List (Simulating database storage)
const sampleCustomers = [
    { id: 'CUST-001', company: 'Acme Corp', name: 'Wile E. Coyote', address: '123 Desert Rd', cityStateZip: 'Phoenix, AZ, 85001', phone: '555-1234', email: 'wile@acme.com' },
    { id: 'CUST-002', company: 'Stark Industries', name: 'Tony Stark', address: '10880 Malibu Point', cityStateZip: 'Malibu, CA, 90265', phone: '555-4321', email: 'tony@stark.com' },
    { id: 'CUST-003', company: 'Wayne Enterprises', name: 'Bruce Wayne', address: '1007 Mountain Drive', cityStateZip: 'Gotham, NJ, 07099', phone: '555-9876', email: 'bruce@wayne.com' },
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

const initialData = (docType = 'Invoice', id = null) => ({
  // Use the generated ID for new documents, or a temporary ID for the current editor state
  id: id || `TEMP-${Date.now()}`, 
  documentType: docType, // 'Invoice', 'Quotation', 'Receipt'
  // NEW: Add a 'status' for ledger filtering
  status: docType === 'Receipt' ? 'Paid' : 'Draft', 
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

// UPDATED: Sample Ledger for Initial State uses sequential numbering (001, 002, 003)
const sampleLedger = [
    {
        ...initialData('Invoice', 'RS-2025-12-09-001'),
        status: 'Outstanding',
        // Date is used for cycle counting: December 2025 is in the 2025 cycle
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-001', date: '2025-12-05', isPaid: false },
        clientDetails: sampleCustomers[0],
        totals: { subtotal: 500.00, taxRate: 15, tax: 75.00, totalDue: 575.00 },
        lineItems: [{ description: 'Annual Subscription', qty: 1, unitPrice: 500.00, amount: 500.00 }],
    },
    {
        ...initialData('Quotation', 'RS-2025-12-09-002'),
        status: 'Pending',
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-002', date: '2025-12-08', isPaid: false },
        clientDetails: sampleCustomers[1],
        totals: { subtotal: 1200.00, taxRate: 15, tax: 180.00, totalDue: 1380.00 },
        lineItems: [{ description: 'Consulting Services', qty: 10, unitPrice: 120.00, amount: 1200.00 }],
    },
    {
        ...initialData('Receipt', 'RS-2025-12-09-003'),
        status: 'Paid',
        documentDetails: { ...initialData().documentDetails, docNo: 'RS-2025-12-09-003', date: '2025-12-01', isPaid: true, stampText: 'PAID' },
        clientDetails: sampleCustomers[2],
        totals: { subtotal: 300.00, taxRate: 15, tax: 45.00, totalDue: 345.00 },
        lineItems: [{ description: 'Website Maintenance', qty: 3, unitPrice: 100.00, amount: 300.00 }],
    },
];

// NEW UTILITY FUNCTION: Read from local storage
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

// Custom Modal Component for messages
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


// Component for the Client Info
const ClientDetailsBlock = ({ details, isEditable, onDetailChange, customers, onSelectCustomer }) => {
    // Determine if the current customer is one of the pre-loaded ones
    const isPreloadedCustomer = customers.some(c => c.id === details.id && details.id !== 'NEW-CLIENT');
    // MODIFIED: If it's a preloaded customer, editing is allowed only if isEditable is true.
    // The only field that must remain read-only is 'id'.
    // const isInputEditable = isEditable && !isPreloadedCustomer; // <-- OLD LOGIC
    
    return (
        // REDUCED MARGIN: mb-8 -> mb-4
        <div className="mb-4 p-4 border-l-4 border-[#039dbf] bg-gray-50/50 rounded-r-lg">
            <h3 className="text-sm font-bold mb-2 uppercase text-[#039dbf]">Bill To</h3>

            {/* Customer Selection Dropdown - HIDDEN ON PRINT */}
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
                            // MODIFIED: Input is editable if the main app state is editable (isEditable is true).
                            // The only restriction is on the 'id' field, which is excluded from this map anyway.
                            className={`flex-1 text-gray-700 p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none focus:border-[#039dbf]' : 'border-none bg-transparent'} print:border-none print:shadow-none print:bg-transparent`}
                            readOnly={!isEditable} // Now read-only only if not in edit mode
                        />
                    </div>
                )
            ))}
        </div>
    );
};

// Component for Line Items Table
const LineItemsTable = ({ items, isEditable, onItemChange, onDeleteItem, onAddItem }) => (
  // REDUCED MARGIN: mb-8 -> mb-4
  <div className="mb-4 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden">
      <thead className="bg-[#039dbf] text-white">
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
                // REDUCED FONT: text-sm -> text-xs
                // ADDED print:border-none print:shadow-none print:bg-transparent
                className={`w-full text-xs text-gray-700 p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                readOnly={!isEditable}
              />
            </td>
            <td className="px-4 py-2 text-center">
              <input 
                type="number" 
                value={item.qty}
                onChange={(e) => onItemChange(index, 'qty', e.target.value)}
                // REDUCED FONT: text-sm -> text-xs
                // ADDED print:border-none print:shadow-none print:bg-transparent
                className={`w-16 text-xs text-gray-700 text-center p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                readOnly={!isEditable}
              />
            </td>
            <td className="px-4 py-2 text-right">
              <input 
                type="number" 
                value={item.unitPrice.toFixed(2)}
                onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                // REDUCED FONT: text-sm -> text-xs
                // ADDED print:border-none print:shadow-none print:bg-transparent
                className={`w-24 text-xs text-gray-700 text-right p-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none'} print:border-none print:shadow-none print:bg-transparent`}
                readOnly={!isEditable}
              />
            </td>
            {/* REDUCED FONT: text-sm -> text-xs */}
            <td className="px-4 py-2 text-right text-xs font-bold text-[#039dbf]">
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
        className="mt-4 text-[#039dbf] hover:text-[#039dbf]/80 text-sm flex items-center font-bold p-2 transition duration-200 bg-gray-100 rounded-lg print:hidden"
      >
        <Plus size={16} className="mr-1" /> Add Line Item
      </button>
    )}
  </div>
);

// Component for Totals Summary
const TotalsSummary = ({ totals, isEditable, onTotalChange }) => (
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
                // CHANGED: Input font size from text-sm to text-xs
                // ADDED print:border-none print:shadow-none
                className={`w-12 text-xs text-gray-700 text-right p-0.5 ${isEditable ? 'border-b border-gray-300 focus:outline-none' : 'border-none bg-transparent'} print:border-none print:shadow-none`}
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
        <tr className="bg-[#039dbf] text-white font-bold">
            {/* REDUCED FONT: text-lg -> text-base, kept p-3 */}
          <td className="p-3 text-base rounded-bl-lg">TOTAL DUE</td>
            {/* REDUCED FONT: text-lg -> text-base, kept p-3 */}
          <td className="p-3 text-right text-base rounded-br-lg">{formatCurrency(totals.totalDue)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// --- 4. MAIN APP COMPONENT ---

const App = () => {
  
  // *** MODIFIED INITIAL STATE TO LOAD FROM LOCALSTORAGE ***
  const initialUserId = getInitialState('userId', 'UNAUTHENTICATED');
  
  // Set initial login state based on whether a userId was found
  const [isLoggedIn, setIsLoggedIn] = useState(initialUserId !== 'UNAUTHENTICATED'); 
  
  // Document Ledger and Customer List
  const [documentLedger, setDocumentLedger] = useState(getInitialState('documentLedger', sampleLedger));
  // Note: The sampleCustomers list is now redundant and can be managed directly in the state, 
  // but we'll use a separate state variable for clarity and persistence of *new* customers.
  const [customerList, setCustomerList] = useState(getInitialState('customerList', sampleCustomers));

  // Current User ID State
  const [userId, setUserId] = useState(initialUserId);
  
  // Set currentDoc to the first document in the ledger, or a new blank one if ledger is empty
  const initialDoc = documentLedger.length > 0 ? documentLedger[0] : initialData('Invoice');
  const [currentDoc, setCurrentDoc] = useState(getInitialState('currentDoc', initialDoc)); 
  
  // Other states
  const [isEditable, setIsEditable] = useState(false); // Default to non-editable after load
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

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
          if (sectionTitle === 'Approved Quotes') return doc.documentType === 'Quotation' && doc.status === 'Approved';
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
  
  // MODIFIED: Generic handler for simple detail changes
  const handleTemplateDetailChange = (section, key, value) => {
      // 1. Update the current document state
      const updatedDoc = {
          ...currentDoc,
          [section]: {
              ...currentDoc[section],
              [key]: value,
          }
      };

      setCurrentDoc(updatedDoc);
      
      // 2. IMPORTANT: If the change is to clientDetails AND the client is an existing, 
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
              // The customerList was already updated by handleTemplateDetailChange, 
              // but we re-set it here just in case, ensuring the current doc's client details are canonical.
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
        setCurrentDoc(docToLoad);
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

  // Simple print to PDF using the browser's native function
  const handlePrintToPDF = () => {
      // The CSS in index.css handles hiding the UI elements for a clean print
      window.print(); 
  };

  // Function to create a new document and close the dropdown
  const createNewDocument = (type) => {
      // IMPORTANT: In a real app, you would confirm if the current doc is saved before proceeding.
      setCurrentDoc(initialData(type)); // initialData now assigns a TEMP- ID
      setIsEditable(true); // New documents should be editable
      setIsDropdownOpen(false);
  }

  // --- Login Screen ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-xl rounded-xl w-96">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-[#039dbf]">RS Finance Login</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" placeholder="user@rsfinance.co.za" required className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-[#039dbf] focus:border-[#039dbf]" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" placeholder="Enter password" required className="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-[#039dbf] focus:border-[#039dbf]" />
            </div>
            <button type="submit" className="w-full bg-[#039dbf] text-white py-3 rounded-lg font-semibold hover:bg-[#039dbf]/90 transition shadow-lg flex items-center justify-center">
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
      />

      {/* 5. SIDEBAR: Document Ledger (print:hidden hides this on print) */}
      <aside className="w-64 bg-[#039dbf] text-white flex flex-col p-4 shadow-2xl print:hidden">
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
            className="w-full p-2 pl-10 text-sm text-gray-800 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        {/* Document Sections - NOW DISPLAYS LEDGER DATA */}
        <nav className="flex-grow space-y-2 overflow-y-auto">
          {['Pending Quotes', 'Outstanding Invoices', 'Receipts', 'Approved Quotes'].map(sectionTitle => {
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
                            <span className="ml-auto text-xs font-semibold bg-white text-[#039dbf] px-2 py-0.5 rounded-full">
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
          <h1 className="text-2xl font-extrabold text-[#039dbf]">{currentDoc.documentType} Editor</h1>
          
          <div className="flex items-center space-x-4">
            
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
                className="bg-[#039dbf] text-white py-2 px-4 rounded-lg flex items-center hover:bg-[#039dbf]/80 font-semibold transition shadow-md"
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

            {/* Mark Paid Button */}
            {currentDoc.documentType === 'Invoice' && (
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
                <button title="Download Data Backup" className="p-2 text-gray-700 hover:text-green-600 bg-gray-100 rounded-full transition shadow-inner">
                <Download size={24} />
                </button>
                <button title="Upload Data Restore" className="p-2 text-gray-700 hover:text-red-600 bg-gray-100 rounded-full transition shadow-inner">
                <Upload size={24} />
                </button>
            </div>
          </div>
        </div>
        
        {/* 7. TEMPLATE SECTION */}
        <div className="p-8 flex-grow overflow-y-auto">
          {/* REMOVED min-h-[11in] and ADDED print:p-6 for space saving on print */}
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

            {/* REDUCED MARGIN: mb-8 -> mb-4 */}
            <div className="flex justify-between items-start mb-4">
                {/* LEFT SIDE: Logo and Company Info */}
                <div className="flex flex-col items-start max-w-sm">
                    {/* Image Holder for Logo - REDUCED SIZE: w-20 h-20 -> w-16 h-16 */}
                    <div className="w-16 h-16  border-gray-300 rounded-lg flex items-center justify-center text-xs-50 mb-3">
                        <img 
                            src="https://revolitsolutions.co.za/wp-content/uploads/2025/11/revolitlogo-yellow-icon-2024.png"
                            alt="Logo" 
                            className="rounded-lg w-26 h-14" 
                            onError={(e) => { e.target.onerror = null; e.target.src="/public/revolitlogo yellow icon 2024.png"; }}
                        />
                    </div>
                    {/* Company Info - Moved under the logo */}
                    <div className="text-left">
                        <p className="text-xl font-bold text-[#039dbf]">REVOLIT <span className='text-[#e9b318]'>SOLUTIONS</span></p>
                        
                        <p className="text-xs mt-1">611 Lydia Street Birchleigh North Ex 3, Kempton</p>
                        <p className="text-xs">Phone: 064 546 8642</p>
                        <p className="text-xs">Email: info@rs.co.za</p>
                        <p className="text-xs">Vat No. 91976412451</p>
                    </div>
                </div>

                {/* RIGHT SIDE: Document Details (DOC NO, CUSTOMER ID, DATE, TERMS) */}
                <div className="text-right space-y-2 text-sm w-70">
                    
                    {/* Document Type (e.g., INVOICE) */}
                    <h2 className="text-2xl font-bold text-[#039dbf] mb-4 uppercase">
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
                                // text-sm
                                className={`w-full font-bold p-0.5 text-[#039dbf] text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                readOnly={!isEditable}
                            />
                        </div>
                        
                        {/* CUSTOMER ID Column */}
                        <div className="text-left p-2 border border-gray-300 rounded-lg bg-gray-50 print:border-none print:bg-transparent">
                            <p className="text-xs font-bold text-gray-500 uppercase">CUSTOMER ID</p>
                            {/* Display the document's customer ID, not the doc's internal ID */}
                            <input 
                                type="text" 
                                value={currentDoc.clientDetails.id} 
                                onChange={(e) => isEditable && handleTemplateDetailChange('clientDetails', 'id', e.target.value)}
                                // text-sm
                                className={`w-full font-bold p-0.5 text-[#039dbf] text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
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
                                // text-sm
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
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
                                // text-sm
                                className={`w-full font-bold p-0.5 text-gray-700 text-xs mt-1 ${isEditable ? 'border-b border-gray-300 focus:outline-none bg-gray-50' : 'border-none bg-transparent'} print:border-none print:bg-transparent print:shadow-none`}
                                readOnly={!isEditable}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* END OF DOCUMENT HEADER LAYOUT */}
            {/* ------------------------------------------------------------- */}
            
            {/* REDUCED MARGIN: my-6 -> my-4 */}
            <hr className="my-4 border-[#039dbf] border-t-1" />
            

            <ClientDetailsBlock 
              details={currentDoc.clientDetails} 
              isEditable={isEditable}
              onDetailChange={handleTemplateDetailChange}
              customers={customerList} // Pass the state-managed list of customers
              onSelectCustomer={handleSelectCustomer} // Pass the selection handler
            />

            <LineItemsTable 
              items={currentDoc.lineItems} 
              isEditable={isEditable} 
              onItemChange={handleLineItemChange}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
            />

            <TotalsSummary 
                totals={currentDoc.totals} 
                isEditable={isEditable} 
                onTotalChange={(key, value) => handleTemplateDetailChange('totals', key, value)}
            />
            
            {/* REDUCED MARGIN: my-10 -> my-6 */}
            <hr className="my-6 border-gray-300" />
            
            {/* Payment and Contact Details */}
            <div className="flex justify-between items-start text-xs">
                <div>
                    <h3 className="text-sm font-bold mb-2 uppercase text-[#039dbf]">Payment Details</h3>
                    <p>Acc Holder: <span className='font-semibold'>Revolit Solutions</span></p>
                    <p>Account No: <span className='font-semibold'>FNB ACC NO.  63165202276</span></p>
                    <p className="mt-4 italic text-[#e9b318]">Payment must be made in full before the due date.</p>
                </div>

                <div className="text-right">
                    <p className="font-bold mb-2">If you have any questions about this document, please contact:</p>
                    <p>Nakedi Mphela, +27 64 546 8642, <span className='text-[#039dbf]'>nakedi@revolitsolutions.co.za</span></p>
                    <p className="mt-4 text-sm font-bold text-[#039dbf]">Thank you for choosing us!</p>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;