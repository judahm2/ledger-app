import React, { useState, useEffect, useCallback, useMemo } from 'react';
// NEW: Imported Download and Upload icons for backup/restore
import { FileText, Folder, Plus, Trash2, Save, Printer, Loader2, Search, LogOut, User, Download, Upload } from 'lucide-react';

// NEW: Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- Constants ---

// IMPORTANT: REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyCN8UGG5kTeLiglSpdxY9lIPwXuZn5wONw",
  authDomain: "invoiceapp-75840.firebaseapp.com",
  projectId: "invoiceapp-75840",
  storageBucket: "invoiceapp-75840.firebasestorage.app",
  messagingSenderId: "240100738344",
  appId: "1:240100738344:web:f95e3335f996a7a2187c1d",
  measurementId: "G-WYKZPBM0R0"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);


const DOCUMENT_STORAGE_KEY = 'document_manager_documents';
const CUSTOMER_STORAGE_KEY = 'document_manager_customers';
const COUNTERS_STORAGE_KEY = 'document_manager_counters';
const USER_ID = 'local-browser-user'; 

// --- COLOR DEFINITION ---
const PRIMARY_HEX = '#039dbf'; // Cyan/Blue Primary
const SECONDARY_HEX = '#e9b318'; // Yellow/Gold Secondary (for "SOLUTIONS")

// NOTE: Keeping these classes for components that use them, but using inline style for color where PostCSS fails
const PRIMARY_COLOR_CLASS = 'text-[' + PRIMARY_HEX + ']';
const PRIMARY_BG_CLASS = 'bg-[' + PRIMARY_HEX + ']';
const PRIMARY_BORDER_CLASS = 'border-[' + PRIMARY_HEX + ']';
const SECONDARY_COLOR_CLASS = 'text-[' + SECONDARY_HEX + ']';

const PLACEHOLDER_HEX = PRIMARY_HEX.substring(1); 

const documentTypeMap = {
    invoice: 'TAX INVOICE',
    quotation: 'QUOTATION',
    receipt: 'RECEIPT - PAID'
};

const initialItem = {
    description: 'Service/Product Description',
    qty: 1,
    unitPrice: 100.00,
};

const initialClientInfo = {
    name: 'New Client Name',
    companyName: 'Client Company (Optional)',
    street: 'Street address',
    cityStateZip: 'State / City, Zip code',
    phone: 'Client Phone',
    email: 'Client Email',
    customerId: null,
};

const initialBusinessInfo = {
    name: 'REVOLIT SOLUTIONS',
    address: '611 Lydia Street Birchleigh North Ex 3, Kempton Park, 1619',
    phone: '064 546 8642',
    email: 'info@revolitsolutions.co.za',
    vatNo: '9197641245',
    bankAccHolder: 'Revolit Solutions',
    bankAccNo: 'FNB ACC NO. 63165202276',
    contactPerson: 'Nakedi Mphela',
    contactNumber: '+27 64 546 8642',
    contactEmail: 'nakedi@revolitsolutions.co.za',
};

const createInitialDocument = (type = 'invoice') => ({
    docId: crypto.randomUUID(),
    type: type, 
    status: type === 'quotation' ? 'pending' : 'approved', 
    business: initialBusinessInfo,
    client: initialClientInfo,
    clientId: null,
    items: [initialItem],
    docNumber: 'TBD',
    date: new Date().toISOString().substring(0, 10),
    terms: 'Due Upon Receipt',
    taxRate: 0, 
    notes: 'Thank you for choosing us!',
    timestamp: Date.now(),
});

// --- Custom Hook for Local Storage Management ---

