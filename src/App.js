import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp, getDoc, setLogLevel } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Note: xlsx, papaparse, and jspdf are now imported dynamically below to fix runtime errors.

// --- Helper Functions & Constants ---
const firebaseConfig = {
  apiKey: "AIzaSyDFxFmzI3k9R9JPV3im-Iirk9yiy-F3DD8",
  authDomain: "expense-tracker-348d4.firebaseapp.com",
  projectId: "expense-tracker-348d4",
  storageBucket: "expense-tracker-348d4.appspot.com",
  messagingSenderId: "953310565042",
  appId: "1:953310565042:web:32c626c5d93fd09a77afab",
  measurementId: "G-HKY5SH6637"
};
const appId =
  typeof window.__app_id !== 'undefined'
    ? window.__app_id
    : 'default-expense-tracker';

const currencies = [
  { code: 'USD', name: 'United States Dollar' }, { code: 'EUR', name: 'Euro' }, { code: 'JPY', name: 'Japanese Yen' },
  { code: 'GBP', name: 'British Pound Sterling' }, { code: 'INR', name: 'Indian Rupee' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' }, { code: 'CHF', name: 'Swiss Franc' }, { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'SEK', name: 'Swedish Krona' }, { code: 'NZD', name: 'New Zealand Dollar' },
];

const conversionRates = {
    INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.88, AUD: 0.018,
    CAD: 0.016, CHF: 0.011, CNY: 0.087, SEK: 0.13, NZD: 0.020,
};

// --- Feather Icons (as SVG components) ---
const AppLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M88.5 25H11.5C9.01472 25 7 27.0147 7 29.5V80.5C7 82.9853 9.01472 85 11.5 85H88.5C90.9853 85 93 82.9853 93 80.5V29.5C93 27.0147 90.9853 25 88.5 25Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 45L25 45C27.5 45 29 42.5 29 40V20C29 17.5 27.5 15 25 15H20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M25 55L36.6667 55L42.5 65L54.1667 45L60 55L75 55" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const Menu = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const X = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const LogOut = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const SettingsIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const Send = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const BarChart2 = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const ChevronDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9"></polyline></svg>;
const Star = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const Download = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const FileText = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const Mail = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const Phone = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const Lock = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const User = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;


/**
 * Parses a string to extract an amount, description, and tags.
 */
const parseExpenseString = (text) => {
    if (!text || typeof text !== 'string') return null;
    
    const tagRegex = /#\w+/g;
    const tags = text.match(tagRegex) || [];
    const textWithoutTags = text.replace(tagRegex, '').trim();

    const amountRegex = /([+\-]?\s*\d+(\.\d+)?)/;
    const match = textWithoutTags.match(amountRegex);

    if (!match) {
        return { isComment: true, originalText: text, description: text.trim(), tags: [] };
    }

    const amountString = match[0].replace(/\s/g, '');
    const amount = parseFloat(amountString);
    const description = textWithoutTags.replace(amountRegex, '').replace(/\s+/g, ' ').trim();

    if (isNaN(amount)) return null;

    const type = amount >= 0 ? 'income' : 'expense';
    const finalAmount = Math.abs(amount);

    return { originalText: text, amount: finalAmount, type, description: description || 'Uncategorized', tags };
};

const formatCurrency = (value, currency = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    } catch (e) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
}

// --- Components ---

