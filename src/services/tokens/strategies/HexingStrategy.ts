import axios from 'axios';
import dotenv from 'dotenv';
import { TokenStrategy } from '../TokenStrategy';

dotenv.config();

export class HexingStrategy implements TokenStrategy {
  async generate(data: {
    meterNumber: string;
    amount?: number;
    receiptNo: string;
  }) {
    try {
      const apiUrl = process.env.HEXING_TOKEN_API;

      if (!apiUrl) {
        throw new Error('Hexing API not configured');
      }

      const response = await axios.post(
        apiUrl,
        {
          meterSerial: data.meterNumber,
          amount: data.amount
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data?.token) {
        return {
          token: response.data.token,
          unitsPurchased: data.amount || 0
        };
      }

      return { token: null, unitsPurchased: 0 };
    } catch (error) {
      console.error('Hexing error:', error);
      return { token: null, unitsPurchased: 0 };
    }
  }
}