const useDocumentManager = () => {
    const [savedDocuments, setSavedDocuments] = useState([]);
    const [customers, setCustomers] = useState({});
    const [counters, setCounters] = useState({ docCounter: 0, customerCounter: 0 });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('Welcome! All data is saved locally in your browser.');

    const loadData = useCallback(() => {
        try {
            const documents = JSON.parse(localStorage.getItem(DOCUMENT_STORAGE_KEY)) || [];
            const customersData = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY)) || {};
            const countersData = JSON.parse(localStorage.getItem(COUNTERS_STORAGE_KEY)) || { docCounter: 0, customerCounter: 0 };

            setSavedDocuments(documents);
            setCustomers(customersData);
            setCounters(countersData);
            setMessage(`Loaded ${documents.length} documents from local storage.`);
        } catch (e) {
            console.error("Error loading from local storage:", e);
            setMessage("Error loading data from local storage.");
        } finally {
            setLoading(false);
        }
    }, []);

    const saveData = useCallback((docs, custs, cntrs, msg = "Data saved successfully.") => {
        try {
            localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(docs));
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(custs));
            localStorage.setItem(COUNTERS_STORAGE_KEY, JSON.stringify(cntrs));
            setSavedDocuments(docs);
            setCustomers(custs);
            setCounters(cntrs);
            setMessage(msg);
        } catch (e) {
            console.error("Error saving to local storage:", e);
            setMessage("Error saving data to local storage.");
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const generateNewCustomer = (clientData, currentCounters) => {
        const newCounters = { ...currentCounters, customerCounter: currentCounters.customerCounter + 1 };
        const customerDocId = crypto.randomUUID();
        const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
        const newCustomerId = `RSC-${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}-${String(newCounters.customerCounter).padStart(4, '0')}`;

        const customer = { ...clientData, custDocId: customerDocId, customerId: newCustomerId, createdAt: Date.now() };
        return { customer, newCounters, customerDocId };
    };

    const generateNewDocNumber = (docToSave, currentCounters) => {
        const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
        const customer = customers[docToSave.clientId] || docToSave.client;
        const customerIdFull = customer?.customerId || 'RS-9999-99-99-9999';
        const match = customerIdFull.match(/-(\d+)$/);
        const custNumPart = match ? match[1] : '0000';
        const nextDocCount = currentCounters.docCounter + 1;
        const datePart = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;

        return {
            docNumber: `RS-${datePart}-${custNumPart}-${String(nextDocCount).padStart(3, '0')}`,
            nextDocCount: nextDocCount
        };
    };

    const saveDocument = useCallback((document) => {
        let docToSave = { ...document, timestamp: Date.now(), userId: USER_ID };
        let newCustomers = { ...customers };
        let newCounters = { ...counters };
        let docNumber = document.docNumber;

        // Step 1: Handle Customer Logic
        if (!docToSave.clientId) {
            const { customer, newCounters: updatedCounters, customerDocId } = generateNewCustomer(docToSave.client, newCounters);
            newCounters = updatedCounters;
            newCustomers[customerDocId] = customer;
            docToSave.clientId = customerDocId;
            docToSave.client = customer;
        } else {
            const existingCustomer = newCustomers[docToSave.clientId];
            if (existingCustomer) {
                 const { custDocId, customerId, createdAt, ...mutableClientInfo } = existingCustomer;
                 const updatedCustomer = { ...mutableClientInfo, ...docToSave.client, custDocId, customerId, createdAt };
                 newCustomers[docToSave.clientId] = updatedCustomer;
                 docToSave.client = updatedCustomer; 
            }
        }

        // Step 2: Handle Document Number Logic (if TBD)
        if (docNumber === 'TBD') {
            const { docNumber: newDocNum, nextDocCount } = generateNewDocNumber(docToSave, newCounters);
            docNumber = newDocNum;
            newCounters.docCounter = nextDocCount;
            docToSave.docNumber = docNumber;
        }

        // Step 3: Save Document to list
        let newDocuments = savedDocuments.filter(d => d.docId !== docToSave.docId);
        newDocuments.unshift(docToSave);

        // Step 4: Save all to storage
        saveData(newDocuments, newCustomers, newCounters, `Successfully saved ${documentTypeMap[docToSave.type]} ${docNumber}.`);
        return docToSave;
    }, [customers, counters, savedDocuments, saveData]);

    const deleteDocument = useCallback((docId, docNumber) => {
        const newDocuments = savedDocuments.filter(d => d.docId !== docId);
        saveData(newDocuments, customers, counters, `Deleted document ${docNumber} from local storage.`);
    }, [customers, counters, savedDocuments, saveData]);
    
    // NEW: Export all data to JSON file
    const exportData = useCallback(() => {
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            documents: savedDocuments,
            customers: customers,
            counters: counters,
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `document_manager_backup_${new Date().toISOString().substring(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage('Successfully exported all data to JSON file.');
    }, [savedDocuments, customers, counters, setMessage]);

    // NEW: Import data from JSON file
    const importData = useCallback((backupData) => {
        if (backupData.version !== '1.0') {
            setMessage('Error: Invalid backup file version.', true);
            return false;
        }
        
        // Confirm before overwriting
        if (!window.confirm("WARNING: Importing data will completely overwrite ALL existing documents and customer data in your browser's local storage. Are you sure you want to proceed?")) {
            setMessage('Import cancelled by user.');
            return false;
        }

        try {
            saveData(backupData.documents || [], backupData.customers || {}, backupData.counters || { docCounter: 0, customerCounter: 0 }, 
                     `Successfully imported ${backupData.documents?.length || 0} documents from backup file. All data has been overwritten.`);
            return true;
        } catch (e) {
            console.error("Error importing data:", e);
            setMessage("Error processing backup file data.", true);
            return false;
        }
    }, [saveData, setMessage]);


    return { loading, message, savedDocuments, customers, counters, saveDocument, deleteDocument, loadData, setMessage, exportData, importData };
};

// --- Login Screen Component ---

const LoginScreen = ({ onLogin, PRIMARY_COLOR_CLASS, PRIMARY_BG_CLASS, PRIMARY_BORDER_CLASS, PRIMARY_HEX }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // NEW: Firebase Login Logic
    const handleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            if (!email || !password) {
                throw new Error("Please enter both email and password.");
            }
            // Use Firebase's sign-in function
            await signInWithEmailAndPassword(firebaseAuth, email, password);
            onLogin(); // App component handles state update via onAuthStateChanged
        } catch (err) {
            console.error("Firebase Login Error:", err);
            let errorMessage = "An unknown error occurred.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential': // Modern Firebase error for login failure
                        errorMessage = "Invalid email or password.";
                        break;
                    case 'auth/invalid-email':
                        errorMessage = "Invalid email format.";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Access temporarily blocked due to too many failed attempts.";
                        break;
                    default:
                        errorMessage = err.message || err.code;
                }
            } else {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                {/* FIX: Use inline style for text color */}
                <h2 className={`text-3xl font-extrabold text-center`} style={{ color: PRIMARY_HEX }}>
                    Document Manager Login
                </h2>
                {/* NEW: Warning for placeholder config */}
                {firebaseConfig.apiKey === "AIzaSyCN8UGG5kTeLiglSpdxY9lIPxXuZn5wONw" && (
                    <div className="p-3 bg-red-100 text-red-700 border-l-4 border-red-500 rounded text-sm font-medium">
                        ⚠️ **Warning:** Firebase config is using placeholder keys. Please replace them with your actual project keys to enable real authentication.
                    </div>
                )}
                <div className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            // FIX: Ensure border class is static if possible, or include in safelist
                            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${PRIMARY_BORDER_CLASS} sm:text-sm`}
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                            // FIX: Ensure border class is static if possible, or include in safelist
                            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${PRIMARY_BORDER_CLASS} sm:text-sm`}
                            placeholder="Enter password"
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    <div>
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            // FIX: Use inline style for background color
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${PRIMARY_HEX}] transition-colors disabled:opacity-50`}
                            style={{ backgroundColor: PRIMARY_HEX }}
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <User size={20} className="mr-2" />}
                            {isLoading ? 'Signing In...' : 'Sign In with Firebase'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Helper Input Components (Outside App for stability) ---

const DocInput = React.memo(({ value, onChange, placeholder, className = '', type = 'text', inputClasses, PRIMARY_HEX }) => {
    const baseClasses = inputClasses;
    // NOTE: This class construction is critical to pass the color variable to Tailwind's JIT compiler.
    const focusClasses = `focus:border-[${PRIMARY_HEX}]`;

    if (type === 'date') {
         return (
            <input 
                type="date" 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                className={`w-full text-center bg-white text-sm font-bold text-gray-800 focus:outline-none focus:ring-0 print:border-none p-0 border-none ${className} print:text-gray-900`}
            />
         );
    }

    // Render an input element for editing (hidden on print)
    const inputElement = (
        <input 
            type={type} 
            value={String(value)} // Crucial: value as string, no .toFixed() or complex formatting
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder} 
            className={`${baseClasses} ${focusClasses} ${className} print:hidden`} 
        />
    );

    // Render a span for printing (hidden on screen, inline on print)
    const printElement = (
        <span className={`hidden print:inline-block w-full ${className} print:text-gray-900`}>
            {/* Display formatted number for currency/price types, otherwise display raw value */}
            {type === 'number' && (value !== '' && value !== null) && !isNaN(parseFloat(value)) 
                ? parseFloat(value).toFixed(type === 'qty' ? 0 : 2) // Quick format for display span
                : value || placeholder}
        </span>
    );

    return (
        <>
            {inputElement}
            {printElement}
        </>
    );
});


