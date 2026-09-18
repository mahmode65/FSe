import React from 'react';
import { X, CheckCircle2, KeyRound, Database, ShieldAlert, ExternalLink, Copy } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-semibold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Firebase Console Configuration Guide</h2>
              <p className="text-xs text-stone-500">Step-by-step checklist for your Firebase project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700">
          {/* Project Details Banner */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Target Firebase Project</div>
            <div className="flex items-center justify-between font-mono text-xs text-stone-900">
              <span>Project ID: <strong>{firebaseConfig.projectId}</strong></span>
              <button
                onClick={() => copyToClipboard(firebaseConfig.projectId, 'pid')}
                className="text-stone-500 hover:text-stone-900 text-[11px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied === 'pid' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-stone-900">
              <span className="truncate pr-2">Database ID: <strong>{firebaseConfig.firestoreDatabaseId}</strong></span>
              <button
                onClick={() => copyToClipboard(firebaseConfig.firestoreDatabaseId, 'dbid')}
                className="text-stone-500 hover:text-stone-900 text-[11px] flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3 h-3" />
                {copied === 'dbid' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/overview`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline pt-1"
            >
              <span>Open Firebase Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Step 1: Authentication */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="font-semibold text-stone-900">Enable Authentication Providers</h3>
            </div>
            <div className="pl-8 text-xs text-stone-600 space-y-2">
              <p>In the Firebase Console, navigate to <strong>Build &gt; Authentication &gt; Sign-in method</strong>:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Google</strong>: Click <em>Add new provider</em> &gt; <em>Google</em> &gt; Enable. Set support email to your Google email. This allows administrators to log in.
                </li>
                <li>
                  <strong>Anonymous</strong>: Click <em>Add new provider</em> &gt; <em>Anonymous</em> &gt; Enable. This is used by the student portal session to secure student tokens.
                </li>
                <li>
                  <em>Optional:</em> <strong>Email/Password</strong> can also be enabled if you wish to allow password login.
                </li>
              </ul>
            </div>
          </div>

          {/* Step 2: Firestore Database */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="font-semibold text-stone-900">Cloud Firestore Database & Collections</h3>
            </div>
            <div className="pl-8 text-xs text-stone-600 space-y-2">
              <p>Your Firestore database has been provisioned. The portal automatically interacts with:</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-stone-100 rounded border border-stone-200">/students</div>
                <div className="p-2 bg-stone-100 rounded border border-stone-200">/schools</div>
                <div className="p-2 bg-stone-100 rounded border border-stone-200">/preferences</div>
                <div className="p-2 bg-stone-100 rounded border border-stone-200">/admins</div>
                <div className="p-2 bg-stone-100 rounded border border-stone-200">/system_settings</div>
              </div>
              <p className="text-stone-500">
                You do not need to create these manually; the system will seed them during admin initialization or CSV import.
              </p>
            </div>
          </div>

          {/* Step 3: Security Rules */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h3 className="font-semibold text-stone-900">Firestore Security Rules</h3>
            </div>
            <div className="pl-8 text-xs text-stone-600 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Production security rules have already been deployed to your project automatically!</span>
              </div>
              <p>
                In the console under <strong>Cloud Firestore &gt; Rules</strong>, you can review the rules which enforce:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Students cannot list or scrape peers in the <code>students</code> collection.</li>
                <li>Students can only read and update their own assigned record and their single <code>preferences</code> doc.</li>
                <li>School capacity updates are strictly checked to prevent exceeding capacity.</li>
                <li>Administrator privileges are locked to verified admin accounts (including <code>mahmode65@gmail.com</code>).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            I Understand, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
