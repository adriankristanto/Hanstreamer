import React, { useContext, useState, useEffect } from "react";
import { auth } from "../firebase";

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState();
    // by default, currentUser is null
    // when the app is launched, firebase will immediately try to get the authentication token stored in localStorage (if there is any)
    // so, by default, loading is true
    // once firebase got the user, loading will be set to false (inside onAuthStateChanged callback)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cleanup = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            // we are done getting the currentUser, so, loading = false
            // make sure to set the currentUser first before stopping the loading
            setLoading(false);
        });

        return cleanup;
    }, []);

    function signup(email, password) {
        return auth.createUserWithEmailAndPassword(email, password);
    }

    function login(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    }

    function logout() {
        return auth.signOut();
    }

    function resetPassword(email) {
        return auth.sendPasswordResetEmail(email);
    }

    const value = {
        currentUser,
        login,
        signup,
        logout,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {/* we will render the children once we are done getting the currentUser */}
            {!loading && children}
        </AuthContext.Provider>
    );
}