// --- Item Row Component (Extracted and Memoized for stability) ---
const ItemRow = React.memo(({ item, index, handleItemChange, removeItem, PRIMARY_HEX, inputClasses }) => {
    
    // Inline DocInput usage requires passing the necessary props
    const ItemDocInput = (props) => (
        <DocInput 
            {...props} 
            inputClasses={inputClasses} 
            PRIMARY_HEX={PRIMARY_HEX}
        />
    );
    
    // This handler ensures that when DocInput calls onChange, the correct index is applied
    const handleItemChangeForIndex = (field, value) => {
        handleItemChange(index, field, value);
    };

    return (
        <div className={`grid grid-cols-12 gap-2 py-2 border-b text-sm items-center hover:bg-[${PRIMARY_HEX}]/5 transition-colors print:text-[10px] print:py-1 last:border-b-0 bg-white`}>
            <div className="col-span-5 px-2">
                <ItemDocInput value={item.description} onChange={(v) => handleItemChangeForIndex('description', v)} placeholder="Description" className={`border-dashed border-gray-200`} />
            </div>
            <div className="col-span-2 text-center">
                <ItemDocInput 
                    type="number" 
                    value={String(item.qty)} 
                    onChange={(e) => handleItemChangeForIndex('qty', e.target.value)} 
                    placeholder="0"
                    className="w-full text-center bg-transparent focus:outline-none"
                />
            </div>
            <div className="col-span-2 text-right">
                <ItemDocInput 
                    type="number" 
                    value={String(item.unitPrice)} 
                    onChange={(e) => handleItemChangeForIndex('unitPrice', e.target.value)} 
                    placeholder="0.00"
                    className="w-full text-right bg-transparent focus:outline-none"
                />
            </div>
            <div className="col-span-2 text-right font-medium text-gray-800 pr-2">R {(item.qty * item.unitPrice).toFixed(2)}</div>
            <button onClick={() => removeItem(index)} className="col-span-1 text-center text-xs text-red-500 hover:text-red-700 transition-colors print:hidden" title="Remove Item"><Trash2 size={16} className="mx-auto" /></button>
        </div>
    );
});


// --- Main App Component ---

