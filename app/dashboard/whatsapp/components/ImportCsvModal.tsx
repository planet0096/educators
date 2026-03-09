"use client";

import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, ArrowRight, Loader2, CheckCircle, Save, Database, AlertCircle, FileText, List, Tags } from "lucide-react";
import Papa from "papaparse";
import toast from "react-hot-toast";

interface CustomField {
    _id: string;
    key: string;
    label: string;
    type: string;
}

interface ImportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customFields: CustomField[];
    availableLists: { _id: string; name: string }[];
    availableTags: { _id: string; name: string; color: string }[];
}

const STANDARD_FIELDS = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "company", label: "Company" },
    { key: "website", label: "Website" },
    { key: "notes", label: "Notes" },
];

export default function ImportCsvModal({ isOpen, onClose, onSuccess, customFields, availableLists, availableTags }: ImportCsvModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [updateExisting, setUpdateExisting] = useState(true);
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFile(null);
            setCsvHeaders([]);
            setCsvData([]);
            setMappings({});
            setUpdateExisting(true);
            setSelectedLists([]);
            setSelectedTags([]);
            setIsImporting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            toast.error("Please upload a valid CSV file");
            return;
        }

        setFile(selectedFile);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.meta.fields) {
                    setCsvHeaders(results.meta.fields);
                    setCsvData(results.data);
                    autoMapFields(results.meta.fields);
                    setStep(2);
                } else {
                    toast.error("Could not parse headers from CSV");
                }
            },
            error: (error) => {
                toast.error(`Error parsing CSV: ${error.message}`);
            }
        });
    };

    const autoMapFields = (headers: string[]) => {
        const newMappings: Record<string, string> = {};
        const allTargetFields = [
            ...STANDARD_FIELDS,
            ...customFields.map(cf => ({ key: `custom_${cf.key}`, label: cf.label }))
        ];

        headers.forEach(header => {
            const hLow = header.toLowerCase().trim();
            const match = allTargetFields.find(f =>
                f.label.toLowerCase() === hLow ||
                f.key.toLowerCase() === hLow ||
                (f.key === 'phone' && (hLow.includes('phone') || hLow.includes('number') || hLow.includes('mobile')))
            );

            if (match) {
                newMappings[header] = match.key;
            }
        });

        setMappings(newMappings);
    };

    const handleImport = async () => {
        // Validation: Phone is strictly required for CRM mapping to work properly
        const phoneMapped = Object.values(mappings).includes('phone');
        if (!phoneMapped) {
            toast.error("You must map a CSV column to the 'Phone' field.");
            return;
        }

        setIsImporting(true);

        const mappedContacts = csvData.map(row => {
            const contact: any = { customFieldValues: {} };

            Object.entries(mappings).forEach(([csvHeader, portalFieldKey]) => {
                if (!portalFieldKey) return; // Ignore unmapped

                const rawVal = row[csvHeader];
                if (rawVal === undefined || rawVal === null || rawVal.trim() === "") return;

                if (portalFieldKey.startsWith("custom_")) {
                    const cleanKey = portalFieldKey.replace("custom_", "");
                    contact.customFieldValues[cleanKey] = rawVal.trim();
                } else {
                    contact[portalFieldKey] = rawVal.trim();
                }
            });

            return contact;
        });

        // Filter out contacts with no phone
        const validContacts = mappedContacts.filter(c => c.phone);

        if (validContacts.length === 0) {
            toast.error("No valid contacts found containing a phone number.");
            setIsImporting(false);
            return;
        }

        try {
            const res = await fetch("/api/whatsapp/contacts/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contacts: validContacts,
                    updateExisting,
                    targetLists: selectedLists,
                    targetTags: selectedTags
                })
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Successfully processed ${data.result.upsertedCount + data.result.modifiedCount + data.result.insertedCount} contacts!`);
                onSuccess();
                onClose();
            } else {
                toast.error(data.error || "Failed to import contacts");
            }
        } catch (error) {
            console.error("Import error", error);
            toast.error("A network error occurred during import.");
        } finally {
            setIsImporting(false);
        }
    };

    const downloadTemplate = () => {
        const headers = [...STANDARD_FIELDS.map(f => f.label), ...customFields.map(f => f.label)];
        const csvContent = headers.join(",") + "\n" + // Headers
            "Gurpreet Singh,919876543210,hello@example.com,New York,Acme Inc,https://acme.com,VIP client"; // 1 row sample

        // Just filling in commas for the custom fields to keep columns aligned for the sample row
        const padding = new Array(customFields.length).fill("").join(",");
        const finalContent = csvContent + (padding.length > 0 ? "," + padding : "");

        const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "contacts_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-white">
                        <Database className="w-5 h-5" />
                        <div>
                            <h2 className="text-lg font-bold">Import Contacts</h2>
                            <p className="text-emerald-100 text-xs">Upload CSV and map columns</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-emerald-200 bg-white rounded-2xl p-8 hover:border-emerald-500 transition-colors relative group">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900">Upload CSV File</h3>
                                    <p className="text-sm text-zinc-500 mt-1">Drag and drop or click to select a file.</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-zinc-100 w-full">
                                    <button onClick={downloadTemplate} type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 z-20 relative">
                                        Download Example Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
                                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                                    Map CSV Columns to Portal Fields
                                </h3>

                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        We auto-detected matching fields. Please review them below. <strong>Phone number is strictly required</strong> to uniquely identify and map contacts safely.
                                    </p>
                                </div>

                                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-zinc-100 border-b border-zinc-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-zinc-700 text-xs uppercase tracking-wider w-1/2">CSV Column (from your file)</th>
                                                <th className="px-4 py-3 font-semibold text-zinc-700 text-xs uppercase tracking-wider w-1/2">Portal Field (where it goes)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 bg-white">
                                            {csvHeaders.map(header => (
                                                <tr key={header} className="hover:bg-zinc-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-zinc-900">{header}</div>
                                                        <div className="text-xs text-zinc-400 mt-0.5 italic truncate max-w-xs transition-opacity opacity-70">
                                                            Ex: {csvData[0]?.[header] || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={mappings[header] || ""}
                                                            onChange={(e) => setMappings({ ...mappings, [header]: e.target.value })}
                                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                        >
                                                            <option value="">-- Do not import --</option>
                                                            <optgroup label="Standard Fields">
                                                                {STANDARD_FIELDS.map(f => (
                                                                    <option key={f.key} value={f.key}>{f.label}</option>
                                                                ))}
                                                            </optgroup>
                                                            {customFields.length > 0 && (
                                                                <optgroup label="Custom Fields">
                                                                    {customFields.map(cf => (
                                                                        <option key={cf.key} value={`custom_${cf.key}`}>{cf.label}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 mb-1">Update Existing Contacts?</div>
                                    <div className="text-xs text-zinc-500">If a phone number in the CSV already exists in your portal CRM, should we update their missing fields?</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-2">
                                        <List className="w-4 h-4 text-emerald-500" />
                                        Add to Lists (Optional)
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableLists.map(list => (
                                            <button
                                                key={list._id}
                                                onClick={() => setSelectedLists(prev => prev.includes(list._id) ? prev.filter(x => x !== list._id) : [...prev, list._id])}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedLists.includes(list._id) ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
                                            >
                                                {list.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-2">
                                        <Tags className="w-4 h-4 text-emerald-500" />
                                        Add Tags (Optional)
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.map(tag => {
                                            const active = selectedTags.includes(tag._id);
                                            let colorObj = { name: "Gray", value: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
                                            try { colorObj = JSON.parse(tag.color); } catch { }
                                            return (
                                                <button
                                                    key={tag._id}
                                                    onClick={() => setSelectedTags(prev => prev.includes(tag._id) ? prev.filter(x => x !== tag._id) : [...prev, tag._id])}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                                                    style={{
                                                        backgroundColor: active ? colorObj.value : "white",
                                                        borderColor: active ? colorObj.border : "#E5E7EB",
                                                        color: colorObj.text,
                                                    }}
                                                >
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white px-6 py-4 border-t border-zinc-200 flex justify-between items-center shrink-0">
                    <div className="text-xs text-zinc-500">
                        {step === 2 && <span>{csvData.length} records found in CSV.</span>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={step === 1 ? onClose : () => setStep(1)}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                        >
                            {step === 1 ? "Cancel" : "Back"}
                        </button>
                        {step === 2 && (
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isImporting ? "Processing..." : "Run Import"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
