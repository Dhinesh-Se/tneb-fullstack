import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../api";

export const fetchConsumption = createAsyncThunk(
  "consumption/fetchConsumption",
  async () => {
    const res = await api.get("/api/consumption");
    return res.data;
  }
);

const consumptionSlice = createSlice({
  name: "consumption",
  initialState: {
    list: [],
    searchedData: null
  },
  reducers: {
    setSearchResult: (state, action) => {
      state.searchedData = action.payload;
    },
    clearSearch: (state) => {
      state.searchedData = null;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConsumption.fulfilled, (state, action) => {
      state.list = action.payload;
    });
  }
});

export const { setSearchResult, clearSearch } = consumptionSlice.actions;
export default consumptionSlice.reducer;