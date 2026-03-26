// src/services/paymentService.ts
import { pool } from '../config/database';

export interface PaymentRecord {
  transactionType: string;
  transID: string;
  transTime: Date;
  transAmount: number;
  businessShortCode: string | null;
  billRefNumber: string;
  invoiceNumber: string | null;
  orgAccountBalance: number;
  thirdPartyTransID: string;
  msisdn: string | null;
  firstName: string | null;
}

export class PaymentService {
  /**
   * Record payment in database
   */
  async recordPayment(record: PaymentRecord): Promise<boolean> {
    try {
      await pool.request()
        .input('TransactionType', record.transactionType)
        .input('TransID', record.transID)
        .input('TransTime', record.transTime)
        .input('TransAmount', record.transAmount)
        .input('BusinessShortCode', record.businessShortCode)
        .input('BillRefNumber', record.billRefNumber)
        .input('InvoiceNumber', record.invoiceNumber)
        .input('OrgAccountBalance', record.orgAccountBalance)
        .input('ThirdPartyTransID', record.thirdPartyTransID)
        .input('MSISDN', record.msisdn)
        .input('FirstName', record.firstName)
        .query(`
          INSERT INTO Tmpesa_payments (
            TransactionType, TransID, TransTime, TransAmount, 
            BusinessShortCode, BillRefNumber, InvoiceNumber, 
            OrgAccountBalance, ThirdPartyTransID, MSISDN, FirstName, used
          ) VALUES (
            @TransactionType, @TransID, @TransTime, @TransAmount,
            @BusinessShortCode, @BillRefNumber, @InvoiceNumber,
            @OrgAccountBalance, @ThirdPartyTransID, @MSISDN, @FirstName, 0
          )
        `);
      
      return true;
    } catch (error: any) {
      // Check for duplicate key error (SQL Server error code 2627)
      if (error.number === 2627) {
        console.log('Duplicate transaction ID detected');
        return false;
      }
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Check if payment exists and is unused
   */
  async getUnusedPayment(transID: string): Promise<boolean> {
    try {
      const result = await pool.request()
        .input('TransID', transID)
        .input('used', 0)
        .query(`
          SELECT TransAmount FROM Tmpesa_payments 
          WHERE TransID = @TransID AND used = @used
        `);
      
      return result.recordset.length > 0;
    } catch (error) {
      console.error('Error checking payment:', error);
      return false;
    }
  }

  /**
   * Mark payment as used
   */
  async markPaymentUsed(transID: string): Promise<void> {
    try {
      await pool.request()
        .input('TransID', transID)
        .input('used', 1)
        .query(`
          UPDATE Tmpesa_payments SET used = @used WHERE TransID = @TransID
        `);
    } catch (error) {
      console.error('Error marking payment as used:', error);
    }
  }

  /**
   * Check if meter exists in database
   */
  async meterExists(meterNumber: string): Promise<boolean> {
    try {
      const result = await pool.request()
        .input('meterNumber', meterNumber)
        .query(`
          SELECT COUNT(*) as count 
          FROM dbo.Tobjectregistration 
          WHERE serialnumber = @meterNumber OR loggernumber = @meterNumber
        `);
      
      return result.recordset[0].count > 0;
    } catch (error) {
      console.error('Error checking meter:', error);
      return false;
    }
  }
}