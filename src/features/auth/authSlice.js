import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { decodeToken, isTokenExpired } from '../../utils/jwtHelper';

const getTokenFromLoginResponse = (response) => {
    const data = response?.data ?? response;
    if (typeof data === 'string') return data;
    return data?.token || data?.accessToken || data?.jwt || data?.authToken || null;
};

const storedToken = localStorage.getItem('authToken');
const initialToken = storedToken && !isTokenExpired(storedToken) ? storedToken : null;
const initialUser = initialToken ? decodeToken(initialToken) : null;

if (storedToken && !initialToken) {
    localStorage.removeItem('authToken');
}

// Async thunks
export const login = createAsyncThunk(
    'auth/login',
    async ({ username, password }, { rejectWithValue }) => {
        try {
            const response = await authService.login(username, password);
            if (response.success) {
                const token = getTokenFromLoginResponse(response);
                if (!token || isTokenExpired(token)) {
                    return rejectWithValue('Login failed. Invalid token received.');
                }
                localStorage.setItem('authToken', token);
                return { token, user: decodeToken(token) };
            }
            return rejectWithValue(response.message || 'Login failed');
        } catch (error) {
            return rejectWithValue(error.message || 'Login failed');
        }
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (registerModel, { rejectWithValue }) => {
        try {
            const response = await authService.register(registerModel);
            if (response.success) {
                return response;
            }
            return rejectWithValue(response.message || 'Registration failed');
        } catch (error) {
            return rejectWithValue(error.message || 'Registration failed');
        }
    }
);

export const sendOtp = createAsyncThunk(
    'auth/sendOtp',
    async (email, { rejectWithValue }) => {
        try {
            const response = await authService.sendOtp(email);
            if (response.success) {
                return response.data;
            }
            return rejectWithValue(response.message || 'Failed to send OTP');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to send OTP');
        }
    }
);

export const verifyOtp = createAsyncThunk(
    'auth/verifyOtp',
    async ({ email, otp, newPassword }, { rejectWithValue }) => {
        try {
            const response = await authService.verifyOtp(email, otp, newPassword);
            if (response.success) {
                return response.data;
            }
            return rejectWithValue(response.message || 'OTP verification failed');
        } catch (error) {
            return rejectWithValue(error.message || 'OTP verification failed');
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
            localStorage.removeItem('authToken');
            localStorage.setItem('IsOnState', 'false');
            localStorage.removeItem('selectedAdminId');
            return null;
        } catch (error) {
            return rejectWithValue(error.message || 'Logout failed');
        }
    }
);

export const sendHeartbeat = createAsyncThunk(
    'auth/sendHeartbeat',
    async (_, { rejectWithValue }) => {
        try {
            await authService.heartbeat();
            return null;
        } catch (error) {
            return rejectWithValue(error.message || 'Heartbeat failed');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: initialUser,
        currentUser: initialUser,
        token: initialToken,
        isAuthenticated: !!initialToken,
        loading: false,
        error: null,
        otpSent: false,
        registrationSuccess: false
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearRegistrationSuccess: (state) => {
            state.registrationSuccess = false;
        },
        
        setToken: (state, action) => {
            state.token = action.payload;
            state.user = action.payload ? decodeToken(action.payload) : null;
            state.currentUser = state.user;
            state.isAuthenticated = !!action.payload && !isTokenExpired(action.payload);
            if (state.isAuthenticated) {
                localStorage.setItem('authToken', action.payload);
            } else {
                localStorage.removeItem('authToken');
            }
        },

        setAuthUser: (state, action) => {
            state.user = action.payload;
            state.currentUser = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.currentUser = action.payload.user;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            })
            // Register
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state) => {
                state.loading = false;
                state.registrationSuccess = true;
                state.error = null;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Send OTP
            .addCase(sendOtp.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendOtp.fulfilled, (state) => {
                state.loading = false;
                state.otpSent = true;
                state.error = null;
            })
            .addCase(sendOtp.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Verify OTP
            .addCase(verifyOtp.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state) => {
                state.loading = false;
                state.otpSent = false;
                state.error = null;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.currentUser = null;
                state.token = null;
                state.isAuthenticated = false;
                state.error = null;
            });
    }
});

export const { clearError, clearRegistrationSuccess, setToken, setAuthUser } = authSlice.actions;
export default authSlice.reducer;
