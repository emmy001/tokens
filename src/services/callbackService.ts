import axios from 'axios';
import { SignatureService } from './signatureService';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const signatureService = new SignatureService();

export async function sendCallback(data: any, sysId: string): Promise<void> {
  const callbackUrl = process.env.CALLBACK_API;
  const logDir = process.env.LOG_DIR || 'logs';
  
  if (!callbackUrl) {
    console.warn('Callback URL not configured');
    return;
  }

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  try {
    const jsonData = JSON.stringify(data);
    const signature = signatureService.signMessage(jsonData);
    
    if (!signature) {
      throw new Error('Failed to sign callback data');
    }

    console.log(`Sending callback to: ${callbackUrl}`);
    
    const response = await axios.post(callbackUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'req-signature': signature,
        'sys-id': sysId
      },
      timeout: 30000
    });

    // Log callback response
    const logEntry = `${new Date().toISOString()}: Request: ${jsonData}\nResponse: ${JSON.stringify(response.data)}\n\n`;
    fs.appendFileSync(path.join(logDir, 'callback.log'), logEntry);
    
    console.log(`Callback sent successfully: ${response.status}`);
  } catch (error) {
    console.error('Callback failed:', error);
    
    // Log error
    const errorEntry = `${new Date().toISOString()}: Error: ${error}\nData: ${JSON.stringify(data)}\n\n`;
    fs.appendFileSync(path.join(logDir, 'callback_errors.log'), errorEntry);
  }
}