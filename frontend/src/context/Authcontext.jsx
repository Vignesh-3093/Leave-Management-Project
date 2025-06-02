import React, { createContext, useState, useEffect } from "react";

const AuthContext = createContext({
  user: null, // Can be null or your AuthUser object
  token: null, // Can be null or a string
  isAuthenticated: false, // Boolean based on token presence
  loading: true, // Boolean for initial loading state
  // Provide default functions with basic logging as a fallback
  // eslint-disable-next-line no-unused-vars
  login: (newToken, newUser) => {
    console.warn("Login function not provided by AuthProvider");
  },
  logout: () => {
    console.warn("Logout function not provided by AuthProvider");
  },
});

export const AuthProvider = ({ children }) => {
  // State to hold the current authenticated user object and JWT token
  const [user, setUser] = useState(null); // Holds the user object (or null)
  const [token, setToken] = useState(null); // Holds the JWT token string (or null) 

  const [loading, setLoading] = useState(true); // True while checking localStorage 

  useEffect(() => {
    // console.log(
    //   "AuthProvider useEffect: Checking localStorage for existing session..."
    // );
    const storedToken = localStorage.getItem("token"); // Retrieve token
    const storedUser = localStorage.getItem("user"); // Retrieve user string

    if (storedToken && storedUser) {
      try {
        // Attempt to parse the stored user string back into a JavaScript object
        const parsedUser = JSON.parse(storedUser); // If parsing is successful, set the state
        setToken(storedToken);
        setUser(parsedUser);
        // console.log(
        //   "AuthProvider useEffect: Found existing token and user in localStorage. State set."
        // );
      } catch (error) {
        // If there's an error parsing the stored user data (e.g., it's corrupted)
        console.error(
          "AuthProvider useEffect: Error parsing stored user data from localStorage:",
          error
        ); // Clear the invalid data from localStorage to prevent future errors
        localStorage.removeItem("token");
        localStorage.removeItem("user"); // Ensure state is null to reflect no authenticated user
        setToken(null);
        setUser(null);
        console.log(
          "AuthProvider useEffect: Cleared invalid data from localStorage."
        );
      }
    } else {
      // If no token or user was found in localStorage
      // console.log(
      //   "AuthProvider useEffect: No existing token or user found in localStorage."
      // );
    } // Regardless of whether data was found, the initial loading is now complete
    setLoading(false);
    // console.log(
    //   "AuthProvider useEffect: Initial loading complete. Loading state set to false."
    // );
  }, []); // The empty dependency array ensures this effect runs only once after the initial render // Function to handle user login. Called by components (e.g., Login page) after successful authentication API call. // This function updates the state and localStorage, but does NOT handle navigation.

  const login = (newToken, newUser) => {
    console.log(
      "AuthContext login function called with new token and user data."
    ); // Update state with the new token and user object
    setToken(newToken);
    setUser(newUser); // Store the new token and user data in localStorage for persistence across sessions

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser)); // Store user object as a JSON string

    console.log(
      "AuthContext login: User state and localStorage updated. Navigation to dashboard should happen in the calling component."
    ); // REMOVED: navigate('/dashboard'); // <-- Ensure this line is removed
  }; // Function to handle user logout. Called by components (e.g., Dashboard, Logout button). // This function clears the state and localStorage, but does NOT handle navigation.

  const logout = () => {
    console.log("AuthContext logout function called."); // Clear token and user from component state
    setToken(null);
    setUser(null); // Remove token and user from localStorage

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // console.log(
    //   "AuthContext logout: User state and localStorage cleared. Navigation to login page should happen in the calling component."
    // ); // REMOVED: navigate('/login'); // <-- Ensure this line is removed
  }; // The value object that will be provided to any component consuming this context

  const contextValue = {
    user, // Current authenticated user object (or null)
    token, // Current JWT token (or null)
    isAuthenticated: !!token, // Derived state: true if token exists, false otherwise
    loading, // Current loading status: true during initial check, false after
    login, // The login function provided to consumers
    logout, // The logout function provided to consumers
  }; // Log the context value when the provider re-renders (for debugging)

  console.log("AuthProvider rendering. Current context value:", contextValue); // Provide the context value to all children components wrapped by this provider // The children are rendered regardless of loading state or authentication status // ProtectedRoute component will handle showing a loading screen or redirecting based on the context value

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

// --- Optional: Custom Hook to Consume the Auth Context ---
// If define your useAuth hook in a separate file (e.g., hooks/useAuth.js),
// ensure it correctly uses useContext(AuthContext).
// If want to define it here, uncomment the code below.
/*
import { useContext } from 'react'; // Need useContext here
export const useAuth = () => {
    const context = useContext(AuthContext);
    // Throw an error if the hook is used outside of the provider
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
*/
