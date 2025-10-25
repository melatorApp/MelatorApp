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
import { getDatabase } from "firebase/database";
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: "AIzaSyCNBWYuew27j3X86XjbqFiwsCtNqyAbpaQ",
  authDomain: "melatorapp.firebaseapp.com",
  databaseURL: "https://melatorapp-default-rtdb.firebaseio.com",
  projectId: "melatorapp",
  storageBucket: "melatorapp.firebasestorage.app",
  messagingSenderId: "105699753159",
  appId: "1:105699753159:web:594fb7f025c86a611992e2",
  measurementId: "G-8T1JJH161Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const database = getDatabase(app);
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // --- NUEVO: Almacena los datos de Firestore (suscripción)
  const [loading, setLoading] = useState(true); // Carga de autenticación
  const [loadingProfile, setLoadingProfile] = useState(true); // --- NUEVO: Carga del perfil de Firestore

  async function register(email, password, nombre, apellidoPaterno, apellidoMaterno) { 
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      
      // Esto llamará al main.js modificado, que creará el usuario con status: 'trial'
      await window.electronAPI.createUserDocument({ 
        uid: userCredential.user.uid, 
        email: userCredential.user.email,
        nombre: nombre,
        apellidoPaterno: apellidoPaterno,
        apellidoMaterno: apellidoMaterno
      });
  
      return { success: true };
    } catch (error) {
      console.error("Error en el registro:", error);
      let message = 'Ocurrió un error durante el registro.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Error: Este correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Error: La contraseña debe tener al menos 6 caracteres.';
      }
      return { success: false, message: error.message || message };
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
      return { success: false, message: error.message || message };
    }
  }

  function logout() {
    window.electronAPI.userSignedOut();
    return signOut(auth);
  }

  // --- MODIFICADO ---
  // Esta función ahora refresca ambos estados: el de auth y el de firestore
  async function refreshUserProfile() {
    const user = auth.currentUser; 
    if (!user) return; 

    try {
      // 1. Obtener datos de Firestore
      const profileData = await window.electronAPI.obtenerPerfilUsuario(user.uid);
      setUserProfile(profileData); // Actualiza el perfil de firestore
      
      // 2. Obtener datos de Auth (por si cambió la verificación de email)
      await user.reload(); // Refresca el estado de auth (ej. emailVerified)
      const freshUser = auth.currentUser;
      
      // 3. Actualiza el currentUser (solo datos de auth)
      setCurrentUser({
        uid: freshUser.uid,
        email: freshUser.email,
        emailVerified: freshUser.emailVerified
      });
      
    } catch (error) {
      console.error("Error al refrescar el perfil:", error);
      toast.error('No se pudo recargar tu información de perfil.');
    }
  }

  // --- MODIFICADO ---
  // Este hook ahora carga tanto el perfil de Auth como el de Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Inicia carga de Auth
      setLoadingProfile(true); // Inicia carga de Perfil
      
      if (user) {
        window.electronAPI.userSignedIn({ uid: user.uid });

        try {
          // 1. Cargar el perfil de Firestore
          const profileData = await window.electronAPI.obtenerPerfilUsuario(user.uid);
          setUserProfile(profileData); // Guarda el perfil completo (con datos de suscripción)
          
          // 2. Guardar solo los datos de autenticación
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          });

        } catch (error) {
          console.error("Error al obtener perfil de Firestore:", error);
          // Si falla, el usuario está logueado pero sin perfil (se bloqueará en App.jsx)
          setCurrentUser(user);
          setUserProfile(null);
        }

      } else {
        window.electronAPI.userSignedOut();
        setCurrentUser(null);
        setUserProfile(null); // Limpia el perfil al salir
      }
      setLoading(false); // Termina carga de Auth
      setLoadingProfile(false); // Termina carga de Perfil
    });
    return unsubscribe; 
  }, []);

  const value = {
    currentUser,
    userProfile, // --- NUEVO: Exponemos el perfil de Firestore
    loading,
    loadingProfile, // --- NUEVO: Exponemos el estado de carga del perfil
    register,
    login,
    logout,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {/* --- MODIFICADO: No mostrar la app hasta que AMBOS se hayan cargado --- */}
      {!(loading || loadingProfile) && children}
    </AuthContext.Provider>
  );
}