import React, { useState } from 'react';
import { Loader2, LogIn, AlertCircle, Upload, UserPlus, User } from 'lucide-react';
import { 
  auth, 
  storage,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  ref,
  uploadBytes,
  getDownloadURL
} from '../services/firebase';

const AppLogo = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
     <path d="M21 12v-1c0-3.87-3.13-7-7-7-2.6 0-4.91 1.28-6.19 3.25C7.2 7.09 6.62 7 6 7c-2.76 0-5 2.24-5 5s2.24 5 5 5c.44 0 .86-.06 1.27-.16A6.98 6.98 0 0 0 14 20h2v-2h2v-2h-2v-1.1c2.39-.96 4.09-3.26 4.85-5.9H21z"/>
  </svg>
);

export const Auth: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // --- LOGIN LOGIC ---
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state listener in App.tsx will handle redirect
      } else {
        // --- SIGNUP LOGIC ---
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters (Weak password)");
        }

        // 1. Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let photoURL = "";

        // 2. Upload Profile Photo if exists
        if (photoFile) {
            const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
            const snapshot = await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(snapshot.ref);
        }

        // 3. Update Profile
        await updateProfile(user, {
            displayName: fullName,
            photoURL: photoURL || null
        });

        // Auth state listener will pick up the change
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('User already exists. Please Sign In.');
        // Optional: switch to login mode automatically for better UX
        // setIsLoginMode(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Password or Email Incorrect');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100">
          <div className="flex justify-center mb-4">
             <div className="bg-white p-3 rounded-xl shadow-sm">
                <AppLogo className="w-10 h-10 text-[#8B2635]" />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-900">Karara Family Club</h1>
          <p className="text-slate-500 mt-2">
            {isLoginMode ? 'Welcome back! Please sign in.' : 'Join the club management portal.'}
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLoginMode && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 hover:bg-slate-50 transition cursor-pointer group">
                             <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center gap-1">
                                {photoFile ? (
                                    <span className="text-sm font-medium text-blue-600 truncate max-w-[200px]">{photoFile.name}</span>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs text-slate-500">Click to upload photo</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {!isLoginMode && (
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="••••••••"
                />
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLoginMode ? (
                <><LogIn className="w-5 h-5" /> Sign In</>
              ) : (
                <><UserPlus className="w-5 h-5" /> Sign Up</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-sm text-slate-600">
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button 
                    type="button"
                    onClick={() => {
                        setIsLoginMode(!isLoginMode);
                        setError('');
                        setPhotoFile(null);
                        setFullName('');
                        setConfirmPassword('');
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                    {isLoginMode ? "Sign Up" : "Sign In"}
                </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};