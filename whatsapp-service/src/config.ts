import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import logger from './logger';
import fs from 'fs';
import path from 'path';

let qrCodeData: string | null = null;

export function setQRCode(qrCode: string) {
  qrCodeData = qrCode;
}

export function getQRCode(): string | null {
  return qrCodeData;
}

export function clearQRCode() {
  qrCodeData = null;
  
  // Clean up QR code file if it exists
  const qrFilePath = path.join(process.cwd(), 'whatsapp-qr.png');
  if (fs.existsSync(qrFilePath)) {
    try {
      fs.unlinkSync(qrFilePath);
    } catch (error) {
      logger.error('Failed to delete QR code file:', error);
    }
  }
}

export const initializeWhatsAppClient = async (): Promise<Client> => {
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'whatsapp-service',
            dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            executablePath: process.env.CHROME_BIN || undefined,
            // Increase timeout for slower environments
            timeout: 100000
        }
    });

    return new Promise((resolve, reject) => {
        client.on('qr', async (qr) => {
            try {
                qrCodeData = await qrcode.toString(qr, { type: 'terminal' });
                logger.info('New QR code generated');

                // Also save QR code as image for backup
                try {
                    await qrcode.toFile(
                        path.join(process.cwd(), 'whatsapp-qr.png'),
                        qr,
                        { scale: 8 }
                    );
                } catch (error) {
                    logger.error('Failed to save QR code image:', error);
                }
            } catch (error) {
                logger.error('Failed to generate QR code:', error);
            }
        });

        client.on('ready', () => {
            qrCodeData = null;
            logger.info('WhatsApp client is ready');
            resolve(client);
        });

        client.on('authenticated', () => {
            qrCodeData = null;
            logger.info('WhatsApp client authenticated');
        });

        client.on('auth_failure', (error) => {
            logger.error('WhatsApp authentication failed:', error);
            reject(new Error('Authentication failed'));
        });

        client.on('disconnected', (reason) => {
            qrCodeData = null;
            logger.warn('WhatsApp client disconnected:', reason);
        });

        client.initialize().catch((error) => {
            logger.error('Failed to initialize WhatsApp client:', error);
            reject(error);
        });
    });
}; 