const StatisticsChart = ({ expenses, currency }) => {
    const data = useMemo(() => {
        const categories = {};
        expenses.filter(e => e.type === 'expense').forEach(expense => {
            const category = expense.description.split(' ')[0] || 'Uncategorized';
            categories[category] = (categories[category] || 0) + expense.amount;
        });
        return Object.entries(categories).map(([name, amount]) => ({ name, amount }));
    }, [expenses]);

    if (!data.length) return <p className="text-center text-gray-500 py-8">No expense data to display yet.</p>;

    return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-4 text-center">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value, currency).replace(/[\s,0-9]/g, '')} />
                    <Tooltip formatter={(value) => formatCurrency(value, currency)} cursor={{fill: 'rgba(230, 230, 230, 0.2)'}} contentStyle={{backgroundColor: '#333', border: 'none', color: '#fff'}}/>
                    <Legend />
                    <Bar dataKey="amount" fill="#ef4444" name="Expenses by Category" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const IncomeDashboard = ({ totalIncome, expenses, currency }) => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const totalExpenses = useMemo(() => expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const balance = totalIncome - totalExpenses;
    const spentPercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    const chartData = [
        { name: 'Expenses', value: totalExpenses },
        { name: 'Balance', value: balance > 0 ? balance : 0 },
    ];
    const COLORS = ['#ef4444', '#22c55e'];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full mb-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Financial Overview</h2>
                    <p className="text-sm text-gray-400">Remaining Balance</p>
                    <p className="text-4xl font-bold text-blue-500 mb-4">{formatCurrency(balance, currency)}</p>
                    <div className="flex gap-6">
                        <div>
                            <p className="text-sm text-gray-400">Income</p>
                            <p className="text-xl font-semibold text-green-500">{formatCurrency(totalIncome, currency)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Spent</p>
                            <p className="text-xl font-semibold text-red-500">{formatCurrency(totalExpenses, currency)}</p>
                        </div>
                    </div>
                </div>
                <div className="w-32 h-32">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} fill="#8884d8" paddingAngle={5}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
             <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-2.5 rounded-full" style={{ width: `${Math.min(spentPercentage, 100)}%` }}></div>
                </div>
            </div>
            
            {showBreakdown && <StatisticsChart expenses={expenses} currency={currency} />}

            <div className="text-center mt-4">
                <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center justify-center mx-auto text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
                    <ChevronDown className={`w-5 h-5 ml-1 transition-transform duration-300 ${showBreakdown ? 'transform rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
}

const IncomeSetupModal = ({ onSave }) => {
    const [income, setIncome] = useState('');
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to PocketPulse!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Let's start by setting your monthly income.</p>
                <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full p-3 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={() => onSave(parseFloat(income || 0))}
                    className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Save Income
                </button>
            </div>
        </div>
    );
};

const PremiumModal = ({ onSubscribe, currency, onClose }) => {
    const basePrices = { month: 10, halfYear: 50, life: 100 };
    const rate = conversionRates[currency] || conversionRates.USD;

    const plans = [
        { id: 'month', name: '1 Month', price: basePrices.month * rate, period: '/month' },
        { id: 'halfYear', name: '6 Months', price: basePrices.halfYear * rate, period: '/6 months' },
        { id: 'life', name: 'Lifetime', price: basePrices.life * rate, period: 'forever' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X />
                </button>
                <div className="flex justify-center items-center mb-4">
                    <Star className="w-12 h-12 text-yellow-400" />
                </div>
                <h2 className="text-3xl font-bold mb-2">PocketPulse Premium</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8">Unlock powerful features like Data Exports.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map(plan => (
                        <div key={plan.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center">
                            <h3 className="text-lg font-bold">{plan.name}</h3>
                            <p className="text-2xl font-bold my-2 text-blue-500">{formatCurrency(plan.price, currency)}</p>
                            <p className="text-xs text-gray-500 mb-4">{plan.period}</p>
                            <button onClick={() => onSubscribe()} className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors">
                                Subscribe
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ExportModal = ({ onClose, onExport }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X />
                </button>
                <h2 className="text-2xl font-bold mb-4">Export Data</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Choose a format to download your financial report.</p>
                <div className="space-y-4">
                    <button onClick={() => onExport('pdf')} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors">
                        <FileText /> Export PDF
                    </button>
                    <button onClick={() => onExport('csv')} className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors">
                        <Download /> Export CSV
                    </button>
                    <button onClick={() => onExport('xlsx')} className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">
                        <Download /> Export XLSX
                    </button>
                </div>
            </div>
        </div>
    )
}

const ChatMessage = ({ msg }) => {
    const baseClasses = "p-3 rounded-2xl max-w-sm md:max-w-md break-words";
    const userClasses = "bg-blue-500 text-white self-end rounded-br-lg";
    const botClasses = "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start rounded-bl-lg";

    return (
        <div className={`flex flex-col w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`${baseClasses} ${msg.sender === 'user' ? userClasses : botClasses}`}
                 dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}>
            </div>
        </div>
    );
};

