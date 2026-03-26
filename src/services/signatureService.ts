import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class SignatureService {
  private publicKey: forge.pki.PublicKey | null = null;
  private privateKey: forge.pki.PrivateKey | null = null;

  constructor() {
    this.loadCertificates();
  }

  private loadCertificates(): void {
    try {
      // =========================
      // LOAD PUBLIC CERTIFICATE
      // =========================
      const publicCertPath = path.join(
        process.cwd(),
        process.env.PUBLIC_CERT_PATH || 'certs/prepaidPub.pfx'
      );
      const publicCertPassword =
        process.env.PUBLIC_CERT_PASSWORD || 'mowmajiis';

      if (fs.existsSync(publicCertPath)) {
        const publicPfxData = fs.readFileSync(publicCertPath);
        const publicPfxDer = publicPfxData.toString('binary');
        const publicPfxAsn1 = forge.asn1.fromDer(publicPfxDer);
        const publicP12 = forge.pkcs12.pkcs12FromAsn1(
          publicPfxAsn1,
          false,
          publicCertPassword
        );

        const certBags = publicP12.getBags({
          bagType: forge.pki.oids.certBag,
        });
        const certList = certBags[forge.pki.oids.certBag];

        if (certList && certList.length > 0) {
          const cert = certList[0].cert;
          if (cert) {
            this.publicKey = cert.publicKey; // ✅ FIX HERE
            console.log('✅ Public key loaded successfully');
          }
        }
      } else {
        console.warn(
          '⚠️ Public certificate file not found:',
          publicCertPath
        );
      }

      // =========================
      // LOAD PRIVATE CERTIFICATE
      // =========================
      const privateCertPath = path.join(
        process.cwd(),
        process.env.PRIVATE_CERT_PATH || 'certs/private_key.pfx'
      );
      const privateCertPassword =
        process.env.PRIVATE_CERT_PASSWORD || 'xMonot$pa$$';

      if (fs.existsSync(privateCertPath)) {
        const privatePfxData = fs.readFileSync(privateCertPath);
        const privatePfxDer = privatePfxData.toString('binary');
        const privatePfxAsn1 = forge.asn1.fromDer(privatePfxDer);
        const privateP12 = forge.pkcs12.pkcs12FromAsn1(
          privatePfxAsn1,
          false,
          privateCertPassword
        );

        const keyBags = privateP12.getBags({
          bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
        });
        const privateKeyList =
          keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

        if (privateKeyList && privateKeyList.length > 0) {
          this.privateKey =
            privateKeyList[0].key as forge.pki.PrivateKey;
          console.log('✅ Private key loaded successfully');
        }
      } else {
        console.warn(
          '⚠️ Private certificate file not found:',
          privateCertPath
        );
      }
    } catch (error) {
      console.error('❌ Failed to load certificates:', error);
      throw error;
    }
  }

  verifySignature(signature: string, body: string): boolean {
    try {
      if (!this.publicKey) {
        console.error('Public key not loaded');
        return false;
      }

      const decodedSignature = forge.util.decode64(signature);

      const md = forge.md.sha1.create();
      md.update(body, 'utf8');
      const digest = md.digest();
      
const verified = (this.publicKey as forge.pki.rsa.PublicKey).verify(
  digest.getBytes(),
  decodedSignature
);

      return verified;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  signMessage(message: string): string | null {
  try {
    if (!this.privateKey) {
      console.error('Private key not loaded');
      return null;
    }

    const rsaPrivateKey = this.privateKey as forge.pki.rsa.PrivateKey;

    const md = forge.md.sha1.create();
    md.update(message, 'utf8');

    const signature = rsaPrivateKey.sign(md); // ✅ correct usage

    return forge.util.encode64(signature);
  } catch (error) {
    console.error('Message signing error:', error);
    return null;
  }
}
}