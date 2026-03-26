import { Request, Response, NextFunction } from 'express';
import { SignatureService } from '../services/signatureService';

const signatureService = new SignatureService();

export const validateSignature = (req: Request, res: Response, next: NextFunction): void => {
  const reqSignature = req.headers['req-signature'] as string;
  const sysId = req.headers['sys-id'] as string;

  // Check for required headers
  if (!reqSignature) {
    res.status(400).json({
      status: 'MF',
      message: 'No req-signature header found'
    });
    return;
  }

  // Get raw body (already parsed by express.json)
  const rawBody = JSON.stringify(req.body);
  
  // Verify signature
  if (!signatureService.verifySignature(reqSignature, rawBody)) {
    res.status(401).json({
      status: 'MF',
      message: 'Signature could not be verified'
    });
    return;
  }

  // Store sys-id for later use
  if (sysId) {
    (req as any).sysId = sysId;
  }

  next();
};