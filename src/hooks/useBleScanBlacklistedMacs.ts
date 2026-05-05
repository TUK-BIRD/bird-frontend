import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export type BleScanBlacklistedMacUser = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
};

export type BleScanBlacklistedMac = {
  id: string | number;
  deviceMac: string;
  note?: string | null;
  createdByUser?: BleScanBlacklistedMacUser | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateBleScanBlacklistedMacResponse = BleScanBlacklistedMac & {
  deletedScanEventCount?: number;
  deletedLocationEstimateCount?: number;
};

export const bleScanBlacklistedMacsQueryKey = ["bleScanBlacklistedMacs"];

export default function useBleScanBlacklistedMacs() {
  return useQuery<BleScanBlacklistedMac[]>({
    queryKey: bleScanBlacklistedMacsQueryKey,
    queryFn: () =>
      apiClient.get("/ble_scan_blacklisted_macs").then((res) => res.data),
    retry: false,
  });
}
