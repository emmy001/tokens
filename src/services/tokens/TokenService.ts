import { pool } from '../../config/database';
import { HexingStrategy } from './strategies/HexingStrategy';
import { StronStrategy } from './strategies/StronStrategy';

export class TokenService {
  private hexing = new HexingStrategy();
  private stron = new StronStrategy();

  async generateToken(data: {
    meterNumber: string;
    amount?: number;
    units?: number;
    receiptNo: string;
  }) {
    try {
      const manufacturer = await this.getMeterManufacturer(data.meterNumber);

      switch (manufacturer) {
        case 'Hexing':
          return this.hexing.generate(data);

        case 'Stron':
          return this.stron.generate(data);

        default:
          console.error(`Unknown manufacturer: ${manufacturer}`);
          return { token: null, unitsPurchased: 0 };
      }
    } catch (error) {
      console.error('TokenService error:', error);
      return { token: null, unitsPurchased: 0 };
    }
  }

  private async getMeterManufacturer(meterNumber: string): Promise<string | null> {
    try {
      const result = await pool.request()
        .input('meterNumber', meterNumber)
        .query(`
          SELECT dbo.Tmanufacturer.manufacturer AS MANUF
          FROM dbo.Tobjectregistration 
          INNER JOIN dbo.Tmanufacturer 
            ON dbo.Tobjectregistration.manufacturer = dbo.Tmanufacturer.Id 
          WHERE dbo.Tobjectregistration.serialnumber = @meterNumber 
             OR dbo.Tobjectregistration.loggernumber = @meterNumber
        `);

      return result.recordset[0]?.MANUF || null;
    } catch (error) {
      console.error('DB error:', error);
      return null;
    }
  }

  async cacheToken(receiptNo: string, token: string) {
    try {
      await pool.request()
        .input('receiptNo', receiptNo)
        .input('token', token)
        .query(`
          INSERT INTO Tstron_token (reference, token, created_at)
          VALUES (@receiptNo, @token, GETDATE())
        `);
    } catch (error) {
      console.log('Cache error (ignored):', error);
    }
  }

  async getCachedToken(receiptNo: string): Promise<string | null> {
    try {
      const result = await pool.request()
        .input('receiptNo', receiptNo)
        .query(`SELECT token FROM Tstron_token WHERE reference = @receiptNo`);

      return result.recordset[0]?.token || null;
    } catch (error) {
      console.error('Error fetching cached token:', error);
      return null;
    }
  }
}