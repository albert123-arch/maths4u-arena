"use client";
import { createContext, useContext } from "react";
import type { ViewLens } from "@/lib/request-view";
export const ViewContext = createContext<ViewLens | null>(null);
export const useView = () => useContext(ViewContext);
// Only a request-freshness token, not authoritative role/target state.
let nonce = "";
export const setViewNonce = (value: string) => { nonce = value; };
export const viewNonce = () => nonce;