const SettingsPage = ({ onBack, settings, onSettingsChange, expenses, userId }) => {
    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h2>
            <div className="space-y-6 overflow-y-auto flex-grow">
                 <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg mb-3">Currency</h3>
                    <select
                        value={settings.currency || 'USD'}
                        onChange={e => onSettingsChange({ ...settings, currency: e.target.value })}
                        className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {currencies.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                    </select>
                </div>
                {/* {['Account Settings'].map(item => (
                    <div key={item} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-semibold">{item}</span>
                        <span className="text-gray-400">&gt;</span>
                    </div>
                ))} */}
            </div>
             <footer className="text-center mt-6 text-sm text-gray-400 dark:text-gray-500">
                <p>User ID: <span className="font-mono bg-gray-200 dark:bg-gray-700 rounded px-2 py-1">{userId || '...'}</span></p>
            </footer>
        </div>
    );
};

const PocketPulseApp = ({ user, auth, db }) => {
    // --- State Management ---
    const [expenses, setExpenses] = useState([]);
    const [settings, setSettings] = useState({ totalIncome: 0, incomeSet: false, currency: 'USD', isPremium: false });
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [allTags, setAllTags] = useState(new Set());

    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const chatEndRef = useRef(null);
    const userId = user.uid;
    const prevExpensesLength = useRef(0);

    // --- Data & Settings Fetching ---
    useEffect(() => {
        if (!userId || !db) return;

        let initialSettingsLoad = true;

        const settingsDocPath = `artifacts/${appId}/users/${userId}/settings/main`;
        const unsubscribeSettings = onSnapshot(doc(db, settingsDocPath), (doc) => {
            if (doc.exists()) {
                const userSettings = doc.data();
                setSettings(prev => ({...prev, ...userSettings}));
            }
            setIsLoading(false); // Stop loading once settings are checked
            initialSettingsLoad = false;
        }, (err) => {
            console.error("Error fetching settings:", err);
            setError("Failed to load user settings.");
            setIsLoading(false);
        });
        
        const expensesColPath = `artifacts/${appId}/users/${userId}/expenses`;
        const q = query(collection(db, expensesColPath));
        const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setExpenses(data);

            const uniqueTags = new Set();
            data.forEach(exp => {
                if(exp.tags) {
                    exp.tags.forEach(tag => uniqueTags.add(tag));
                }
            });
            setAllTags(uniqueTags);
        }, (err) => {
            console.error(err);
            setError("Failed to load expenses.");
        });

        return () => { unsubscribeExpenses(); unsubscribeSettings(); };
    }, [userId, db]);

    // --- UI Effects ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        if (!isLoading && messages.length === 0 && settings.incomeSet) {
            setMessages([{ id: Date.now(), sender: 'bot', text: "Welcome back! Ready to track your finances?" }]);
        }
    }, [isLoading, messages.length, settings.incomeSet]);

    // --- Reactive Bot Replies ---
    useEffect(() => {
        // This effect runs when `expenses` state changes.
        // It compares the current expenses with the previous length to see if a new one was added.
        if (expenses.length > prevExpensesLength.current && !isLoading) {
            const newExpense = expenses[0]; // The newest expense is at the top
            
            // Make sure it's an expense and not an income transaction from another flow
            if (newExpense && newExpense.type === 'expense') {
                const responses = [ `Got it! ✨ Logged ${formatCurrency(newExpense.amount, settings.currency)} for <b>${newExpense.description}</b>.`, `All set! ✅ ${formatCurrency(newExpense.amount, settings.currency)} for <b>${newExpense.description}</b> has been recorded.`];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                const botMsg = { id: Date.now(), sender: 'bot', text: randomResponse };
                setMessages(prev => [...prev, botMsg]);
            }
        }
        prevExpensesLength.current = expenses.length;
    }, [expenses, isLoading, settings.currency]);


    // --- Core Logic ---
    const handleSetInitialIncome = async (income) => {
        const newSettings = { ...settings, totalIncome: income, incomeSet: true, currency: 'USD', isPremium: false };
        await handleSettingsChange(newSettings);
    };

    const handleUserInputTextChange = (text) => {
        setUserInput(text);
        const words = text.split(' ');
        const lastWord = words[words.length - 1];
        if (lastWord.startsWith('#') && lastWord.length > 1) {
            const search = lastWord.toLowerCase();
            const suggestions = Array.from(allTags).filter(tag => tag.toLowerCase().startsWith(search));
            setTagSuggestions(suggestions);
        } else {
            setTagSuggestions([]);
        }
    };

    const handleSuggestionSelect = (tag) => {
        const words = userInput.split(' ');
        words[words.length - 1] = tag;
        setUserInput(words.join(' ') + ' ');
        setTagSuggestions([]);
        document.querySelector('input[placeholder="Type your expense or a comment...Eg -300 food / -500 car / 5000 salary"]').focus();
    };

    const handleUserInput = async (textInput = userInput) => {
        if (!textInput.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: textInput };
        setMessages(prev => [...prev, userMsg]);
        const parsed = parseExpenseString(textInput);
        setUserInput('');
        setTagSuggestions([]);

        if (!parsed) {
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: "Sorry, I didn't understand that. Please use a format like '150 food' or just a comment." }]);
            return;
        }

        if (parsed.type === 'income') {
            const newTotalIncome = (settings.totalIncome || 0) + parsed.amount;
            await handleSettingsChange({ ...settings, totalIncome: newTotalIncome });
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `Great! Added ${formatCurrency(parsed.amount, settings.currency)} to your income. Your new total income is ${formatCurrency(newTotalIncome, settings.currency)}.` }]);
            return;
        }

        try {
            const expensesColPath = `artifacts/${appId}/users/${userId}/expenses`;
            await addDoc(collection(db, expensesColPath), {
                ...parsed,
                description: parsed.description.trim(),
                createdAt: serverTimestamp()
            });
            // NOTE: The confirmation message is now handled by the useEffect hook that watches for changes in `expenses`.
        } catch (err) {
            console.error("Error adding doc:", err);
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: "Oops! Something went wrong trying to save that." }]);
        }
    };
    
    const handleSettingsChange = async (newSettings) => {
        setSettings(newSettings);
        if (!db || !userId) return;
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        await setDoc(settingsDocRef, newSettings, { merge: true });
    };

    const handleLogout = async () => {
        if(auth) {
            await signOut(auth);
        }
    };
    
    const handleExport = async (format) => {
        setShowExportModal(false);
        const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        const balance = settings.totalIncome - totalExpenses;

        const data = expenses.map(({ amount, type, description, createdAt, tags }) => ({
            Date: createdAt?.toDate().toLocaleDateString() || 'N/A',
            Description: description,
            Category: (description.split(' ')[0] || 'Uncategorized'),
            Tags: tags ? tags.join(', ') : '',
            Amount: type === 'income' ? amount : -amount,
        }));

        if (format === 'csv') {
            const Papa = (await import('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm')).default;
            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "expenses.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'xlsx') {
            const { utils, write } = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
            const worksheet = utils.json_to_sheet(data);
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, "Expenses");
            const xlsxBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([xlsxBuffer], { type: 'application/octet-stream' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "expenses.xlsx");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            const { default: jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
            
            const doc = new jsPDF();
            doc.text("PocketPulse Financial Report", 14, 22);
            doc.autoTable({
                startY: 30,
                head: [['Summary', 'Amount']],
                body: [
                    ['Total Income', formatCurrency(settings.totalIncome, settings.currency)],
                    ['Total Spent', formatCurrency(totalExpenses, settings.currency)],
                    ['Balance', formatCurrency(balance, settings.currency)],
                ],
                theme: 'striped'
            });
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 10,
                head: [['Date', 'Description', 'Category', 'Tags', 'Amount']],
                body: data.map(d => [d.Date, d.Description, d.Category, d.Tags, formatCurrency(d.Amount, settings.currency)]),
                theme: 'grid'
            });
            doc.save('report.pdf');
        }
    };

    const handlePremiumFeatureClick = (feature) => {
        setIsMenuOpen(false);
        if (settings.isPremium) {
            if (feature === 'export') {
                setShowExportModal(true);
            }
        } else {
            setShowPremiumModal(true);
        }
    };
    
    const handleSubscribe = () => {
        handleSettingsChange({ ...settings, isPremium: true });
        setShowPremiumModal(false);
        setMessages(prev => [...prev, {id: Date.now(), sender: 'bot', text: "Congratulations! 🚀 You've unlocked all premium features."}]);
    };

    if (isLoading) {
         return (
            <div className="h-screen w-screen flex justify-center items-center bg-gray-100 dark:bg-gray-900">
                <AppLogo className="w-24 h-24 text-blue-500 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200 flex flex-col antialiased">
            {!settings.incomeSet && <IncomeSetupModal onSave={handleSetInitialIncome} />}
            {showPremiumModal && <PremiumModal onSubscribe={handleSubscribe} currency={settings.currency} onClose={() => setShowPremiumModal(false)} />}
            {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} onExport={handleExport} />}
            
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center z-20">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
                <div className="flex items-center gap-2">
                    <AppLogo className="w-8 h-8 text-blue-500" />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">PocketPulse</h1>
                </div>
                <div className="w-8"></div>
            </header>

            <div className={`absolute top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl z-30 transform transition-transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex flex-col h-full">
                    <h2 className="text-2xl font-bold mb-8">Menu</h2>
                    <nav className="flex flex-col space-y-2 flex-grow">
                        <button onClick={() => { setCurrentPage('dashboard'); setIsMenuOpen(false); }} className="text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><BarChart2/> Dashboard</button>
                        <button onClick={() => { setCurrentPage('settings'); setIsMenuOpen(false); }} className="text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><SettingsIcon/> Settings</button>
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                        <h3 className="px-3 text-sm font-semibold text-gray-400 uppercase">Premium</h3>

                         <button onClick={() => handlePremiumFeatureClick('export')} className="text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Download/> Export Data
                            </div>
                           {!settings.isPremium && <Star className="w-5 h-5 text-yellow-400"/>}
                        </button>

                    </nav>
                    <button onClick={handleLogout} className="text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 mt-auto"><LogOut/> Logout</button>
                </div>
            </div>
            {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="absolute inset-0 bg-black/30 z-20"></div>}

            <main className="flex-grow overflow-hidden flex flex-col">
                {currentPage === 'dashboard' ? (
                    <div className="flex-grow flex flex-col h-full overflow-hidden">
                        <div className="p-4 overflow-y-auto flex-grow">
                             <IncomeDashboard totalIncome={settings.totalIncome} expenses={expenses} currency={settings.currency} />
                             {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert"><p>{error}</p></div>}
                             
                             <div className="space-y-4 mt-6">
                                {messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 relative">
                             {tagSuggestions.length > 0 && (
                                <div className="absolute bottom-full left-4 right-4 mb-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-32 overflow-y-auto">
                                    {tagSuggestions.map(tag => (
                                        <button key={tag} onClick={() => handleSuggestionSelect(tag)} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                             )}
                             <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-2">
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => handleUserInputTextChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                                    placeholder="Type your expense or a comment...#Eg -300 food / -500 car / 5000 salary"
                                    className="w-full p-2 bg-transparent focus:outline-none text-lg"
                                />
                                <button onClick={() => handleUserInput()} className="bg-blue-500 text-white rounded-lg p-3 hover:bg-blue-600 transition-colors">
                                    <Send className="h-6 w-6"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <SettingsPage onBack={() => setCurrentPage('dashboard')} settings={settings} onSettingsChange={handleSettingsChange} expenses={expenses} userId={userId} />
                )}
            </main>
        </div>
    );
};

// --- Authentication Page Component ---
const AuthPage = ({ auth }) => {
    const [view, setView] = useState('login'); // 'login', 'signup', 'forgotPassword'
    const [authMethod, setAuthMethod] = useState('email'); // 'email', 'phone'
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isOtpSent, setIsOtpSent] = useState(false);

    useEffect(() => {
        if (auth && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    }, [auth]);

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const handleEmailSignup = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Password reset link sent! Check your email.');
        } catch (error) {
            setError(error.message);
        }
    };

    const handlePhoneSignIn = async (e) => {
        e.preventDefault();
        setError('');
        const appVerifier = window.recaptchaVerifier;
        try {
            const result = await signInWithPhoneNumber(auth, phone, appVerifier);
            setConfirmationResult(result);
            setIsOtpSent(true);
            setMessage('OTP sent to your phone!');
        } catch (error) {
            setError('Failed to send OTP. Make sure to include the country code (e.g., +91).');
            console.error(error);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!confirmationResult) {
            setError('Please send an OTP first.');
            return;
        }
        try {
            await confirmationResult.confirm(otp);
        } catch (error) {
            setError('Invalid OTP. Please try again.');
        }
    };

    const renderForm = () => {
        switch (view) {
            case 'signup':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-6">Create Account</h2>
                        <form onSubmit={handleEmailSignup} className="space-y-4">
                            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                            <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">Sign Up</button>
                        </form>
                        <div className="text-center my-4">or</div>
                        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"><svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>Sign Up with Google</button>
                        <p className="text-center mt-4">Already have an account? <button onClick={() => setView('login')} className="text-blue-500 hover:underline">Log In</button></p>
                    </>
                );
            case 'forgotPassword':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-6">Forgot Password</h2>
                        <p className="text-center text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                            <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">Send Reset Link</button>
                        </form>
                        <p className="text-center mt-4"><button onClick={() => setView('login')} className="text-blue-500 hover:underline">Back to Login</button></p>
                    </>
                );
            default: // login
                return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-6">Welcome Back!</h2>
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                            <button onClick={() => setAuthMethod('email')} className={`flex-1 py-2 font-semibold ${authMethod === 'email' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Email</button>
                            <button onClick={() => setAuthMethod('phone')} className={`flex-1 py-2 font-semibold ${authMethod === 'phone' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Phone</button>
                        </div>

                        {authMethod === 'email' && (
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                                <div className="text-right"><button type="button" onClick={() => setView('forgotPassword')} className="text-sm text-blue-500 hover:underline">Forgot Password?</button></div>
                                <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">Log In</button>
                            </form>
                        )}
                        
                        {authMethod === 'phone' && (
                            <form onSubmit={isOtpSent ? handleOtpSubmit : handlePhoneSignIn} className="space-y-4">
                                {!isOtpSent ? (
                                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" placeholder="Phone Number (e.g. +91...)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                                ) : (
                                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none" required /></div>
                                )}
                                <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">{isOtpSent ? 'Verify OTP' : 'Send OTP'}</button>
                            </form>
                        )}

                        <div className="text-center my-4">or</div>
                        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"><svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>Sign In with Google</button>
                        <p className="text-center mt-4">Don't have an account? <button onClick={() => setView('signup')} className="text-blue-500 hover:underline">Sign Up</button></p>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="flex justify-center mb-8">
                    <AppLogo className="w-20 h-20 text-blue-500" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">{error}</p>}
                    {message && <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-center">{message}</p>}
                    {renderForm()}
                </div>
            </div>
            <div id="recaptcha-container"></div>
        </div>
    );
};


const App = () => {
    const [user, setUser] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                setUser(user);
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase Init Error:", e);
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex justify-center items-center bg-gray-100 dark:bg-gray-900">
                <AppLogo className="w-24 h-24 text-blue-500 animate-pulse" />
            </div>
        );
    }

    return user ? <PocketPulseApp user={user} auth={auth} db={db} /> : <AuthPage auth={auth} />;
};

export default App;