const App = () => {
    const { loading, message, setMessage, savedDocuments, customers, saveDocument, deleteDocument, exportData, importData } = useDocumentManager();
    const [currentDoc, setCurrentDoc] = useState(createInitialDocument());
    const [docType, setDocType] = useState('invoice');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [currentUser, setCurrentUser] = useState(null); 
    const [authLoading, setAuthLoading] = useState(true);

    // Effect to handle real-time authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            setCurrentUser(user);
            setAuthLoading(false);
            if (user) {
                setMessage(`Logged in as: ${user.email}`);
            } else {
                setMessage('Please log in.');
            }
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const isLoggedIn = !!currentUser;

    const handleLoginSuccess = () => {
        setMessage('Successfully initiated login request. Awaiting Firebase confirmation...');
    };

    // NEW: Firebase Logout Logic
    const handleLogout = async () => {
        try {
            await signOut(firebaseAuth);
            setMessage('Logged out successfully.');
        } catch (error) {
            setMessage(`Error logging out: ${error.message}`, true);
        }
    };
    
    // Convert customers object into a sorted array for the dropdown
    const customerList = useMemo(() => {
        return Object.values(customers)
            .sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name));
    }, [customers]);

    useEffect(() => {
        if (isLoggedIn && !loading && savedDocuments.length > 0) {
            const mostRecentDoc = savedDocuments.sort((a, b) => b.timestamp - a.timestamp)[0];
            loadDocument(mostRecentDoc);
        } else if (isLoggedIn && !loading) {
            setCurrentDoc(createInitialDocument());
            setDocType('invoice');
        }
    }, [isLoggedIn, loading, savedDocuments]);

    const calculations = useMemo(() => {
        const subtotal = currentDoc.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        const taxRate = currentDoc.taxRate / 100;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }, [currentDoc.items, currentDoc.taxRate]);

    // --- STABILIZED HANDLERS (using useCallback) ---
    
    const handleFieldChange = useCallback((field, value) => {
        setCurrentDoc(prev => ({ ...prev, [field]: value }));
    }, []); 

    const handleNestedChange = useCallback((parent, field, value) => {
        setCurrentDoc(prev => {
            const newState = {
                ...prev,
                [parent]: { ...prev[parent], [field]: value }
            };
            if (parent === 'client') {
                 newState.clientId = null;
            }
            return newState;
        });
    }, []); 

    const handleItemChange = useCallback((index, field, value) => {
        // We MUST use currentDoc.items here, so we must rely on it as a dependency
        const newItems = currentDoc.items.map((item, i) => {
            if (i === index) {
                // Ensure value is correctly parsed for numerical fields (qty/unitPrice) without calling .toFixed() immediately
                const parsedValue = (field === 'qty' || field === 'unitPrice') ? (parseFloat(value) || 0) : value;

                return { ...item, [field]: parsedValue };
            }
            return item;
        });
        setCurrentDoc(prev => ({ ...prev, items: newItems }));
    }, [currentDoc.items]); // DEPENDENCY: currentDoc.items must be included

    const addItem = useCallback(() => { 
        setCurrentDoc(prev => ({ ...prev, items: [...prev.items, initialItem] })); 
    }, []);
    
    const removeItem = useCallback((index) => { 
        setCurrentDoc(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })); 
    }, []); 
    
    // --- END STABILIZED HANDLERS ---
    
    const startNewDocument = (type) => {
        setCurrentDoc(prev => ({ 
            ...createInitialDocument(type), 
            business: prev.business,
            client: prev.clientId ? customers[prev.clientId] || initialClientInfo : initialClientInfo,
            clientId: prev.clientId,
        }));
        setDocType(type);
        setMessage(`New blank ${documentTypeMap[type]} started.`);
    };

    const handleSave = () => {
        const savedDoc = saveDocument(currentDoc);
        if (savedDoc) loadDocument(savedDoc);
    };

    const handleLoad = useCallback((docToLoad) => { loadDocument(docToLoad); }, [customers]);

    const loadDocument = (docToLoad) => {
        const clientData = customers[docToLoad.clientId] || docToLoad.client;
        
        const clientWithCompanyName = {
            ...initialClientInfo, 
            ...clientData
        };

        setCurrentDoc({ ...docToLoad, client: clientWithCompanyName });
        setDocType(docToLoad.type);
        setMessage(`Loaded ${documentTypeMap[docToToLoad.type]} ${docToLoad.docNumber}.`);
    };

    const handleDelete = (docId, docNumber) => {
        deleteDocument(docId, docNumber);
        if (currentDoc.docId === docId) startNewDocument('invoice');
    };

    const approveQuotation = () => {
        if (currentDoc.type !== 'quotation' || currentDoc.status !== 'pending') return;
        setCurrentDoc(prev => ({ 
            ...prev, 
            type: 'invoice', 
            status: 'approved', 
            docNumber: 'TBD', 
            docId: crypto.randomUUID() 
        }));
        setDocType('invoice');
        setMessage('Quotation approved. Save to generate a new Invoice document.');
    };

    const markAsPaid = () => {
        if (currentDoc.type !== 'invoice' || currentDoc.status !== 'approved') return;
        setCurrentDoc(prev => ({ ...prev, type: 'receipt', status: 'paid', notes: prev.notes + ' | PAYMENT RECEIVED IN FULL.' }));
        setDocType('receipt');
        setMessage('Invoice marked as Paid and converted to Receipt. Save to finalize.');
    };

    const handleCustomerSelect = (customerId) => {
        if (!customerId) {
            setCurrentDoc(prev => ({ ...prev, client: initialClientInfo, clientId: null }));
            setMessage('Switched to creating a new customer record.');
            return;
        }
        
        const selectedCustomer = customers[customerId];
        if (selectedCustomer) {
            const newClient = {
                name: selectedCustomer.name || initialClientInfo.name,
                companyName: selectedCustomer.companyName || initialClientInfo.companyName,
                street: selectedCustomer.street || initialClientInfo.street,
                cityStateZip: selectedCustomer.cityStateZip || initialClientInfo.cityStateZip,
                phone: selectedCustomer.phone || initialClientInfo.phone,
                email: selectedCustomer.email || initialClientInfo.email,
                customerId: selectedCustomer.customerId, 
            };

            setCurrentDoc(prev => ({ ...prev, client: newClient, clientId: customerId }));
            setMessage(`Loaded details for existing customer: ${newClient.companyName || newClient.name}`);
        }
    };

    // NEW: Handle JSON file import
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                importData(data);
            } catch (error) {
                setMessage("Error: Failed to parse JSON file.", true);
                console.error("File import error:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset file input
    };


    // --- UI Components ---
    
    // REFACTORED: inputClasses is now defined early in App to be passed to DocInput/ItemRow
    const inputClasses = `w-full bg-transparent border-b border-dashed border-gray-300 focus:border-[${PRIMARY_HEX}] focus:outline-none transition-colors duration-150 p-0.5 hover:border-gray-400 print:border-none print:hover:border-none`;
    
    // Helper component for DocInput used inside App's UI components
    const AppDocInput = (props) => (
        <DocInput 
            {...props} 
            inputClasses={inputClasses} 
            PRIMARY_HEX={PRIMARY_HEX}
        />
    );


    const EditableBusinessName = ({ name, onChange }) => {
        const [isEditing, setIsEditing] = useState(false);
        const NAME_SPLIT_WORD = 'SOLUTIONS';

        const handleInputBlur = (e) => {
            const value = e.target.value.trim();
            onChange(value);
            setIsEditing(false);
        };

        const renderDisplay = () => {
            const nameUpper = name.toUpperCase();
            const splitIndex = nameUpper.indexOf(NAME_SPLIT_WORD);

            if (splitIndex !== -1) {
                const part1 = name.substring(0, splitIndex).trim();
                const part2 = name.substring(splitIndex).trim();

                return (
                    <>
                        <span style={{ color: PRIMARY_HEX }} className={`print:text-[${PRIMARY_HEX}]`}>{part1}</span>
                        <span className={`pl-1 print:text-[${SECONDARY_HEX}]`} style={{ color: SECONDARY_HEX }}>{part2}</span>
                    </>
                );
            }
            
            return <span style={{ color: PRIMARY_HEX }} className={`print:text-[${PRIMARY_HEX}]`}>{name}</span>;
        };

        const inputClassesInternal = `w-full bg-transparent border-b border-dashed border-gray-300 focus:border-[${PRIMARY_HEX}] focus:outline-none transition-colors duration-150 p-0.5 hover:border-gray-400 print:border-none print:hover:border-none text-xl font-black border-none p-0.5`;

        return (
            <div className="text-xl font-black mb-1 min-h-5">
                {isEditing ? (
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInputBlur(e); }}
                        autoFocus
                        placeholder="Business Name"
                        className={`${inputClassesInternal} p-0`}
                        style={{ color: PRIMARY_HEX }}
                    />
                ) : (
                    <div 
                        onClick={() => setIsEditing(true)}
                        className={`${inputClassesInternal} cursor-text border-none p-0 inline-block`}
                    >
                        {renderDisplay()}
                    </div>
                )}
            </div>
        );
    };

    
    const DocumentHeader = () => {
        const currentCustomer = currentDoc.client;
        const isReceipt = currentDoc.type === 'receipt';

        return (
            <div className={`relative flex justify-between items-start mb-6 pb-4 border-b ${PRIMARY_BORDER_CLASS}/20`}>
                {isReceipt && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <span className="text-9xl font-black text-green-500 transform rotate-[-30deg] p-12 tracking-widest">PAID</span>
                    </div>
                )}
                <div className="w-1/2 pr-6 z-10 items-center justify-center">
                    <div className="mb-2 ">
                        <img 
                            src="https://revolitsolutions.co.za/wp-content/uploads/2025/11/revolitlogo-yellow-icon-2024.png"
                            alt="Logo" 
                            className="rounded-lg w-26 h-14" 
                            onError={(e) => { e.target.onerror = null; e.target.src="./src/assets/revolitlogo yellow icon 2024.png"; }}
                        />
                    </div>
                    <EditableBusinessName 
                        name={currentDoc.business.name} 
                        onChange={(v) => handleNestedChange('business', 'name', v)} 
                    />
                    
                    <div className="text-xs space-y-0.3 text-gray-700 print:text-[8px]">
                        <AppDocInput value={currentDoc.business.address} onChange={(v) => handleNestedChange('business', 'address', v.replace('Address: ', ''))} placeholder="Address" className="text-xs border-none p-0" />
                        <AppDocInput value={`Phone: ${currentDoc.business.phone}`} onChange={(v) => handleNestedChange('business', 'phone', v.replace('Phone: ', ''))} placeholder="Phone" className="text-xs border-none p-0" />
                        <AppDocInput value={`Email: ${currentDoc.business.email}`} onChange={(v) => handleNestedChange('business', 'email', v.replace('Email: ', ''))} placeholder="Email" className="text-xs border-none p-0" />
                        <AppDocInput value={`Vat No. ${currentDoc.business.vatNo}`} onChange={(v) => handleNestedChange('business', 'vatNo', v.replace('Vat No. ', ''))} placeholder="VAT No." className="text-xs border-none p-0" />
                    </div>
                </div>
                <div className="w-1/2 pl-6 text-right z-10">
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-4 uppercase tracking-wider print:text-2xl">{documentTypeMap[docType]}</h1>
                    <div className="grid grid-cols-2 gap-3 text-white">
                        <ShadedDetailBlock label="Doc No."><span className="font-mono text-gray-700 w-full">{currentDoc.docNumber}</span></ShadedDetailBlock>
                        <ShadedDetailBlock label="Customer ID"><span className="font-mono text-xs text-gray-500 w-full">{currentCustomer.customerId || 'N/A (Save to Assign)'}</span></ShadedDetailBlock>
                        <ShadedDetailBlock label="Date:">
                            <AppDocInput 
                                type="date" 
                                value={currentDoc.date} 
                                onChange={(v) => handleFieldChange('date', v)} 
                                className="w-full text-center bg-white text-sm font-bold text-gray-800 focus:outline-none focus:ring-0 print:border-none p-0 border-none" 
                            />
                        </ShadedDetailBlock>
                        <ShadedDetailBlock label="Terms:">
                            <AppDocInput 
                                value={currentDoc.terms} 
                                onChange={(v) => handleFieldChange('terms', v)} 
                                placeholder="Due Upon Receipt" 
                                className="w-full text-center bg-white text-sm font-bold text-gray-800 focus:outline-none focus:ring-0 print:border-none p-0 border-none"
                            />
                        </ShadedDetailBlock>
                    </div>
                </div>
            </div>

            
        );
    };

    const ClientSection = () => (
        <div className="mb-6 p-5 bg-gray-50 border border-gray-200 rounded-xl shadow-inner print:mb-4 print:p-5 print:bg-gray-50 print:border print:border-gray-200 print:shadow-inner">
            <h2 className={`text-sm font-bold text-gray-700 mb-2 border-b-2 ${PRIMARY_BORDER_CLASS} inline-block pb-0.5 uppercase tracking-wider print:text-xs`}>Bill To</h2>

            {/* Hiding the selection dropdown block on print */}
            {customerList.length > 0 && (
                <div className="mb-4 print:hidden">
                    <label htmlFor="customerSelect" className="block text-xs font-semibold text-gray-500 mb-1">Select Existing Customer:</label>
                    <select
                        id="customerSelect"
                        value={currentDoc.clientId || ''}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className={`w-1/2 p-2 border border-[${PRIMARY_HEX}] rounded-lg shadow-sm focus:ring-1 focus:ring-opacity-50 focus:border-[${PRIMARY_HEX}] transition-colors bg-white font-medium text-sm`}
                    >
                        <option value="">-- NEW CUSTOMER --</option>
                        {customerList.map(customer => (
                            <option key={customer.custDocId} value={customer.custDocId}>
                                {customer.companyName || customer.name} ({customer.customerId})
                            </option>
                        ))}
                    </select>
                    {currentDoc.clientId && (
                        <p className='text-xs text-gray-500 mt-1'>Editing these fields will create a temporary document client record.</p>
                    )}
                </div>
            )}

            <div className="text-sm space-y-1 mt-2 print:text-[11px] print:space-y-0">
                <AppDocInput 
                    value={currentDoc.client.companyName} 
                    onChange={(v) => handleNestedChange('client', 'companyName', v)} 
                    placeholder="Client Company Name (Optional)" 
                    className="font-semibold text-base print:text-sm" 
                />
                <AppDocInput value={currentDoc.client.name} onChange={(v) => handleNestedChange('client', 'name', v)} placeholder="Attention Name / Contact Person" className="font-semibold text-base print:text-sm" />
                <AppDocInput value={currentDoc.client.street} onChange={(v) => handleNestedChange('client', 'street', v)} placeholder="Street address" />
                <AppDocInput value={currentDoc.client.cityStateZip} onChange={(v) => handleNestedChange('client', 'cityStateZip', v)} placeholder="City, State, Zip code" />
                <AppDocInput value={`Phone: ${currentDoc.client.phone}`} onChange={(v) => handleNestedChange('client', 'phone', v.replace('Phone: ', ''))} placeholder="Phone" />
                <AppDocInput value={`Email: ${currentDoc.client.email}`} onChange={(v) => handleNestedChange('client', 'email', v.replace('Email: ', ''))} placeholder="Email" />
            </div>
        </div>
    );

    const ItemsTable = () => (
        <div className="mb-6 border border-gray-300 rounded-xl overflow-hidden shadow-lg print:mb-4 print:shadow-lg print:border print:border-gray-300">
            {/* FIX: Use inline style for background color, AND include print override classes */}
            <div className={`grid grid-cols-12 gap-2 text-white p-2 font-bold uppercase text-xs sm:text-sm print:text-[9px] items-center print:bg-[${PRIMARY_HEX}] print:text-white`} style={{ backgroundColor: PRIMARY_HEX }}>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">Unit Price (R)</div>
                <div className="col-span-2 text-right">Amount (R)</div>
                <div className="col-span-1 print:hidden text-center"></div>
            </div>
            {currentDoc.items.map((item, index) => (
                <ItemRow
                    key={index} // Index is safe here since the list is not reordered.
                    item={item}
                    index={index}
                    handleItemChange={handleItemChange} // Stable callback
                    removeItem={removeItem}             // Stable callback
                    PRIMARY_HEX={PRIMARY_HEX}
                    inputClasses={inputClasses}
                />
            ))}
            <div className="p-3 bg-gray-50 print:hidden">
                <button onClick={addItem} 
                    // FIX: Use inline style for background color
                    className={`flex items-center space-x-1 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-md hover:opacity-90 transition-shadow`}
                    style={{ backgroundColor: PRIMARY_HEX }}
                >
                    <Plus size={16} /><span>Add Item</span>
                </button>
            </div>
        </div>
    );

    const ShadedDetailBlock = ({ label, children }) => {
        return (
            <div className="w-full">
                {/* FIX: Use inline style for background and color, AND include print override classes */}
                <div className={`p-1 text-white text-xs font-semibold uppercase rounded-t-lg text-center leading-tight print:bg-[${PRIMARY_HEX}] print:text-white`} style={{ backgroundColor: PRIMARY_HEX }}>{label}</div>
                {/* MODIFIED: Added print:bg-white and print:border-gray-300 to ensure the white background and border prints */}
                <div className="p-1 border border-gray-300 rounded-b-lg bg-white text-sm font-bold text-gray-900 min-h-8 flex items-center justify-center print:bg-white print:border-gray-300">{children}</div>
            </div>
        );
    }

    const BankingDetailsSection = () => (
        // MODIFIED: Added print:bg-gray-50 to ensure the shaded background prints
        <div className="w-full sm:w-1/2 lg:w-[58%] p-4 border border-gray-400 rounded-xl bg-gray-50 shadow-inner print:p-4 print:border-2 text-sm print:text-[9px] print:bg-gray-50">
            {/* FIX: Use inline style for primary color and ensure print color is set */}
            <p className={`font-bold mb-3 uppercase border-b border-gray-300/50 pb-1 print:text-[${PRIMARY_HEX}]`} style={{ color: PRIMARY_HEX }}>Payment Details</p>
            <div className="text-gray-700 space-y-1">
                <p>
                    <span className="font-semibold text-gray-900">Acc Holder: </span>
                    <AppDocInput value={currentDoc.business.bankAccHolder} onChange={(v) => handleNestedChange('business', 'bankAccHolder', v)} placeholder="Account Holder" className="text-sm print:text-[11px] inline-block w-auto border-none p-0" />
                </p>
                <p>
                    <span className="font-semibold text-gray-900">Account No: </span>
                    <AppDocInput value={currentDoc.business.bankAccNo} onChange={(v) => handleNestedChange('business', 'bankAccNo', v)} placeholder="Account No." className="text-sm print:text-[11px] inline-block w-auto border-none p-0" />
                </p>
                <p className='text-xs text-gray-500 pt-2'>
                    Payment must be made in full before the due date.
                </p>
            </div>
        </div>
    );

    const TotalsCalculation = () => (
        // MODIFIED: Added print:bg-gray-50 to ensure the shaded background prints
        <div className="w-full sm:w-1/2 lg:w-[30%] p-4 border border-gray-400 rounded-xl bg-gray-50 shadow-inner print:p-2 print:border-2 print:bg-gray-50">
            <div className="space-y-2 text-base print:text-sm">
                <div className="flex justify-between items-center py-1"><span className="font-medium text-gray-600">SUBTOTAL</span><span className="font-semibold text-gray-800">R {calculations.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between items-center py-1 border-t border-gray-300 pt-1">
                    <span className="font-medium text-gray-600">TAX RATE (%)</span>
                    <AppDocInput 
                        type="number" 
                        value={String(currentDoc.taxRate)} 
                        onChange={(e) => handleFieldChange('taxRate', parseFloat(e.target.value) || 0)} 
                        placeholder="0"
                        className="w-16 text-right bg-transparent focus:outline-none font-semibold"
                    />
                </div>
                <div className="flex justify-between items-center py-1"><span className="font-medium text-gray-600">TAX</span><span className="font-semibold text-gray-800">R {calculations.tax.toFixed(2)}</span></div>
                {/* FIX: Use inline style for primary color and border color, AND include print override classes */}
                <div 
                    className={`flex justify-between items-center py-3 border-t-4 text-lg font-black mt-3 print:text-lg print:border-t-2 print:border-[${PRIMARY_HEX}] print:text-[${PRIMARY_HEX}]`}
                    style={{ borderColor: PRIMARY_HEX, color: PRIMARY_HEX }}
                >
                    <span>TOTAL DUE</span><span>R {calculations.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );

    const TotalsSection = () => (
        <div className="flex flex-col sm:flex-row justify-between items-start print:text-[10px] space-y-6 sm:space-y-0">
            <BankingDetailsSection />
            <TotalsCalculation />
        </div>
    );


    const ContactFooter = () => (
        <div className={`mt-6 pt-3 border-t border-gray-300/30 text-center text-xs text-gray-600 print:text-[10px] print:mt-2 print:pt-2`}>
            <div className="text-sm font-medium mb-3 text-gray-700 print:text-[10px] print:mb-2">If you have any questions about this {docType}, please contact:</div>
            <p className="mb-4">
                <AppDocInput 
                    value={`${currentDoc.business.contactPerson}, ${currentDoc.business.contactNumber}, ${currentDoc.business.contactEmail}`} 
                    onChange={(v) => { 
                        const parts = v.split(',').map(p => p.trim()); 
                        if (parts.length >= 3) { 
                            handleNestedChange('business', 'contactPerson', parts[0]); 
                            handleNestedChange('business', 'contactNumber', parts[1]); 
                            handleNestedChange('business', 'contactEmail', parts[2]); 
                        } else {
                            // If the format is broken, just pass the whole string to the first part for easy editing
                            handleNestedChange('business', 'contactPerson', v);
                        }
                    }} 
                    placeholder="Contact Name, Phone, Email" 
                    className="inline-block w-auto text-center border-none p-0" 
                />
            </p>
            <AppDocInput 
                value={currentDoc.notes} 
                onChange={(v) => handleFieldChange('notes', v)} 
                placeholder="Thank you for choosing us!" 
                // FIX: Use inline style for primary color and ADDED print color override
                className={`text-center font-bold text-base print:text-[12px] border-none p-0 print:text-[${PRIMARY_HEX}]`} 
                style={{ color: PRIMARY_HEX }}
            />
        </div>
    );

    const FloatingToolbar = () => (
        <div className="fixed top-0 lg:left-90 lg:right-20 z-50 bg-white lg:mt-10 shadow-2xl border-b border-gray-200 print:hidden">
            <div className="max-w-7xl mx-auto p-4 sm:p-5">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center space-x-4 flex-wrap gap-3">
                        <div className="text-sm font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                            {/* FIX: Use inline style for primary color */}
                            <span style={{ color: PRIMARY_HEX }}>{documentTypeMap[docType].split(' - ')[0]}</span> ({currentDoc.docNumber})
                        </div>
                        
                        <select value={docType} onChange={(e) => startNewDocument(e.target.value)} 
                            className={`p-2 border border-[${PRIMARY_HEX}] rounded-lg shadow-sm focus:ring-1 focus:ring-opacity-50 focus:border-[${PRIMARY_HEX}] transition-colors bg-white font-medium text-sm`}>
                            <option value="invoice">New Invoice</option><option value="quotation">New Quotation</option><option value="receipt">New Receipt</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-3 ml-auto">
                        <button onClick={handleSave} 
                            // FIX: Use inline style for background color
                            className={`px-4 py-2 text-white font-bold rounded-lg shadow-md hover:opacity-90 transition-colors flex items-center space-x-1 text-sm`}
                            style={{ backgroundColor: PRIMARY_HEX }}
                        >
                            <Save size={18} /><span>Save</span>
                        </button>
                        
                        {currentDoc.type === 'quotation' && currentDoc.status === 'pending' && (
                            <button onClick={approveQuotation} className="px-4 py-2 bg-yellow-600 text-white font-bold rounded-lg shadow-md hover:bg-yellow-700 transition-colors text-sm">Approve (Invoice)</button>
                        )}
                        
                        {currentDoc.type === 'invoice' && currentDoc.status === 'approved' && (
                            <button onClick={markAsPaid} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors text-sm">Mark as Paid (Receipt)</button>
                        )}
                        
                        <button onClick={() => window.print()} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors flex items-center space-x-1 text-sm">
                            <Printer size={18} /><span>Print / PDF</span>
                        </button>

                        {/* Backup Group */}
                        <div className='flex space-x-2'>
                            <button onClick={exportData} className='px-3 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg shadow-md hover:bg-gray-300 transition-colors' title='Download Backup (JSON)'>
                                <Download size={18} />
                            </button>
                            <label className='px-3 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg shadow-md hover:bg-gray-300 transition-colors cursor-pointer' title='Upload Backup (JSON)'>
                                <Upload size={18} />
                                <input type="file" accept="application/json" onChange={handleFileImport} className="hidden" />
                            </label>
                        </div>
                        
                        {/* Logout Button */}
                        <button onClick={handleLogout} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg shadow-md hover:bg-gray-700 transition-colors flex items-center space-x-1 text-sm">
                            <LogOut size={18} /><span>Logout</span>
                        </button>
                    </div>
                </div>
                {message && (
                    <p className={`mt-3 p-2 rounded-lg text-xs font-medium ${message.includes('Error') || (typeof message === 'boolean' && message) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );

    const DocumentListItem = ({ doc, handleLoad, handleDelete }) => {
        const statusColors = { 'paid': 'bg-green-500', 'pending': 'bg-yellow-500', 'approved': 'bg-red-500' };
        const statusColor = statusColors[doc.status] || 'bg-gray-500';
        return (
            <div className="flex justify-between items-center p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm">
                <div className="text-sm flex items-center space-x-3 min-w-0 shrink">
                    <span className={`h-2 w-2 ${statusColor} rounded-full flex-shrink:0`}></span>
                    <div className="min-w-0 overflow-hidden">
                        <span className="font-bold mr-1 text-gray-800 text-xs sm:text-sm">[{documentTypeMap[doc.type].split(' - ')[0]}]</span>
                        {/* FIX: Use inline style for primary color */}
                        <span className={`font-medium truncate block sm:inline`} style={{ color: PRIMARY_HEX }}>{doc.docNumber}</span>
                        <span className="text-xs text-gray-500 ml-2 block sm:inline">({doc.date})</span>
                    </div>
                </div>
                <div className="flex space-x-2 flex-shrink:0">
                    <button onClick={() => handleLoad(doc)} 
                        // FIX: Use inline style for background color
                        className={`px-3 py-1 text-xs text-white rounded-md hover:opacity-90 transition-colors shadow-md`}
                        style={{ backgroundColor: PRIMARY_HEX }}
                    >Load</button>
                    <button onClick={() => handleDelete(doc.docId, doc.docNumber)} className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-md"><Trash2 size={12}/></button>
                </div>
            </div>
        );
    }

    const SavedDocumentsList = () => {
        const sortedDocs = savedDocuments.sort((a, b) => b.timestamp - a.timestamp);

        const filteredDocuments = useMemo(() => {
            if (!searchTerm) return sortedDocs;
            const lowerCaseSearch = searchTerm.toLowerCase();

            return sortedDocs.filter(doc => {
                const clientName = doc.client?.name?.toLowerCase() || '';
                const clientCompany = doc.client?.companyName?.toLowerCase() || '';
                const docNumber = doc.docNumber?.toLowerCase() || '';
                const docTypeMapped = documentTypeMap[doc.type]?.toLowerCase() || '';
                
                if (docNumber.includes(lowerCaseSearch)) return true;
                if (docTypeMapped.includes(lowerCaseSearch)) return true;
                if (clientName.includes(lowerCaseSearch)) return true;
                if (clientCompany.includes(lowerCaseSearch)) return true;

                if (doc.items && doc.items.some(item => item.description?.toLowerCase().includes(lowerCaseSearch))) return true;

                return false;
            });
        }, [sortedDocs, searchTerm]);

        const pendingDocs = filteredDocuments.filter(d => d.type === 'quotation' && d.status === 'pending');
        const approvedInvoices = filteredDocuments.filter(d => d.type === 'invoice' && d.status === 'approved');
        const paidReceipts = filteredDocuments.filter(d => d.type === 'receipt' && d.status === 'paid');
//Document Ledger section
        return (
            <div className="h-full w-full bg-white border border-gray-200 sm:mt-40 max-[360px]:mt-40  rounded-xl shadow-lg print:hidden space-y-4 p-5 lg:mt-0">
                {/* FIX: Use inline style for primary color */}
                <h3 className={`text-2xl font-bold flex items-center space-x-2 border-b pb-2`} style={{ color: PRIMARY_HEX }}><Folder size={24} /><span>Document Ledger</span></h3>
                
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Search by Doc No., Client, or Item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full p-2 pl-10 border-2 border-[${PRIMARY_HEX}] rounded-lg focus:outline-none focus:ring-2 focus:ring-[${PRIMARY_HEX}]/50 transition-shadow`}
                    />
                    {/* FIX: Use inline style for primary color */}
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5`} style={{ color: PRIMARY_HEX }} />
                </div>
                
                {searchTerm && (
                    <p className='text-sm font-semibold text-gray-700'>
                        {/* FIX: Use inline style for primary color */}
                        <span className={`font-black`} style={{ color: PRIMARY_HEX }}>{filteredDocuments.length}</span> results found.
                    </p>
                )}

                <div className="border border-yellow-200 bg-yellow-50 p-3 rounded-lg"><h4 className="font-bold text-lg text-yellow-800">Pending Quotes ({pendingDocs.length})</h4><div className="max-h-40 overflow-y-auto space-y-2 mt-2">{pendingDocs.map(doc => <DocumentListItem key={doc.docId} doc={doc} handleLoad={handleLoad} handleDelete={handleDelete} />)}</div></div>
                <div className="border border-red-200 bg-red-50 p-3 rounded-lg"><h4 className="font-bold text-lg text-red-800">Outstanding Invoices ({approvedInvoices.length})</h4><div className="max-h-40 overflow-y-auto space-y-2 mt-2">{approvedInvoices.map(doc => <DocumentListItem key={doc.docId} doc={doc} handleLoad={handleLoad} handleDelete={handleDelete} />)}</div></div>
                <div className="border border-green-200 bg-green-50 p-3 rounded-lg"><h4 className="font-bold text-lg text-green-800">Receipts (Paid) ({paidReceipts.length})</h4><div className="max-h-40 overflow-y-auto space-y-2 mt-2">{paidReceipts.map(doc => <DocumentListItem key={doc.docId} doc={doc} handleLoad={handleLoad} handleDelete={handleDelete} />)}</div></div>
                <p className="mt-3 text-xs text-red-500">Note: Data is saved only on this device's local storage.</p>
            </div>
        );
    };

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-xl text-gray-600"><Loader2 className="animate-spin mr-3" size={24} />Checking authentication status...</div>;
    }
    
    if (!isLoggedIn) {
        return (
            <LoginScreen 
                onLogin={handleLoginSuccess} 
                PRIMARY_COLOR_CLASS={PRIMARY_COLOR_CLASS}
                PRIMARY_BG_CLASS={PRIMARY_BG_CLASS}
                PRIMARY_BORDER_CLASS={PRIMARY_BORDER_CLASS}
                PRIMARY_HEX={PRIMARY_HEX}
            />
        );
    }
    
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-xl text-gray-600"><Loader2 className="animate-spin mr-3" size={24} />Loading Documents...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans pt-32 print:pt-4">
            <FloatingToolbar />
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-80 flex-shrink:0"><SavedDocumentsList /></div>
                <div className="grow min-w-0 lg:mt-40 print:mt-0">
                    <div className="bg-white p-6 sm:p-12 shadow-2xl rounded-xl border border-gray-300 print:p-0 print:shadow-2xl print:border print:border-gray-300 ">
                        <DocumentHeader />
                        <ClientSection />
                        <ItemsTable />
                        <TotalsSection />
                        <ContactFooter />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;