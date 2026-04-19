import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";  // redux patterns for an api call 
import { api } from "../../api";

export const fetchConsumers = createAsyncThunk(
  "consumers/fetchConsumers",
  async () => {
    const res = await api.get("/api/consumer");
    return res.data;
  }
);

const consumerSlice = createSlice({
  name: "consumers",
  initialState: {  // starting state when app loads
    list: []        // list will store API response
  },
  reducers: {},
  extraReducers: (builder) => {    // action reduced from outside the slice
    builder.addCase(fetchConsumers.fulfilled, (state, action) => {  // api calls successfully
      state.list = action.payload;
    });
  }
});

export default consumerSlice.reducer;

//createAsyncThunk => is a function used to handle asynchronous action