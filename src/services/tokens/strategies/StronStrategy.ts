import { TokenStrategy } from '../TokenStrategy';

export class StronStrategy implements TokenStrategy {
  async generate(data: {
    meterNumber: string;
    units?: number;
    receiptNo: string;
  }) {
    try {
      // TODO: Implement real Stron logic or API
      console.log('Stron token generation not implemented yet');

      return {
        token: null,
        unitsPurchased: data.units || 0
      };
    } catch (error) {
      console.error('Stron error:', error);
      return { token: null, unitsPurchased: 0 };
    }
  }
}