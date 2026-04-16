'use client';

import { useState, useEffect } from 'react';
import { auth, ensureAuth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar } from '@/components/Calendar';
import { Login } from '@/components/Login';

export default function Home() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await ensureAuth();
      } else {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedUsername = localStorage.getItem('shift_username');
    if (storedUsername) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername(storedUsername);
    }
  }, []);

  const handleLogin = async (enteredUsername: string) => {
    const upperUsername = enteredUsername.toUpperCase();
    
    try {
      const userDocRef = doc(db, 'users', upperUsername);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const confirmUse = window.confirm(`L'username ${upperUsername} esiste già. Vuoi usare questo account?`);
        if (!confirmUse) {
          return false; // Login aborted
        }
      } else {
        await setDoc(userDocRef, {
          username: upperUsername,
          createdAt: serverTimestamp()
        });
      }
      
      localStorage.setItem('shift_username', upperUsername);
      setUsername(upperUsername);
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      alert("Errore durante il login. Riprova.");
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shift_username');
    setUsername(null);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] text-[#5a5a40] font-semibold uppercase tracking-wider text-sm">Caricamento...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#2d2d2a] font-sans">
      {!username ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Calendar username={username} onLogout={handleLogout} />
      )}
    </main>
  );
}
