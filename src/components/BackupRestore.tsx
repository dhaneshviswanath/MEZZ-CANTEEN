import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Download, Upload, AlertTriangle, ShieldCheck, Database, Loader2, ArrowRight } from "lucide-react";

interface BackupRestoreProps {
  onRestoreSuccess?: () => void;
}

export default function BackupRestore({ onRestoreSuccess }: BackupRestoreProps) {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    setBackingUp(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        throw new Error("Failed to produce backup file on the server.");
      }
      const data = await res.json();
      const stringified = JSON.stringify(data, null, 2);
      
      const blob = new Blob([stringified], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `MEZZ_CANTEEN_Backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess("Backup downloaded successfully. Please store this JSON snapshot securely on your local computer.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during backup creation.");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFile = async (file: File) => {
    if (!file) return;
    
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setError("Only JSON backup records are accepted.");
      return;
    }

    setRestoring(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const resultText = e.target?.result as string;
        let parsedData;
        try {
          parsedData = JSON.parse(resultText);
        } catch (jsonErr) {
          throw new Error("Invalid file content. The backup file must be a valid JSON file.");
        }

        // Quick structural schema warning on client
        const requiredKeys = ["employees", "attendance", "expenses", "budgetEntries", "operationalLog"];
        for (const key of requiredKeys) {
          if (!parsedData[key] || !Array.isArray(parsedData[key])) {
            throw new Error(`The provided file has an invalid format. Missing required collection properties: '${key}'`);
          }
        }

        const confirmRestore = confirm(
          "WARNING: Restoring will overwrite all existing staff records, meal attendances, expense records, and budget allocations with the uploaded data. Are you absolutely sure you want to proceed?"
        );
        if (!confirmRestore) {
          setRestoring(false);
          return;
        }

        // Post to api
        const response = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedData)
        });

        if (!response.ok) {
          const errRes = await response.json();
          throw new Error(errRes.error || "Server failed to process the database restore operation.");
        }

        const resData = await response.json();
        setSuccess(resData.message || "Database successfully overwritten and synchronized.");
        
        // Notify context or reload after delay
        setTimeout(() => {
          if (onRestoreSuccess) {
            onRestoreSuccess();
          } else {
            window.location.reload();
          }
        }, 1200);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to parse or restore database.");
      } finally {
        setRestoring(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read the database backup file.");
      setRestoring(false);
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRestoreFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleRestoreFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Visual Identity Section */}
      <div className="bg-white p-6 rounded-xl border border-[#c5c5d3] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d] flex items-center gap-2">
            <Database className="text-[#00236f]" size={20} />
            Data Archiving & Database Restoration
          </h2>
          <p className="text-xs text-[#505f76] mt-0.5">
            Export secure backup checkpoints to your local computer, or restore system state cleanly with zero-trace ledger synchronization.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#dce1ff] text-[#00164e] border border-[#cbd5e1] text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shrink-0">
          <ShieldCheck size={14} />
          SSL Secure Operations
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold text-red-800">Restoration Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-900">Success Acknowledged</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup Area Card */}
        <div className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Local Export Utility</span>
            <h3 className="text-base font-bold text-[#0d1c2d] flex items-center gap-1.5">
              <Download size={18} className="text-[#00236f]" />
              Safe Backup Download
            </h3>
            <p className="text-xs text-[#505f76] mt-1.5 leading-relaxed">
              Downloads a highly secure, aggregate snapshot of MEZZ CANTEEN records in standard JSON structure. This includes:
            </p>
            <ul className="text-xs text-[#444651] list-disc pl-5 mt-2 space-y-1 font-semibold">
              <li>Comprehensive Active and Inactive Staff Rosters</li>
              <li>Daily & Custom Range Meal Attendance logs</li>
              <li>Individual Invoice Ledger and Expense Bills</li>
              <li>Corporate Capital budget allocation supplements</li>
              <li>Full System Audit logs and timestamp parameters</li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-slate-150">
            <button
              onClick={handleDownloadBackup}
              disabled={backingUp || restoring}
              className="w-full py-2.5 px-4 bg-[#00236f] hover:bg-[#00236f]/90 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
            >
              {backingUp ? (
                <>
                  <Loader2 className="animate-spin text-white" size={14} />
                  Constructing Backup Archive...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download Backup to Computer
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold mt-2">
              Filename structure: MEZZ_CANTEEN_Backup_YYYY-MM-DD.json
            </p>
          </div>
        </div>

        {/* Restore Area Card */}
        <div className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Local Import Utility</span>
            <h3 className="text-base font-bold text-[#0d1c2d] flex items-center gap-1.5">
              <Upload size={18} className="text-[#00236f]" />
              Synchronized System Restore
            </h3>
            <p className="text-xs text-[#505f76] mt-1.5 leading-relaxed">
              Upload a previous JSON backup file to overwrite current database state. To ensure continuity, the backup system automatically validates item definitions during import.
            </p>

            {/* Drag & Drop File Upload Box */}
            <div
              className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                dragActive
                  ? "border-[#00236f] bg-[#eaf2ff]/30"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
                disabled={restoring}
              />
              
              {restoring ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-[#00236f]" size={28} />
                  <span className="text-xs font-bold text-[#00236f]">Extracting Memory Snapshot...</span>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500">
                  <Upload className="mx-auto text-slate-400 stroke-[2]" size={32} />
                  <p className="text-xs font-bold text-[#0d1c2d]">
                    Drag & Drop JSON file here, or <span className="text-[#00236f] underline">browse local drive</span>
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">
                    Acceptable target: .json
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150">
            <div className="flex gap-2 items-start text-[11px] text-[#ba1a1a] font-semibold bg-red-50/50 border border-red-150 rounded-lg p-2.5">
              <AlertTriangle size={14} className="shrink-0 text-red-600 mt-0.5" />
              <span>
                <strong>CRITICAL:</strong> Restoring database will entirely overwrite and purge any live ledger entries made after the backup checkpoint was drawn. Output schema must match standard JSON structure.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Database Metadata Summary card */}
      <div className="bg-slate-50 border border-[#c5c5d3] p-5 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-[#0d1c2d] uppercase tracking-wider flex items-center gap-1.5">
          <Database size={14} className="text-[#00236f]" />
          Integrity & Interoperability Compliance Guidelines
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-[#444651] leading-relaxed font-semibold">
          <div className="space-y-1.5">
            <p className="font-bold text-[#00236f]">1. Structural Validation (Strict Enforcement)</p>
            <p className="text-slate-500">
              The backup/restore engine expects strict data model boundaries. Modifications to file arrays from Excel or spreadsheets might distort types and cause ingestion failures.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-bold text-[#00236f]">2. Multi-Device Operations</p>
            <p className="text-slate-500">
              You can migrate database keys effortlessly across terminals. Drawing backups maintains absolute financial tracking state without needing manual double-ledger alignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
