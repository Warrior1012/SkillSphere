import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle', // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
    },
    setStatus(state, action) {
      state.status = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.status = 'unauthenticated';
    },
  },
});

export const { setUser, setStatus, clearAuth } = authSlice.actions;
export default authSlice.reducer;
