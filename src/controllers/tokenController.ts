import { Request, Response } from 'express';
import { TokenService } from '../services/tokens/TokenService';
import { PaymentService } from '../services/paymentService';
import { SignatureService } from '../services/signatureService';
import { sendCallback } from '../services/callbackService';
import dotenv from 'dotenv';

dotenv.config();

const tokenService = new TokenService();
const paymentService = new PaymentService();
const signatureService = new SignatureService();

export interface TokenRequest {
  paymentReceipt: string;
  amountPaid: number;
  units: number;
  meterNumber: string;
  accountNumber: string;
}

export async function handleTokenGeneration(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  const requestBody = req.body as TokenRequest;

  const sysId = (req as any).sysId || process.env.SYS_ID;

  const {
    paymentReceipt: receiptNo,
    amountPaid: amount,
    units: totalUnits,
    meterNumber,
    accountNumber: accNumber
  } = requestBody;

  let status = 'MF';
  let message = '';
  let token: string | null = null;

  try {
    console.log(`Processing token request for receipt: ${receiptNo}`);

    // Step 1: Check if meter exists
    const meterExists = await paymentService.meterExists(meterNumber);

    if (!meterExists) {
      console.warn(`Meter not found: ${meterNumber}`);

      res.status(404).json({
        status: 'MF',
        message: 'Unknown meter reference',
        paymentReceipt: receiptNo
      });

      return;
    }

    // Step 2: Record payment
    const paymentRecorded = await paymentService.recordPayment({
      transactionType: 'Government Bill',
      transID: receiptNo,
      transTime: new Date(),
      transAmount: amount,
      businessShortCode: null,
      billRefNumber: meterNumber,
      invoiceNumber: null,
      orgAccountBalance: 0,
      thirdPartyTransID: accNumber,
      msisdn: null,
      firstName: null
    });

    let getToken = false;

    if (!paymentRecorded) {
      // Duplicate transaction → check cache
      const cachedToken = await tokenService.getCachedToken(receiptNo);

      if (cachedToken) {
        token = cachedToken;
        status = 'MS';
        message = 'Token retrieved successfully';

        console.log(`Token retrieved from cache for receipt: ${receiptNo}`);
      } else {
        const isUnusedPayment = await paymentService.getUnusedPayment(receiptNo);

        if (isUnusedPayment) {
          getToken = true;
        } else {
          status = 'MF';
          message = 'No token was found for this existing transaction';

          console.warn(`No token found for receipt: ${receiptNo}`);
        }
      }
    } else {
      getToken = true;
    }

    // Step 3: Generate token if required
    if (getToken) {
      console.log(`Generating token for meter: ${meterNumber}`);

      const tokenResult = await tokenService.generateToken({
        meterNumber,
        amount,
        units: totalUnits,
        receiptNo
      });

      if (tokenResult.token) {
        token = tokenResult.token;
        status = 'MS';
        message = 'Token generated successfully';

        // Mark payment as used
        await paymentService.markPaymentUsed(receiptNo);

        console.log(`Token generated successfully for receipt: ${receiptNo}`);
      } else {
        status = 'MF';
        message = 'Error generating token';

        console.error(`Token generation failed for receipt: ${receiptNo}`);
      }
    }

    // Step 4: Prepare response
    const responseData = {
      status,
      message,
      paymentReceipt: receiptNo
    };

    const jsonResponse = JSON.stringify(responseData);
    const signature = signatureService.signMessage(jsonResponse);

    if (!signature) {
      throw new Error('Failed to generate signature');
    }

    // Step 5: Send response
    res.setHeader('req-signature', signature);
    res.setHeader('sys-id', sysId || '');
    res.setHeader('Content-Type', 'application/json');

    res.status(status === 'MS' ? 200 : 400).json(responseData);

    // Step 6: Callback (async)
    if (status === 'MS' && token) {
      const callbackData = {
        status,
        message,
        token,
        paymentReceipt: receiptNo
      };

      sendCallback(callbackData, sysId || '')
        .catch(error => {
          console.error('Callback failed:', error);
        });
    }

  } catch (error) {
    console.error('Unexpected error in token generation:', error);

    if (!res.headersSent) {
      res.status(500).json({
        status: 'MF',
        message: 'Internal server error',
        paymentReceipt: receiptNo
      });
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log(`Token request completed in ${duration}ms for receipt: ${receiptNo}`);
  }
}