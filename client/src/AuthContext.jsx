import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { getDatabase } from "firebase/database"; // --- ✨ IMPORTAMOS LA FUNCIÓN DE DATABASE ---
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: "AIzaSyCNBWYuew27j3X86XjbqFiwsCtNqyAbpaQ",
  authDomain: "melatorapp.firebaseapp.com",
  projectId: "melatorapp",
  storageBucket: "melatorapp.firebasestorage.app",
  messagingSenderId: "105699753159",
  appId: "1:105699753159:web:594fb7f025c86a611992e2",
  measurementId: "G-8T1JJH161Z",
  databaseURL: "https://melatorapp-default-rtdb.firebaseio.com" // Asegúrate que la URL es correcta
};

// --- ✨ INICIALIZAMOS TODO AQUÍ ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const database = getDatabase(app); // <-- EXPORTAMOS LA INSTANCIA DE LA BASE DE DATOS

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      await window.electronAPI.createUserDocument({
        uid: userCredential.user.uid,
        email: userCredential.user.email
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      let message = 'Ocurrió un error durante el registro.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Error: Este correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Error: La contraseña debe tener al menos 6 caracteres.';
      }
      return { success: false, message };
    }
  }

  async function login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      let message = 'Error al iniciar sesión. Verifica tus credenciales.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Correo o contraseña incorrectos.';
      }
      return { success: false, message };
    }
  }

  function logout() {
    window.electronAPI.userSignedOut();
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        console.log('AuthContext: Enviando señal userSignedIn con UID:', user.uid);
        window.electronAPI.userSignedIn({ uid: user.uid });
      } else {
        console.log('AuthContext: Enviando señal userSignedOut.');
        window.electronAPI.userSignedOut();
      }
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}