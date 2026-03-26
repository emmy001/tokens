export interface TokenStrategy {
  generate(data: {
    meterNumber: string;
    amount?: number;
    units?: number;
    receiptNo: string;
  }): Promise<{
    token: string | null;
    unitsPurchased: number;
  }>;
}