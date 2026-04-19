import { createSlice } from "@reduxjs/toolkit";

// Initialize state from localStorage if token exists
const initializeAuthState = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  if (token) {
    return {
      isLoggedIn: true,
      token: token,
      role: role ? role.toUpperCase() : null,
      userId: userId || null,
    };
  }
  return {
    isLoggedIn: false,
    token: null,
    role: null,
    userId: null,
  };
};

const authSlice = createSlice({
  name: "auth",
  initialState: initializeAuthState(),
  reducers: {
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.userId = action.payload.userId;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("role", action.payload.role);
      localStorage.setItem("userId", action.payload.userId);
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.token = null;
      state.role = null;
      state.userId = null;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;