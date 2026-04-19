import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import consumerReducer from "./slices/consumerSlice";
import consumptionReducer from "./slices/consumptionSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    consumers: consumerReducer,
    consumption: consumptionReducer
  }
});



// configureStore means crate configure the redux store easily