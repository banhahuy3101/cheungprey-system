import { useContext } from "react";
import { SponsorshipContext } from "../context/SponsorshipContext";

export function useSponsorships() {
  const context = useContext(SponsorshipContext);
  if (!context) {
    throw new Error("useSponsorships must be used within a SponsorshipProvider");
  }
  return context;
}
